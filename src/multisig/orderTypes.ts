import {
  Address,
  beginCell,
  Cell,
  SendMode,
  toNano,
} from "@ton/core";
import { AddressInfo } from "./utils/utils";
import { toUnits } from "./utils/units";
import {
  checkJettonMinter,
} from "./jetton/JettonMinterChecker";
import {
  JettonMinter,
  LOCK_TYPES,
  lockTypeToInt,
} from "./jetton/JettonMinter";
import { JettonWallet } from "./jetton/JettonWallet";
import { MyNetworkProvider } from "./utils/MyNetworkProvider";
import {
  SINGLE_NOMINATOR_POOL_OP_CHANGE_VALIDATOR_ADDRESS,
  SINGLE_NOMINATOR_POOL_OP_WITHDRAW,
  VESTING_INTERNAL_TRANSFER,
} from "./multisig/Constants";
import {
  AMOUNT_TO_SEND,
  DEFAULT_AMOUNT,
  DEFAULT_INTERNAL_AMOUNT,
} from "./constants";
import { MultisigInfo } from "./multisig/MultisigChecker";

export type FieldType =
  | "String"
  | "TON"
  | "Jetton"
  | "Address"
  | "URL"
  | "Status"
  | "BOC";

export interface OrderField {
  name: string;
  type: FieldType;
}

export interface ValidatedValue {
  value?: any;
  error?: string;
}

export interface MakeMessageResult {
  toAddress: AddressInfo;
  tonAmount: bigint;
  body: Cell;
}

export interface OrderContext {
  isTestnet: boolean;
  multisigInfo: MultisigInfo;
}

export interface OrderType {
  name: string;
  fields: { [key: string]: OrderField };
  check?: (values: { [key: string]: any }, ctx: OrderContext) => Promise<ValidatedValue>;
  makeMessage: (
    values: { [key: string]: any },
    ctx: OrderContext,
  ) => Promise<MakeMessageResult>;
}

const makeError = (error: string): ValidatedValue => ({ value: undefined, error });
const makeValue = (value: any): ValidatedValue => ({ value, error: undefined });

export const validateOrderField = (
  fieldName: string,
  value: string,
  fieldType: FieldType,
  isTestnet: boolean,
): ValidatedValue => {
  if (fieldType === "BOC") {
    try {
      return makeValue(Cell.fromBase64(value));
    } catch (error) {
      return makeError("Некорректный BOC");
    }
  }

  if (
    fieldType !== "String" &&
    (value === null || value === undefined || value === "")
  ) {
    return makeError(`Пусто`);
  }

  switch (fieldType) {
    case "String":
      return makeValue(value);

    case "TON":
      try {
        const units = toUnits(value, 9);
        if (units <= 0n) return makeError("Введите положительную сумму");
        return makeValue(units);
      } catch (e) {
        return makeError("Некорректная сумма");
      }

    case "Jetton":
      try {
        return makeValue(toUnits(value, 0));
      } catch (e) {
        return makeError("Некорректное количество");
      }

    case "Address": {
      if (!Address.isFriendly(value)) return makeError("Некорректный адрес");
      const address = Address.parseFriendly(value);
      if (address.isTestOnly && !isTestnet) {
        return makeError("Пожалуйста, введите адрес основной сети");
      }
      // Возвращаем AddressInfo, как ожидают makeMessage/storeAddress.
      return makeValue({
        address,
        isBounceable: address.isBounceable,
        isTestOnly: address.isTestOnly,
      } as unknown as AddressInfo);
    }

    case "URL":
      if (!value.startsWith("https://")) return makeError("Некорректный URL");
      return makeValue(value);

    case "Status":
      if (LOCK_TYPES.indexOf(value) > -1) return makeValue(value);
      return makeError(
        "Некорректный статус. Используйте: " + LOCK_TYPES.join(", "),
      );

    default:
      return makeError("Некорректное поле");
  }
};

const checkJettonMinterAdmin = async (
  values: { [key: string]: any },
  ctx: OrderContext,
): Promise<ValidatedValue> => {
  try {
    const multisigInfo = ctx.multisigInfo;
    const jettonMinterInfo = await checkJettonMinter(
      values.jettonMinterAddress,
      ctx.isTestnet,
      false,
    );
    if (!multisigInfo.address.address.equals(jettonMinterInfo.adminAddress)) {
      return {
        error: "Мультикошелек не является администратором этого жетона",
      };
    }
    return { value: jettonMinterInfo };
  } catch (e: any) {
    console.error(e);
    return { error: "Ошибка проверки жетона" };
  }
};

