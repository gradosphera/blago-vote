import {
  AddressInfo,
  addressAvatarHTML,
  addressToString,
  assert,
  equalsAddressLists,
  formatAddressAndUrl,
  getAddressFormat,
  sanitizeHTML,
} from "../utils/utils";
import {
  Address,
  Cell,
  Dictionary,
  fromNano,
  loadMessageRelaxed,
  CommonMessageInfoRelaxedInternal,
} from "@ton/core";
import { cellToArray, endParse } from "./Multisig";
import { Order, parseOrderData } from "./Order";
import { marked } from "marked";
import { MultisigInfo } from "./MultisigChecker";
import {
  MyNetworkProvider,
  parseCellFromStateString,
  sendToIndex,
} from "../utils/MyNetworkProvider";
import { fetchDnsNames, getDnsName } from "../utils/Dns";
import {
  intToLockType,
  JettonMinter,
  lockTypeToDescription,
} from "../jetton/JettonMinter";
import {
  SINGLE_NOMINATOR_POOL_OP_CHANGE_VALIDATOR_ADDRESS,
  SINGLE_NOMINATOR_POOL_OP_WITHDRAW,
  VESTING_INTERNAL_TRANSFER,
} from "./Constants";

export interface OrderActionInfo {
  type: "gram" | "jetton" | "nft" | "proposal" | "update_multisig";
  actionName: string;
  // For NFT Transfer
  nftContract?: Address;
  newOwner?: Address;
  // For GRAM transfers
  gramAmount?: string;
  // For Jetton transfers
  jettonAmount?: string;
  jettonAddress?: Address;
  jettonKind?: "mint" | "transfer" | "burn";
  toAddress?: Address;
  // Custom jetton actions
  customType?: "topUp" | "changeAdmin" | "claimAdmin" | "changeContent" | "forceTransfer" | "forceBurn" | "lockWallet";
  // For changeAdmin
  newAdmin?: Address;
  // For changeContent
  newMetadataUrl?: string;
  // For lockWallet
  userAddress?: Address;
  lockType?: string;
  // For nominator pool
  nominatorOp?: "withdraw" | "changeValidator";
  withdrawAmount?: string;
  validatorAddress?: Address;
  // Common
  comment?: string;
  // For proposals
  title?: string;
  description?: string;
  choices?: string[];
  strategies?: string;
  snapshotTime?: string;
  startTime?: string;
  endTime?: string;
  quorum?: number;
  hide?: boolean;
  deployer?: Address;
  // For update_multisig
  newThreshold?: number;
  newSigners?: Address[];
  newProposers?: Address[];
  // Operation code and send mode
  opCode?: number;
  sendMode?: number;
  sendModeString?: string;
  // Jetton minter address (for mint actions)
  jettonMinter?: Address;
}

export interface MultisigOrderInfo {
  address: AddressInfo;
  tonBalance: bigint;
  orderId: bigint;
  isExecuted: boolean;
  approvalsNum: number;
  approvalsMask: number;
  threshold: number;
  signers: AddressInfo[];
  expiresAt: Date;
  actions: OrderActionInfo[];
  summary?: {
    gram: string;
    jetton?: {
      amount: string;
      kind: "mint" | "transfer" | "burn";
    };
  };
  stateInitMatches: boolean;
  isMismatchSigners: boolean;
  isMismatchThreshold: boolean;
}

const checkNumber = (n: number) => {
  if (n === null) throw new Error("Некорректное число");
  if (n === undefined) throw new Error("Некорректное число");
  if (isNaN(n)) throw new Error("Некорректное число");
  if (n < 0) throw new Error("Некорректное число");
};

