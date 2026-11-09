import { Box, Button, Typography, CircularProgress, useTheme } from "@mui/material";
import "./multisig.css";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Address, fromNano } from "@ton/core";
import { useMultisigInfo } from "multisig/useMultisigInfo";
import { useMyAddress } from "multisig/useMyAddress";
import { useAppNavigation } from "router/navigation";
import { useDnsNames, AddressAvatar, AddressLink } from "./Avatar";
import {
  equalsMsgAddresses,
  addressToString,
  AddressInfo,
} from "multisig/utils/utils";
import {
  addOpenedMultisig,
  fetchJettonBalance,
  RegistryJetton,
  getSnapshotEntries,
} from "multisig/utils/MultisigRegistry";
import { IS_TESTNET, GRAM_LOGO_URL } from "multisig/constants";
import { BLACKLISTED_ORDERS } from "config";
import { LastOrder, isLastOrderExpired } from "multisig/multisig/MultisigChecker";

const ORDERS_PAGE_SIZE = 5;

const truncateOrderId = (id: bigint | undefined): string => {
  if (id === undefined) return "";
  const s = id.toString();
  if (s.length <= 8) return s;
  return s.slice(0, 3) + "..." + s.slice(-3);
};

const declension = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
};

const formatRelativeTime = (utime: number): string => {
  const now = Date.now();
  const diff = now - utime * 1000;
  const absDiff = Math.abs(diff);
  const ago = diff >= 0;

  if (absDiff < 60_000) return ago ? "только что" : "через " + Math.round(60 - absDiff / 1000) + " сек";
  if (absDiff < 3_600_000) {
    const v = Math.round(absDiff / 60_000);
    return ago ? v + " " + declension(v, ["минуту", "минуты", "минут"]) + " назад" : "через " + v + " " + declension(v, ["минуту", "минуты", "минут"]);
  }
  if (absDiff < 86_400_000) {
    const v = Math.round(absDiff / 3_600_000);
    return ago ? v + " " + declension(v, ["час", "часа", "часов"]) + " назад" : "через " + v + " " + declension(v, ["час", "часа", "часов"]);
  }
  const v = Math.round(absDiff / 86_400_000);
  return ago ? v + " " + declension(v, ["день", "дня", "дней"]) + " назад" : "через " + v + " " + declension(v, ["день", "дня", "дней"]);
};

const formatActionLabel = (
  summary: { gram?: string; jetton?: { amount: string; kind: "mint" | "transfer" | "burn" } } | undefined,
  isBurn: boolean,
  actionType?: "gram" | "nft" | "jetton" | "proposal" | "update_multisig",
): string => {
  if (actionType === "nft") return "Отправить NFT";
  if (actionType === "jetton") {
    if (isBurn) return "Сжигание жетонов";
    if (summary?.jetton?.kind === "mint") return "Выпуск жетонов";
    if (summary?.jetton?.kind === "burn") return "Сжигание жетонов";
    return "Отправка жетонов";
  }
  if (actionType === "proposal") return "Предложение";
  if (actionType === "update_multisig") return "Обновление параметров";
  if (!summary) return "";
  if (isBurn) return "Принудительное сжигание";
  if (summary.jetton) {
    const kind = summary.jetton.kind;
    if (kind === "mint") return "Выпуск жетонов";
    if (kind === "burn") return "Сжигание жетонов";
    return "Отправка жетонов";
  }
  if (summary.gram === "Обновление") return "Обновление параметров";
  if (summary.gram) return "Отправка GRAM";
  return "";
};

const orderStatusIcon = (executed: boolean, expired: boolean): string => {
  const color = executed ? "#4bb34b" : "#3069ff";
  const shape = expired
    ? '<path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'
    : '<path d="M4.6 8.4l2.3 2.3 4.6-4.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  return (
    '<svg class="orderStatusIcon" width="32" height="32" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="' +
    color +
    '"/>' +
    shape +
    "</svg>"
  );
};