const checkJettonMinterNextAdmin = async (
  values: { [key: string]: any },
  ctx: OrderContext,
): Promise<ValidatedValue> => {
  try {
    const multisigInfo = ctx.multisigInfo;
    const jettonMinterInfo = await checkJettonMinter(
      values.jettonMinterAddress,
      ctx.isTestnet,
      true,
    );
    if (
      !jettonMinterInfo.nextAdminAddress ||
      !multisigInfo.address.address.equals(jettonMinterInfo.nextAdminAddress)
    ) {
      return {
        error: "Мультикошелек не является следующим администратором этого жетона",
      };
    }
    return { value: jettonMinterInfo };
  } catch (e: any) {
    console.error(e);
    return { error: "Ошибка проверки жетона" };
  }
};

export const getOrderTypes = (ctx: OrderContext): OrderType[] => [
  {
    name: "Перевод GRAM",
    fields: {
      amount: { name: "Сумма в GRAM", type: "TON" },
      toAddress: { name: "Адрес получателя", type: "Address" },
      comment: { name: "Комментарий (необязательно)", type: "String" },
    },
    makeMessage: async (values) => {
      const body = !values.comment
        ? beginCell().endCell()
        : beginCell().storeUint(0, 32).storeStringTail(values.comment).endCell();
      return {
        toAddress: values.toAddress,
        tonAmount: values.amount,
        body,
      };
    },
  },

  {
    name: "Перевод жетонов",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      amount: { name: "Количество жетонов (в единицах)", type: "Jetton" },
      toAddress: { name: "Адрес получателя", type: "Address" },
      comment: { name: "Комментарий (необязательно)", type: "String" },
    },
    makeMessage: async (values): Promise<MakeMessageResult> => {
      const jettonMinterAddress: Address = values.jettonMinterAddress.address;
      const multisigAddress = ctx.multisigInfo.address.address;
      const jettonMinter = JettonMinter.createFromAddress(jettonMinterAddress);
      const provider = new MyNetworkProvider(jettonMinterAddress, ctx.isTestnet);
      const jettonWalletAddress = await jettonMinter.getWalletAddress(
        provider,
        multisigAddress,
      );
      const forwardPayload = !values.comment
        ? null
        : beginCell().storeUint(0, 32).storeStringTail(values.comment).endCell();
      return {
        toAddress: {
          address: jettonWalletAddress,
          isBounceable: true,
          isTestOnly: ctx.isTestnet,
        },
        tonAmount: DEFAULT_AMOUNT,
        body: JettonWallet.transferMessage(
          values.amount,
          values.toAddress.address,
          multisigAddress,
          null,
          0n,
          forwardPayload,
        ),
      };
    },
  },

  {
    name: "Минт жетонов",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      amount: { name: "Количество жетонов (в единицах)", type: "Jetton" },
      toAddress: { name: "Адрес получателя", type: "Address" },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.mintMessage(
          values.toAddress.address,
          values.amount,
          values.jettonMinterAddress.address,
          ctx.multisigInfo.address.address,
          null,
          0n,
          DEFAULT_INTERNAL_AMOUNT,
        ),
      };
    },
  },

  {
    name: "Сменить администратора жетона",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      newAdminAddress: { name: "Адрес нового администратора", type: "Address" },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.changeAdminMessage(values.newAdminAddress.address),
      };
    },
  },

  {
    name: "Принять управление жетоном",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
    },
    check: checkJettonMinterNextAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.claimAdminMessage(),
      };
    },
  },

  {
    name: "Пополнить жетон",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      amount: { name: "Сумма в GRAM", type: "TON" },
    },
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: values.amount,
        body: JettonMinter.topUpMessage(),
      };
    },
  },

  {
    name: "Изменить URL метаданных жетона",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      newMetadataUrl: { name: "Новый URL метаданных", type: "URL" },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.changeContentMessage({ uri: values.newMetadataUrl }),
      };
    },
  },

  {
    name: "Принудительное сжигание жетонов",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      amount: { name: "Количество жетонов (в единицах)", type: "Jetton" },
      fromAddress: { name: "Адрес пользователя", type: "Address" },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.forceBurnMessage(
          values.amount,
          values.fromAddress.address,
          ctx.multisigInfo.address.address,
          DEFAULT_INTERNAL_AMOUNT,
        ),
      };
    },
  },

  {
    name: "Принудительный перевод жетонов",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      amount: { name: "Количество жетонов (в единицах)", type: "Jetton" },
      fromAddress: { name: "Адрес отправителя", type: "Address" },
      toAddress: { name: "Адрес получателя", type: "Address" },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.forceTransferMessage(
          values.amount,
          values.toAddress.address,
          values.fromAddress.address,
          values.jettonMinterAddress.address,
          null,
          0n,
          null,
          DEFAULT_INTERNAL_AMOUNT,
        ),
      };
    },
  },

  {
    name: "Установить статус для кошелька жетонов пользователя",
    fields: {
      jettonMinterAddress: { name: "Адрес жетона", type: "Address" },
      userAddress: { name: "Адрес пользователя", type: "Address" },
      newStatus: {
        name: `Новый статус (${LOCK_TYPES.join(", ")})`,
        type: "Status",
      },
    },
    check: checkJettonMinterAdmin,
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.jettonMinterAddress,
        tonAmount: DEFAULT_AMOUNT,
        body: JettonMinter.lockWalletMessage(
          values.userAddress.address,
          lockTypeToInt(values.newStatus),
          DEFAULT_INTERNAL_AMOUNT,
        ),
      };
    },
  },

  {
    name: "Единый пул номинатора: Вывод",
    fields: {
      amount: { name: "Сумма GRAM за газ", type: "TON" },
      toAddress: { name: "Адрес пула", type: "Address" },
      withdrawAmount: { name: "Сумма вывода GRAM", type: "TON" },
    },
    makeMessage: async (values) => {
      const body = beginCell()
        .storeUint(SINGLE_NOMINATOR_POOL_OP_WITHDRAW, 32)
        .storeUint(0, 64)
        .storeCoins(values.withdrawAmount)
        .endCell();
      return {
        toAddress: values.toAddress,
        tonAmount: values.amount,
        body,
      };
    },
  },

  {
    name: "Единый пул номинатора: Сменить адрес валидатора",
    fields: {
      amount: { name: "Сумма GRAM на газ", type: "TON" },
      toAddress: { name: "Адрес пула", type: "Address" },
      validatorAddress: { name: "Адрес нового валидатора", type: "Address" },
    },
    makeMessage: async (values) => {
      const body = beginCell()
        .storeUint(SINGLE_NOMINATOR_POOL_OP_CHANGE_VALIDATOR_ADDRESS, 32)
        .storeUint(0, 64)
        .storeAddress(values.validatorAddress.address)
        .endCell();
      return {
        toAddress: values.toAddress,
        tonAmount: values.amount,
        body,
      };
    },
  },

  {
    name: "Вестинг: Отправить из вестинга (0.1 GRAM за газ)",
    fields: {
      vestingAddress: { name: "Адрес вестинга", type: "Address" },
      destinationAddress: { name: "Адрес получателя", type: "Address" },
      amount: { name: "Сумма в GRAM", type: "TON" },
      comment: { name: "Комментарий (необязательно)", type: "String" },
    },
    makeMessage: async (values) => {
      const destinationAddress: Address = values.destinationAddress.address;
      const body = beginCell()
        .storeUint(VESTING_INTERNAL_TRANSFER, 32)
        .storeUint(0, 64)
        .storeUint(3, 8)
        .storeRef(
          beginCell()
            .store({
              type: "internal",
              ihrDisabled: true,
              bounce: true,
              bounced: false,
              dest: destinationAddress,
              value: { coins: values.amount },
              ihrFee: 0n,
              forwardFee: 0n,
              createdLt: 0n,
              createdAt: 0,
            } as any)
            .endCell(),
        )
        .endCell();
      return {
        toAddress: values.vestingAddress,
        tonAmount: toNano("0.1"),
        body,
      };
    },
  },

  {
    name: "Произвольная заявка",
    fields: {
      order: { name: "BOC заявки (cell в Base64)", type: "BOC" },
      amount: { name: "Сумма в GRAM", type: "TON" },
      toAddress: { name: "Адрес получателя", type: "Address" },
    },
    makeMessage: async (values): Promise<MakeMessageResult> => {
      return {
        toAddress: values.toAddress,
        tonAmount: values.amount,
        body: values.order,
      };
    },
  },
];

export { AMOUNT_TO_SEND };
