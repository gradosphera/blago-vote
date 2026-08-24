import { Address, beginCell, SendMode, storeStateInit, toNano } from "@ton/core";
import { addressToString } from "./utils/utils";
import { sendToIndex } from "./utils/MyNetworkProvider";
import { Multisig } from "./multisig/Multisig";
import { MultisigInfo } from "./multisig/MultisigChecker";
import {
  AMOUNT_TO_SEND,
  DEFAULT_AMOUNT,
  MULTISIG_CODE,
} from "./constants";
import {
  getOrderTypes,
  OrderContext,
  ValidatedValue,
} from "./orderTypes";

export interface TonConnectMessage {
  address: string;
  amount: string;
  payload: string;
}

export interface PreparedNewOrder {
  multisigAddress: string;
  orderId: bigint;
  message: TonConnectMessage;
}

export const checkExistingOrderId = async (
  orderId: bigint,
  multisigInfo: MultisigInfo,
  isTestnet: boolean,
): Promise<ValidatedValue> => {
  try {
    const orderAddress = await multisigInfo.multisigContract.getOrderAddress(
      multisigInfo.provider,
      orderId,
    );
    const result = await sendToIndex(
      "account",
      { address: orderAddress.toRawString() },
      isTestnet,
    );
    if (result.status === "uninit") {
      return { value: true, error: undefined };
    } else {
      return { value: undefined, error: `Заявка ${orderId} уже существует` };
    }
  } catch (e) {
    console.error(e);
    return { value: undefined, error: "Возможна ошибка соединения" };
  }
};

/**
 * Собирает транзакцию создания заявки в мультикошельке (порт обработчика
 * #newOrder_createButton из gradoshpera-multisig/src/index.ts).
 * Возвращает TonConnect-сообщение, которое отправляет useMultisigSendTransaction.
 */
export const prepareNewOrder = async (params: {
  multisigInfo: MultisigInfo;
  isTestnet: boolean;
  orderId: bigint;
  orderTypeIndex: number;
  values: { [key: string]: any };
  myAddress: Address | null;
}): Promise<PreparedNewOrder> => {
  const { multisigInfo, isTestnet, orderId, orderTypeIndex, values, myAddress } =
    params;

  const ctx: OrderContext = { isTestnet, multisigInfo };
  const orderType = getOrderTypes(ctx)[orderTypeIndex];
  if (!orderType) throw new Error("Неизвестный тип заявки");

  const orderIdChecked = await checkExistingOrderId(orderId, multisigInfo, isTestnet);
  if (orderIdChecked.error) throw new Error(orderIdChecked.error);

  if (orderType.check) {
    const checked = await orderType.check(values, ctx);
    if (checked.error) throw new Error(checked.error);
  }

  const messageParams = await orderType.makeMessage(values, ctx);

  const myProposerIndex = multisigInfo.proposers.findIndex((a) =>
    a.address.equals(myAddress!),
  );
  const mySignerIndex = multisigInfo.signers.findIndex((a) =>
    a.address.equals(myAddress!),
  );
  if (myProposerIndex === -1 && mySignerIndex === -1) {
    throw new Error("Ошибка: вы не инициатор и не подписант");
  }

  const isSigner = mySignerIndex > -1;
  const toAddress = messageParams.toAddress;
  const tonAmount = messageParams.tonAmount;
  const payloadCell = messageParams.body;
  const expireAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 1 месяц

  const actions = Multisig.packOrder([
    {
      type: "transfer",
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      message: {
        info: {
          type: "internal",
          ihrDisabled: false,
          bounce: true,
          bounced: false,
          dest: toAddress.address,
          value: { coins: tonAmount },
          ihrFee: 0n,
          forwardFee: 0n,
          createdLt: 0n,
          createdAt: 0,
        },
        body: payloadCell,
      },
    },
  ]);

  const message = Multisig.newOrderMessage(
    actions,
    expireAt,
    isSigner,
    isSigner ? mySignerIndex : myProposerIndex,
    orderId,
    0n,
  );
  const messageBase64 = message.toBoc().toString("base64");

  return {
    multisigAddress: multisigInfo.address.address.toRawString(),
    orderId,
    message: {
      address: addressToString(multisigInfo.address),
      amount: AMOUNT_TO_SEND.toString(),
      payload: messageBase64,
    },
  };
};

/**
 * Собирает транзакцию создания нового мультикошелька (порт #newMultisig_createButton).
 */
export const prepareCreateMultisig = (params: {
  threshold: number;
  signers: Address[];
  proposers: Address[];
  isTestnet: boolean;
}): { multisigAddress: Address; message: TonConnectMessage & { stateInit: string } } => {
  const { threshold, signers, proposers, isTestnet } = params;
  const newMultisig = Multisig.createFromConfig(
    {
      threshold,
      signers,
      proposers,
      allowArbitrarySeqno: true,
    },
    MULTISIG_CODE,
  );
  const newMultisigAddress = newMultisig.address;
  const amount = toNano("1").toString(); // 1 TON

  const stateInitCell = beginCell();
  storeStateInit({
    code: newMultisig.init!.code,
    data: newMultisig.init!.data,
  })(stateInitCell);

  return {
    multisigAddress: newMultisigAddress,
    message: {
      address: newMultisigAddress.toString({
        urlSafe: true,
        bounceable: true,
        testOnly: isTestnet,
      }),
      amount,
      payload: "",
      stateInit: stateInitCell.endCell().toBoc().toString("base64"),
    },
  };
};

/**
 * Собирает транзакцию подтверждения заявки (порт #order_approveButton).
 */
export const prepareApprove = (orderInfo: {
  address: { address: Address };
  orderId: bigint;
}): TonConnectMessage => {
  const orderAddressString = orderInfo.address.address.toString({
    bounceable: true,
    testOnly: false,
  });
  const payload = beginCell()
    .storeUint(0, 32)
    .storeStringTail("approve")
    .endCell()
    .toBoc()
    .toString("base64");
  return {
    address: orderAddressString,
    amount: DEFAULT_AMOUNT.toString(),
    payload,
  };
};