const formatJettonAmount = (balance: string, decimals: number): string => {
  const value = BigInt(balance || "0");
  if (decimals <= 0) return value.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return whole.toString() + "." + fracStr;
};

const findJettonForMultisig = (multisigAddress: string): RegistryJetton | undefined => {
  const rawAddress = Address.parseFriendly(multisigAddress).address.toRawString();
  for (const entry of getSnapshotEntries()) {
    const entryRaw = Address.parseFriendly(entry.address).address.toRawString();
    if (entryRaw === rawAddress && entry.jetton) {
      return entry.jetton;
    }
  }
  return undefined;
};

export default function MultisigView() {
  const { address } = useParams();
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { info, loading, error } = useMultisigInfo(address);
  const [offset, setOffset] = useState(0);
  const [jettonBalance, setJettonBalance] = useState<string>("");
  const [jettonInfo, setJettonInfo] = useState<RegistryJetton | undefined>(undefined);
  const theme = useTheme();
  const lineColor = theme.palette.mode === "dark" ? "#66d966" : "#4bb34b";

  const parsed = useMemo(() => {
    if (!address || !Address.isFriendly(address)) return undefined;
    const p = Address.parseFriendly(address);
    p.isBounceable = false;
    p.isTestOnly = IS_TESTNET;
    return p;
  }, [address]);

  useEffect(() => {
    if (parsed) addOpenedMultisig(addressToString(parsed));
  }, [parsed, address]);

  // Загрузка баланса жетона для этого мультикошелька
  useEffect(() => {
    if (!address || !info) return;
    const j = findJettonForMultisig(address);
    if (!j) {
      setJettonInfo(undefined);
      setJettonBalance("");
      return;
    }
    setJettonInfo(j);
    fetchJettonBalance(j.address, address, IS_TESTNET).then(setJettonBalance);
  }, [address, info]);

  useDnsNames(
    info ? [...info.signers, ...info.proposers].map((a) => a.address) : [],
  );

  useEffect(() => {
    if (!parsed) navigate("/multisig", { replace: true });
  }, [parsed, navigate]);

  // Текущий адрес мультикошелька в сыром виде для сравнения — ДО раннего возврата
  const currentAddressRaw = useMemo(() => {
    if (!parsed) return undefined;
    return parsed.address.toRawString();
  }, [parsed]);

  const hiddenOrderSet = useMemo(() => {
    if (!currentAddressRaw) return new Set<string>();
    return new Set(
      BLACKLISTED_ORDERS
        .filter((entry) => {
          try {
            const configRaw = Address.parse(entry.address).toRawString();
            return configRaw === currentAddressRaw;
          } catch {
            return false;
          }
        })
        .map((entry) => entry.orderId),
    );
  }, [currentAddressRaw, BLACKLISTED_ORDERS]);

  if (!parsed) return null;

  if (loading && !info) {
    return (
      <Box className="multisigPage multisigLoading">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !info) {
    return (
      <Box className="multisigPage">
        <Button variant="text" onClick={() => multisigPage.root()}>
          ← Назад
        </Button>
        <Typography color="error">Ошибка: {error}</Typography>
      </Box>
    );
  }

  if (!info) return null;

  const { threshold, signers, proposers, allowArbitraryOrderSeqno, lastOrders } =
    info;

  const total = threshold + signers.length;
  const thresholdPct = total > 0 ? (threshold / total) * 100 : 50;
  const signersPct = total > 0 ? (signers.length / total) * 100 : 50;

  const avatarList = (list: AddressInfo[]) =>
    list.map((signer, i) => {
      const isMe = equalsMsgAddresses(signer.address, myAddress);
      return (
        <Box key={i} className="daoAvatarGridItem">
          <AddressAvatar address={{ ...signer, isBounceable: false }} isMe={isMe} meOnCircle />
        </Box>
      );
    });

  const renderOrder = (lastOrder: LastOrder) => {
    const orderId = lastOrder.order?.id;
    const orderAddress = lastOrder.order
      ? addressToString(lastOrder.order.address)
      : "";
    const isExpired = isLastOrderExpired(lastOrder);
    const orderInfo = lastOrder.orderInfo;
    const summary = orderInfo?.summary ?? lastOrder.summary;

    let icon = "";
    let state = "";
    let statusClass = "";
    let timeLabel = "";

    if (lastOrder.executionStatus === "success") {
      icon = orderStatusIcon(true, false);
      state = "выполнено";
      timeLabel = "Исполнено";
    } else if (lastOrder.executionStatus === "failed") {
      icon = orderStatusIcon(false, false);
      state = "ошибка";
      statusClass = "status-error";
      timeLabel = "Ошибка";
    } else if (lastOrder.errorMessage) {
      if (lastOrder.errorMessage.startsWith("Контракт не активен")) {
        if (isExpired) {
          icon = orderStatusIcon(false, true);
          state = "просрочена";
          statusClass = "status-expired";
          timeLabel = "Просрочена";
        } else {
          state = "контракт ещё не активен";
          timeLabel = "Ожидание";
        }
      } else if (lastOrder.errorMessage.startsWith("Неудача")) {
        icon = orderStatusIcon(false, false);
        state = "ошибка";
        statusClass = "status-error";
        timeLabel = "Ошибка";
      } else {
        icon = orderStatusIcon(false, false);
        state = "недействительна";
        timeLabel = "Недействительна";
      }
    } else {
      if (isExpired) {
        icon = orderStatusIcon(false, true);
        state = "просрочена";
        statusClass = "status-expired";
        timeLabel = "Просрочена";
      } else if (lastOrder.type === "executed") {
        icon = orderStatusIcon(true, false);
        state = "выполнено";
        timeLabel = "Исполнено";
      } else if (lastOrder.type === "pending") {
        timeLabel = "Создана";
      }
    }

    const isBurn = summary?.jetton?.kind === "burn";
    const actionLabel = orderInfo?.actions?.[0]?.actionName || formatActionLabel(summary, isBurn, lastOrder.actionType);
    return (
      <Box
        key={orderId + "_" + orderAddress}
        className="multisig_lastOrder"
        onClick={() => orderId !== undefined && multisigPage.order(address!, orderId)}
      >
        <Box className="multisig_lastOrderCol multisig_lastOrderColOrder">
          <Box className="orderListItem_info">
            <Box className="orderListItem_title">
              {"#" + truncateOrderId(orderId)}
            </Box>
          </Box>
        </Box>
        <Box className="multisig_lastOrderCol multisig_lastOrderColAction">
          {actionLabel ? (
            <Typography className="orderListItem_actionText">{actionLabel}</Typography>
          ) : null}
        </Box>
        <Box className="multisig_lastOrderCol multisig_lastOrderColApprovals">
          {orderInfo ? (
            <div className="approvalsBarWrap">
              {Array.from({ length: orderInfo.approvalsNum }, (_, i) => (
                <Box key={i} className="approvalSegment" />
              ))}
              <span className="approvalsBarText">
                {orderInfo.approvalsNum}/{orderInfo.threshold}
              </span>
            </div>
          ) : (
            <span className="approvalsBarText">
              {threshold}/{signers.length}
            </span>
          )}
        </Box>
        <Box className="multisig_lastOrderCol multisig_lastOrderColStatus">
          {state ? (
            <Box className={"orderListItem_statusBadge" + (statusClass ? " " + statusClass : "")}>
              <Typography className="orderListItem_statusBadgeText">{state}</Typography>
            </Box>
          ) : null}
        </Box>
        <Box className="multisig_lastOrderCol multisig_lastOrderColDate">
          {timeLabel ? (
            <Typography className="orderListItem_timeText">
              {timeLabel} {formatRelativeTime(lastOrder.utime)}
            </Typography>
          ) : null}
        </Box>
      </Box>
    );
  };

  const visibleOrders = (lastOrders ?? []).filter(
    (o) => !o.order?.id || !hiddenOrderSet.has(o.order.id.toString()),
  );
  const totalFiltered = visibleOrders.length;
  const pageOrders = visibleOrders.slice(offset, offset + ORDERS_PAGE_SIZE);

  return (
    <Box className="multisigPage">
      <Box className="multisigHeader">
        <Button variant="outlined" onClick={() => multisigPage.root()}>
          Назад
        </Button>
        <Button
          variant="contained"
          onClick={() => multisigPage.newOrder(address!)}
        >
          Создать заявку
        </Button>
      </Box>

      <Box className="multisigCard">
        <Typography className="multisigCardAddress">
          <AddressLink address={parsed} />
        </Typography>
        <Box className="multisigCardBalances">
          <Typography className="multisigCardBalance">
            <img className="multisigCardBalanceLogo" src={GRAM_LOGO_URL} alt="" />
            {fromNano(info.tonBalance)} GRAM
          </Typography>
          {jettonInfo && jettonBalance ? (
            <Typography className="multisigCardBalance">
              <img className="multisigCardBalanceLogo" src={jettonInfo.logo || ""} alt="" />
              {formatJettonAmount(jettonBalance, jettonInfo.decimals ?? 0)} {jettonInfo.name}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box className="thresholdBarWrap">
        <Box className="thresholdBar">
          <Box
            className="thresholdBarSeg thresholdBarThreshold"
            style={{ flexGrow: thresholdPct }}
          >
            <span className="thresholdBarCount">{threshold}</span>
            <span className="thresholdBarCaption">Порог</span>
          </Box>
          <Box
            className="thresholdBarSeg thresholdBarSigners"
            style={{ flexGrow: signersPct }}
          >
            <span className="thresholdBarCount">{signers.length}</span>
            <span className="thresholdBarCaption">Подписанты</span>
          </Box>
        </Box>
      </Box>

      <Box className="multisigConfigRow">
        <Button variant="outlined" onClick={() => multisigPage.create()}>
          Изменить конфигурацию
        </Button>
      </Box>

      <Box className="multisigSection">
        <Typography className="label">Подписанты:</Typography>
        <Box className="daoAvatarGrid">{avatarList(signers)}</Box>
      </Box>

      <Box className="multisigSection">
        <Typography className="label">
          {proposers.length > 0 ? "Инициаторы:" : "Нет инициаторов"}
        </Typography>
        {proposers.length > 0 ? (
          <Box className="daoAvatarGrid">{avatarList(proposers)}</Box>
        ) : null}
      </Box>

      <Box className="multisigSection">
        <Typography className="label">Заявки:</Typography>
        {pageOrders.length === 0 ? (
          <Typography className="value">Нет заявок</Typography>
        ) : (
          <Box className="lastOrdersList">
            <Box className="lastOrdersTable">
              <Box className="lastOrdersTableHeader">
                <Box className="multisig_lastOrderCol">Заявка</Box>
                <Box className="multisig_lastOrderCol">Действие</Box>
                <Box className="multisig_lastOrderCol">Подтверждения</Box>
                <Box className="multisig_lastOrderCol">Статус</Box>
                <Box className="multisig_lastOrderCol">Дата</Box>
              </Box>
              {pageOrders.map(renderOrder)}
            </Box>
          </Box>
        )}
        <Box className="lastOrdersPagination">
          <Button
            disabled={offset <= 0}
            onClick={() => setOffset((o) => Math.max(0, o - ORDERS_PAGE_SIZE))}
          >
            Назад
          </Button>
          <Button
            disabled={offset + ORDERS_PAGE_SIZE >= totalFiltered}
            onClick={() => setOffset((o) => o + ORDERS_PAGE_SIZE)}
          >
            Далее
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
