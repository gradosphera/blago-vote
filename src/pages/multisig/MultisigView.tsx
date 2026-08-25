import { Box, Button, Typography, CircularProgress } from "@mui/material";
import "./multisig.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Address, fromNano } from "@ton/core";
import { useMultisigInfo } from "multisig/useMultisigInfo";
import { useMyAddress } from "multisig/useMyAddress";
import { useAppNavigation } from "router/navigation";
import { useDnsNames, AddressAvatar, AddressLink } from "./Avatar";
import {
  equalsMsgAddresses,
  base64toHex,
  addressToString,
  AddressInfo,
} from "multisig/utils/utils";
import { addOpenedMultisig } from "multisig/utils/MultisigRegistry";
import { IS_TESTNET } from "multisig/constants";
import { LastOrder, isLastOrderExpired } from "multisig/multisig/MultisigChecker";

const ORDERS_PAGE_SIZE = 5;

const orderStatusIcon = (executed: boolean, expired: boolean): string => {
  const color = executed ? "#2ecc71" : "#4da3ff";
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

export default function MultisigView() {
  const { address } = useParams();
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { info, loading, error } = useMultisigInfo(address);
  const [offset, setOffset] = useState(0);

  const parsed = useMemo(() => {
    if (!address || !Address.isFriendly(address)) return undefined;
    const p = Address.parseFriendly(address);
    p.isBounceable = true;
    p.isTestOnly = IS_TESTNET;
    return p;
  }, [address]);

  useEffect(() => {
    if (parsed) addOpenedMultisig(addressToString(parsed));
  }, [parsed, address]);

  useDnsNames(
    info ? [...info.signers, ...info.proposers].map((a) => a.address) : [],
  );

  useEffect(() => {
    if (!parsed) navigate("/multisig", { replace: true });
  }, [parsed, navigate]);

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
          ← К списку
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
          <AddressAvatar address={signer} isMe={isMe} meOnCircle />
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
    let showLink = false;

    if (lastOrder.errorMessage) {
      if (lastOrder.errorMessage.startsWith("Контракт не активен")) {
        if (isExpired) {
          icon = orderStatusIcon(false, true);
          state = "просрочена";
          showLink = true;
        } else {
          state = "контракт ещё не активен";
        }
      } else if (lastOrder.errorMessage.startsWith("Неудача")) {
        icon = orderStatusIcon(false, false);
        state = "ошибка выполнения";
        showLink = true;
      } else {
        icon = orderStatusIcon(false, false);
        state = "недействительна";
      }
    } else {
      if (isExpired) {
        icon = orderStatusIcon(false, true);
        state = "просрочена";
      } else if (lastOrder.type === "executed") {
        icon = orderStatusIcon(true, false);
        state = "выполнено";
      }
      if (lastOrder.type === "executed") showLink = true;
    }

    let approvals = "";
    if (orderInfo) {
      approvals = "Подтверждений: " + orderInfo.approvalsNum + "/" + orderInfo.threshold;
      if (lastOrder.type === "pending" && myAddress) {
        const myIndex = orderInfo.signers.findIndex((s) =>
          s.address.equals(myAddress),
        );
        if (myIndex > -1) {
          const mask = 1 << myIndex;
          const isSigned = orderInfo.approvalsMask & mask;
          approvals += isSigned ? " — Вы подтвердили" : " — Вы ещё не подтвердили";
        }
      }
    }

    const isBurn = summary?.jetton?.kind === "burn";
    const jettonLine =
      summary && summary.jetton
        ? summary.jetton.amount +
          " жетонов · " +
          (summary.jetton.kind === "mint"
            ? "выпуск"
            : summary.jetton.kind === "burn"
              ? "сжигание"
              : "отправка")
        : "";
    const gramHTML = summary?.gram
      ? '<div class="orderListItem_gramCol">' + summary.gram + "</div>"
      : "";
    let statsHTML = "";
    if (jettonLine || showLink) {
      const link = showLink
        ? '<a class="orderListItem_link" href="https://tonscan.org/ru/tx/' +
          base64toHex(lastOrder.transactionHash) +
          '" target="_blank">ссылка</a>'
        : "";
      statsHTML =
        '<div class="orderListItem_stats">' +
        (jettonLine ? '<div class="orderListItem_jetton">' + jettonLine + "</div>" : "") +
        link +
        "</div>";
    }

    return (
      <Box
        key={orderId + "_" + orderAddress}
        className="multisig_lastOrder"
        onClick={() => orderId !== undefined && multisigPage.order(address!, orderId)}
      >
        <span
          className="orderListItem_status"
          dangerouslySetInnerHTML={{ __html: icon }}
        />
        <Box className="orderListItem_info">
          <Box className="orderListItem_title">
            {"Заявка #" + orderId}
            {state ? (
              <span className="orderListItem_state"> — {state}</span>
            ) : null}
          </Box>
          {approvals ? (
            <Box className="orderListItem_approvals">{approvals}</Box>
          ) : null}
        </Box>
        {isBurn ? (
          <span className="orderListItem_burn" title="Принудительное сжигание">
            🔥
          </span>
        ) : null}
        <span dangerouslySetInnerHTML={{ __html: gramHTML }} />
        <span dangerouslySetInnerHTML={{ __html: statsHTML }} />
      </Box>
    );
  };

  const pageOrders = lastOrders.slice(offset, offset + ORDERS_PAGE_SIZE);

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.root()}>
        ← К списку
      </Button>

      <Box className="multisigHeader">
        <Typography variant="h4">Мультикошелек</Typography>
        <Box className="multisigHeaderButtons">
          <Button variant="outlined" onClick={() => multisigPage.create()}>
            Изменить конфигурацию
          </Button>
          <Button
            variant="contained"
            onClick={() => multisigPage.newOrder(address!)}
          >
            Создать заявку
          </Button>
        </Box>
      </Box>

      <Box className="multisigCard">
        <Typography className="multisigCardAddress">
          <AddressLink address={parsed} />
        </Typography>
        <Typography className="multisigCardBalance">
          {fromNano(info.tonBalance)} GRAM
        </Typography>
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
            {pageOrders.map(renderOrder)}
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
            disabled={offset + ORDERS_PAGE_SIZE >= lastOrders.length}
            onClick={() => setOffset((o) => o + ORDERS_PAGE_SIZE)}
          >
            Далее
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