export const checkMultisigOrder = async (
  multisigOrderAddress: AddressInfo,
  multisigOrderCode: Cell,
  multisigInfo: MultisigInfo,
  isTestnet: boolean,
  needAdditionalGetMethodChecks: boolean,
): Promise<MultisigOrderInfo> => {
  // Account State and Data

  const result = await sendToIndex(
    "account",
    { address: addressToString(multisigOrderAddress) },
    isTestnet,
  );
  assert(
    result.status === "active",
    "Контракт не активен. Если вы только что создали заявку, она должна появиться в течение ~30 секунд.",
  );

  assert(
    parseCellFromStateString(result.code, "code").equals(multisigOrderCode),
    "Код контракта НЕ совпадает с кодом заявки мультикошелька из этого репозитория",
  );

  const tonBalance = result.balance;

  const data = parseCellFromStateString(result.data, "data");
  const parsedData = parseOrderData(data);

  checkNumber(parsedData.threshold);
  assert(parsedData.threshold > 0, "Threshold not positive");
  assert(
    parsedData.threshold <= parsedData.signers.length,
    "Invalid threshold",
  );
  checkNumber(parsedData.approvalsMask);
  checkNumber(parsedData.approvalsNum);
  assert(
    parsedData.approvalsNum <= parsedData.signers.length,
    "Invalid approvalsNum ",
  );
  checkNumber(parsedData.expirationDate);

  const signersFormatted = [];
  for (const signer of parsedData.signers) {
    signersFormatted.push(await getAddressFormat(signer, isTestnet));
  }

  // Check in multisig

  assert(
    parsedData.multisigAddress.equals(multisigInfo.address.address),
    "Адрес мультикошелька не совпадает",
  );

  const multisigOrderToCheck = Order.createFromConfig(
    {
      multisig: multisigInfo.address.address,
      orderSeqno: parsedData.orderSeqno,
    },
    multisigOrderCode,
  );

  assert(
    multisigOrderToCheck.address.equals(multisigOrderAddress.address),
    "Поддельный заявка мультикошелька",
  );

  let isMismatchSigners = false;
  let isMismatchThreshold = false;

  if (!parsedData.isExecuted) {
    isMismatchThreshold = multisigInfo.threshold > parsedData.threshold;
    isMismatchSigners = !equalsAddressLists(
      multisigInfo.signers.map((a) => a.address),
      parsedData.signers,
    );
  }

  if (needAdditionalGetMethodChecks) {
    // Get-methods

    const provider = new MyNetworkProvider(
      multisigOrderAddress.address,
      isTestnet,
    );
    const multisigOrderContract: Order = Order.createFromAddress(
      multisigOrderAddress.address,
    );
    const getData = await multisigOrderContract.getOrderDataStrict(provider);

    assert(
      getData.multisig.equals(parsedData.multisigAddress),
      "Invalid multisigAddress",
    );
    assert(getData.order_seqno === parsedData.orderSeqno, "Invalid orderSeqno");
    assert(getData.threshold === parsedData.threshold, "Invalid threshold");
    assert(getData.executed === parsedData.isExecuted, "Invalid isExecuted");
    assert(
      equalsAddressLists(getData.signers, parsedData.signers),
      "Invalid signers",
    );
    assert(
      getData._approvals === BigInt(parsedData.approvalsMask),
      "Invalid approvalsMask",
    );
    assert(
      getData.approvals_num === parsedData.approvalsNum,
      "Invalid approvalsNum",
    );
    assert(
      getData.expiration_date === BigInt(parsedData.expirationDate),
      "Invalid expirationDate",
    );
    assert(
      getData.order.hash().equals(parsedData.order.hash()),
      "Invalid order",
    );
  }

  // StateInit

  const multisigOrderAddress3 = Order.createFromConfig(
    {
      multisig: parsedData.multisigAddress,
      orderSeqno: parsedData.orderSeqno,
    },
    multisigOrderCode,
  );

  const stateInitMatches = multisigOrderAddress3.address.equals(
    multisigOrderAddress.address,
  );

  // Actions

  const actions = Dictionary.loadDirect(
    Dictionary.Keys.Uint(8),
    Dictionary.Values.Cell(),
    parsedData.order,
  );

  const parseActionBody = async (
    cell: Cell,
  ): Promise<{
    comment?: string;
    jetton?: { amount: string; kind: "mint" | "transfer" | "burn" };
    jettonMinter?: Address;
    nftContract?: Address;
    newOwner?: Address;
    customType?: "topUp" | "changeAdmin" | "claimAdmin" | "changeContent" | "forceTransfer" | "forceBurn" | "lockWallet";
    newAdmin?: Address;
    newMetadataUrl?: string;
    userAddress?: Address;
    lockType?: string;
    nominatorOp?: "withdraw" | "changeValidator";
    withdrawAmount?: string;
    validatorAddress?: Address;
    toAddress?: Address;
    title?: string;
    description?: string;
    choices?: string[];
    strategies?: string;
    snapshotTime?: string;
    startTime?: string;
    endTime?: string;
    quorum?: number;
    hide?: boolean;
    deployer?: Address;
  }> => {
    try {
      const slice = cell.beginParse();
      if (slice.remainingBits === 0 && slice.remainingRefs == 0) {
        return { comment: "" };
      }
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const op = slice.loadUint(32);
      if (op == 0) {
        const text = slice.loadStringTail();
        return {
          comment: sanitizeHTML(text),
        };
      }
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseMintMessage(slice);
      assert(
        parsed.internalMessage.forwardPayload.remainingBits === 0 &&
          parsed.internalMessage.forwardPayload.remainingRefs === 0,
        "Mint forward payload not supported",
      );
      return {
        jetton: {
          amount: parsed.internalMessage.jettonAmount.toString(),
          kind: "mint",
        },
        jettonMinter: parsed.toAddress,
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseTopUp(slice);
      return { customType: "topUp" };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseChangeAdmin(slice);
      return { customType: "changeAdmin", newAdmin: parsed.newAdminAddress };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseClaimAdmin(slice);
      return { customType: "claimAdmin" };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseChangeContent(slice);
      return { customType: "changeContent", newMetadataUrl: parsed.newMetadataUrl };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseTransfer(slice);
      if (parsed.customPayload)
        throw new Error("Transfer custom payload not supported");

      let comment = "";
      if (
        parsed.forwardPayload.remainingBits === 0 &&
        parsed.forwardPayload.remainingRefs === 0
      ) {
        comment = "";
      } else if (parsed.forwardPayload.remainingBits >= 32) {
        const op = parsed.forwardPayload.loadUint(32);
        assert(op === 0, "Transfer arbitrary forward payload not supported");
        comment = sanitizeHTML(parsed.forwardPayload.loadStringTail());
      } else {
        assert(false, "Transfer arbitrary forward payload not supported");
      }

      return {
        comment,
        jetton: {
          amount: parsed.jettonAmount.toString(),
          kind: "transfer",
        },
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseCallTo(
        slice,
        JettonMinter.parseSetStatus,
      );
      const lockType = intToLockType(parsed.action.newStatus);
      return {
        customType: "lockWallet",
        userAddress: parsed.toAddress,
        lockType,
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseCallTo(
        slice,
        JettonMinter.parseTransfer,
      );
      if (parsed.action.customPayload)
        throw new Error("Force transfer custom payload not supported");
      assert(
        parsed.action.forwardPayload.remainingBits === 0 &&
          parsed.action.forwardPayload.remainingRefs === 0,
        "Force transfer forward payload not supported",
      );
      return {
        customType: "forceTransfer",
        jetton: {
          amount: parsed.action.jettonAmount.toString(),
          kind: "transfer",
        },
        toAddress: parsed.action.toAddress,
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const parsed = JettonMinter.parseCallTo(slice, JettonMinter.parseBurn);
      if (parsed.action.customPayload)
        throw new Error("Burn custom payload not supported");
      return {
        customType: "forceBurn",
        jetton: {
          amount: parsed.action.jettonAmount.toString(),
          kind: "burn",
        },
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const op = slice.loadUint(32);
      // https://github.com/ton-blockchain/mytonctrl/blob/master/mytoncore/contracts/single-nominator-pool/single-nominator-code.fc#L98
      if (op === SINGLE_NOMINATOR_POOL_OP_WITHDRAW) {
        const queryId = slice.loadUint(64);
        const coins = slice.loadCoins();
        void queryId;
        return {
          nominatorOp: "withdraw",
          withdrawAmount: fromNano(coins),
        };
      }
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const op = slice.loadUint(32);
      // https://github.com/ton-blockchain/mytonctrl/blob/master/mytoncore/contracts/single-nominator-pool/single-nominator-code.fc#L106
      if (op === SINGLE_NOMINATOR_POOL_OP_CHANGE_VALIDATOR_ADDRESS) {
        const queryId = slice.loadUint(64);
        const validatorAddress = slice.loadAddress();
        void queryId;
        return {
          nominatorOp: "changeValidator",
          validatorAddress,
        };
      }
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const op = slice.loadUint(32);
      if (op === VESTING_INTERNAL_TRANSFER) {
        const queryId = slice.loadUint(64);
      const sendMode = Number(slice.loadUint(8));
        if (sendMode !== 3)
          throw new Error("only send mode 3 supported by vesting");
        const msg = slice.loadRef();
        endParse(slice);

        const messageRelaxed = loadMessageRelaxed(msg.beginParse());
        const messageRelaxedInfo =
          messageRelaxed.info as CommonMessageInfoRelaxedInternal;
        const messageBody = messageRelaxed.body.beginParse();

        let comment = "";
        if (
          messageBody.remainingBits === 0 &&
          messageBody.remainingRefs === 0
        ) {
          // no payload
        } else if (
          messageBody.remainingBits > 32 &&
          messageBody.loadUint(32) == 0
        ) {
          comment = sanitizeHTML(messageBody.loadStringTail());
        }

        return { comment };
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const slice = cell.beginParse();
      const envelopeOp = slice.loadUint(32);
      if (envelopeOp !== 0x64c3c3e4) throw new Error("Not a FwdMsg");

      slice.loadBit();
      const proposalDeployer = slice.loadAddress();
      slice.loadUintBig(257);
      slice.loadUintBig(257);
      if (!slice.loadBit()) throw new Error("FwdMsg without body");
      const bodyCell = slice.loadRef();
      if (slice.loadBit()) slice.loadRef();
      if (slice.loadBit()) slice.loadRef();

      const bodySlice = bodyCell.beginParse();
      const bodyOp = bodySlice.loadUint(32);
      if (bodyOp !== 0x5938a1cb) throw new Error("Not a DeployAndInitProposal");

      const proposalStartTime = bodySlice.loadUintBig(64);
      const proposalEndTime = bodySlice.loadUintBig(64);
      const proposalSnapshotTime = bodySlice.loadUintBig(64);
      const votingSystemJson = bodySlice.loadStringRefTail();
      const votingPowerStrategiesJson = bodySlice.loadStringRefTail();
      const titleRaw = bodySlice.loadStringRefTail();

      const paramsSlice = bodySlice.loadRef().beginParse();

      // DAO may store description as string or as raw cell (BOC)
      let descriptionRaw: string | undefined;
      descriptionRaw = paramsSlice.loadStringRefTail();

      // If description is stored as a raw cell reference, load it
      if (!descriptionRaw && paramsSlice.remainingRefs > 0) {
        try {
          const descCell = paramsSlice.loadRef();
          descriptionRaw = descCell.beginParse().loadStringTail();
        } catch (e) {
          // No description available
        }
      }

      const parseLang = (json?: string) => {
        if (!json) return "";
        try {
          const parsed = JSON.parse(json);
          return (parsed.en || parsed.ru || Object.values(parsed)[0] || "")
            .toString()
            .trim();
        } catch {
          return json.trim();
        }
      };
      const title = parseLang(titleRaw);
      const description = parseLang(descriptionRaw);
      const quorum = paramsSlice.loadStringRefTail();
      const hide = paramsSlice.loadBit();

      let optionsText = votingSystemJson;
      let choicesArray: string[] = [];
      try {
        const parsed = JSON.parse(votingSystemJson);
        const votingSystem =
          typeof parsed === "string" ? JSON.parse(parsed) : parsed;
        const options: unknown[] = Array.isArray(votingSystem)
          ? (votingSystem as unknown[])
          : Array.isArray(votingSystem?.choices)
            ? (votingSystem.choices as unknown[])
            : Object.values(votingSystem ?? {});
        choicesArray = options.map((o) => String(o));
        optionsText = choicesArray
          .map((o) => `"${sanitizeHTML(o)}"`)
          .join(", ");
      } catch (e) {}
      optionsText = sanitizeHTML(optionsText);

      const strategyNames: Record<string, string> = {
        "0": "Держатели GRAM",
        "1": "Владельцы жетона",
        "2": "Владельцы NFT",
        "3": "Держатели GRAM (1 кошелёк = 1 голос)",
        "4": "Владельцы жетона (1 кошелёк = 1 голос)",
        "5": "Владельцы NFT (1 кошелёк = 1 голос)",
        "6": "Голос валидаторов",
        "7": "Держатели GRAM + голос валидаторов",
      };
      let strategiesText = "";
      try {
        const raw = JSON.parse(votingPowerStrategiesJson);
        const list = Array.isArray(raw) ? raw : [];
        strategiesText = list
          .map((s: unknown) => {
            const entry = s as {
              type?: number;
              name?: string;
              arguments?: { name?: string; value?: string }[];
            };
            const name =
              typeof entry?.name === "string" && entry.name
                ? entry.name
                : (strategyNames[String(entry?.type)] ??
                  `Стратегия #${String(entry?.type)}`);
            const args = (
              Array.isArray(entry?.arguments) ? entry.arguments : []
            )
              .map((a) => a?.value ?? "")
              .filter(Boolean)
              .map((a) => sanitizeHTML(a));
            return name + (args.length ? ` (${args.join(", ")})` : "");
          })
          .join("; ");
      } catch (e) {}

      const fmtTime = (t: bigint) =>
        new Date(Number(t) * 1000).toLocaleString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

      const quorumValue = parseInt(quorum, 10) || 0;

      return {
        title,
        description,
        choices: choicesArray,
        strategies: strategiesText,
        snapshotTime: fmtTime(proposalSnapshotTime),
        startTime: fmtTime(proposalStartTime),
        endTime: fmtTime(proposalEndTime),
        quorum: quorumValue,
        hide,
        deployer: proposalDeployer,
      };
    } catch (e) {}

    try {
      const slice = cell.beginParse();
      const op = slice.loadUint(32);
      if (op === 0x5fcc3d14) {
        // NFT Transfer (TEP-62)
        const queryId = slice.loadUint(64);
        void queryId;

        // new_owner address (256-bit hash)
        const newOwnerHashHex = slice.loadBits(256).toString();
        const newOwnerHashBuf = Buffer.from(newOwnerHashHex, "hex");
        const newOwnerAddr = new Address(0, newOwnerHashBuf);

        // response_to address (256-bit hash)
        const respHashHex = slice.loadBits(256).toString();
        const respHashBuf = Buffer.from(respHashHex, "hex");
        const respAddr = new Address(0, respHashBuf);
        void respAddr;

        let comment = "";
        // Check for forward_amount (64 bits) if enough bits remain
        if (slice.remainingBits >= 64) {
          const forwardAmount = slice.loadUint(64);
          void forwardAmount;
          // forward_amount present, check for forward_payload
          if (slice.remainingBits >= 32) {
            const fpOp = slice.loadUint(32);
            if (fpOp === 0) {
              comment = sanitizeHTML(slice.loadStringTail());
            }
          }
        } else if (slice.remainingBits >= 32) {
          // No forward_amount, check payload directly
          const fpOp = slice.loadUint(32);
          if (fpOp === 0) {
            comment = sanitizeHTML(slice.loadStringTail());
          }
        }

        return {
          newOwner: newOwnerAddr,
          comment,
        };
      }
    } catch (e) {}

    return {};
  };

  let parsedActions: OrderActionInfo[] = [];
  let summaryGram = "";
  let summaryJetton:
    | { amount: string; kind: "mint" | "transfer" | "burn" }
    | undefined = undefined;

  const actionsKeys = actions.keys();
  for (let key of actionsKeys) {
    const action = actions.get(key);
    const slice = action!.beginParse();
    const actionOp = slice.loadUint(32);
    if (actionOp === 0xf1381e5b) {
      // send message
      const sendMode = Number(slice.loadUint(8));

      let sendModeString: string[] = [];
      let allBalance = false;

      if (sendMode & 1) {
        sendModeString.push("Оплачивает комиссии отдельно");
      }
      if (sendMode & 2) {
        sendModeString.push("Игнорировать ошибки отправки");
      }
      if (sendMode & 128) {
        allBalance = true;
        sendModeString.push("ОТПРАВИТЬ ВЕСЬ БАЛАНС");
      }
      if (sendMode & 64) {
        sendModeString.push(
          "Перенести всю оставшуюся стоимость входящего сообщения",
        );
      }
      if (sendMode & 32) {
        throw new Error(
          "Заявка недействительна, потому что режим отправки (+32) удалит мультикошелек",
        );
      }

      const actionBody = slice.loadRef();
      endParse(slice);
      const messageRelaxed = loadMessageRelaxed(actionBody.beginParse());

      const info: CommonMessageInfoRelaxedInternal = messageRelaxed.info as any;

      if (info.ihrFee !== 0n) {
        throw new Error("Заявка недействительна: IHR-комиссия больше 0");
      }

      if (info.forwardFee !== 0n) {
        throw new Error("Заявка недействительна: форвард-комиссия больше 0");
      }

      const gramAmount = allBalance
        ? "ВЕСЬ БАЛАНС"
        : fromNano(info.value.coins);

      // Build send mode description
      const sendModeDescriptions: string[] = [];
      sendModeDescriptions.push(`Mode ${sendMode}`);
      if (sendMode & 1) sendModeDescriptions.push("Оплачивает комиссии отдельно");
      if (sendMode & 2) sendModeDescriptions.push("Игнорировать ошибки отправки");
      if (sendMode & 128) sendModeDescriptions.push("ОТПРАВИТЬ ВЕСЬ БАЛАНС");
      if (sendMode & 64) sendModeDescriptions.push("Перенести всю оставшуюся стоимость входящего сообщения");

      const actionInfo: OrderActionInfo = {
        type: "gram",
        actionName: `Отправить ${gramAmount} GRAM`,
        toAddress: info.dest,
        gramAmount,
        opCode: actionOp,
        sendMode,
        sendModeString: sendModeDescriptions.join(", "),
      };

      const parsedBody = await parseActionBody(messageRelaxed.body);
      if (parsedBody.comment) actionInfo.comment = parsedBody.comment;
      if (parsedBody.newOwner) {
        actionInfo.type = "nft";
        actionInfo.actionName = "Отправить NFT";
        actionInfo.nftContract = info.dest;
        actionInfo.newOwner = parsedBody.newOwner;
        delete actionInfo.gramAmount;
      }
      if (parsedBody.jetton) {
        actionInfo.type = "jetton";
        actionInfo.jettonAmount = parsedBody.jetton.amount;
        actionInfo.jettonKind = parsedBody.jetton.kind;
        delete actionInfo.gramAmount;
        if (parsedBody.jetton.kind === "mint") {
          actionInfo.actionName = "Минт жетонов";
          actionInfo.jettonMinter = parsedBody.jettonMinter;
        } else if (parsedBody.jetton.kind === "burn") {
          actionInfo.actionName = "Принудительное сжигание жетонов";
        } else {
          actionInfo.actionName = "Перевод жетонов";
        }
        actionInfo.toAddress = info.dest;
      }
      if (parsedBody.customType) {
        actionInfo.type = "jetton";
        actionInfo.customType = parsedBody.customType;
        if (parsedBody.customType === "topUp") {
          actionInfo.actionName = "Пополнить жетон";
        } else if (parsedBody.customType === "changeAdmin") {
          actionInfo.actionName = "Сменить администратора жетона";
          actionInfo.newAdmin = parsedBody.newAdmin;
        } else if (parsedBody.customType === "claimAdmin") {
          actionInfo.actionName = "Принять управление жетоном";
        } else if (parsedBody.customType === "changeContent") {
          actionInfo.actionName = "Изменить URL метаданных жетона";
          actionInfo.newMetadataUrl = parsedBody.newMetadataUrl;
        } else if (parsedBody.customType === "forceTransfer") {
          actionInfo.actionName = "Принудительный перевод жетонов";
          actionInfo.jettonAmount = parsedBody.jetton?.amount;
          actionInfo.toAddress = parsedBody.toAddress;
        } else if (parsedBody.customType === "forceBurn") {
          actionInfo.actionName = "Принудительное сжигание жетонов";
          actionInfo.jettonAmount = parsedBody.jetton?.amount;
        } else if (parsedBody.customType === "lockWallet") {
          actionInfo.actionName = "Установить статус для кошелька жетонов";
          actionInfo.userAddress = parsedBody.userAddress;
          actionInfo.lockType = parsedBody.lockType;
        }
      }
      if (parsedBody.title) {
        actionInfo.type = "proposal";
        actionInfo.actionName = "Предложение";
        actionInfo.title = parsedBody.title;
        actionInfo.description = parsedBody.description;
        actionInfo.choices = parsedBody.choices;
        actionInfo.strategies = parsedBody.strategies;
        actionInfo.snapshotTime = parsedBody.snapshotTime;
        actionInfo.startTime = parsedBody.startTime;
        actionInfo.endTime = parsedBody.endTime;
        actionInfo.quorum = parsedBody.quorum;
        actionInfo.hide = parsedBody.hide;
        actionInfo.deployer = parsedBody.deployer;
      }
      if (parsedBody.nominatorOp) {
        if (parsedBody.nominatorOp === "withdraw") {
          actionInfo.actionName = "Единый пул номинатора: Вывод";
          actionInfo.nominatorOp = parsedBody.nominatorOp;
          actionInfo.withdrawAmount = parsedBody.withdrawAmount;
        } else if (parsedBody.nominatorOp === "changeValidator") {
          actionInfo.actionName = "Единый пул номинатора: Сменить адрес валидатора";
          actionInfo.nominatorOp = parsedBody.nominatorOp;
          actionInfo.validatorAddress = parsedBody.validatorAddress;
        }
      }

      if (!summaryGram) {
        summaryGram = allBalance ? "ВЕСЬ БАЛАНС" : `${gramAmount} GRAM`;
      }
      if (!summaryJetton && parsedBody.jetton) {
        summaryJetton = parsedBody.jetton;
      }

      parsedActions.push(actionInfo);
    } else if (actionOp === 0x1d0cfbd3) {
      // update_multisig_params
      const newThreshold = slice.loadUint(8);
      const newSigners = cellToArray(slice.loadRef());
      const newProposers = slice.loadUint(1)
        ? cellToArray(slice.loadRef())
        : [];
      endParse(slice);

      assert(newSigners.length > 0, "Invalid new signers");
      assert(newThreshold > 0, "Invalid new threshold");
      assert(newThreshold <= newSigners.length, "Invalid new threshold");

      parsedActions.push({
        type: "update_multisig",
        actionName: "Обновить параметры мультикошелька",
        newThreshold,
        newSigners,
        newProposers,
      });
    } else {
      throw new Error("Неизвестное действие");
    }
  }

  return {
    address: multisigOrderAddress,
    tonBalance,
    orderId: parsedData.orderSeqno,
    isExecuted: parsedData.isExecuted,
    approvalsNum: parsedData.approvalsNum,
    approvalsMask: parsedData.approvalsMask,
    threshold: parsedData.threshold,
    signers: signersFormatted,
    expiresAt: new Date(parsedData.expirationDate * 1000),
    actions: parsedActions,
    summary: {
      gram: summaryGram,
      ...(summaryJetton ? { jetton: summaryJetton } : {}),
    },
    stateInitMatches,
    isMismatchSigners,
    isMismatchThreshold,
  };
};
