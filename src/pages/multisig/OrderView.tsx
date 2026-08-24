import { Box, Button, Typography, CircularProgress } from "@mui/material";
import "./multisig.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Address } from "@ton/core";
import { useMultisigInfo } from "multisig/useMultisigInfo";
import { useMyAddress } from "multisig/useMyAddress";
import { useMultisigSendTransaction } from "multisig/useMultisigSendTransaction";
import { useAppNavigation } from "router/navigation";
import { useDnsNames, AddressAvatar, AddressLink } from "./Avatar";
import { addressToString, AddressInfo } from "multisig/utils/utils";
import { Order } from "multisig/multisig/Order";
import {
  checkMultisigOrder,
  MultisigOrderInfo,
} from "multisig/multisig/MultisigOrderChecker";
import { MULTISIG_ORDER_CODE, IS_TESTNET } from "multisig/constants";
import { prepareApprove } from "multisig/orders";

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const formatDateRu = (date: Date): string => {
  const offsetMin = -date.getTimezoneOffset();
  const abs = Math.abs(offsetMin);
  const sign = offsetMin >= 0 ? "+" : "-";
  const offsetStr =
    "UTC (" +
    sign +
    Math.floor(abs / 60) +
    (abs % 60 !== 0 ? ":" + String(abs % 60).padStart(2, "0") : "") +
    ")";
  const dateStr =
    date.getDate() +
    " " +
    MONTHS_GENITIVE[date.getMonth()] +
    " " +
    date.getFullYear() +
    " года";
  const timeStr = date.toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return dateStr + ", " + timeStr + " " + offsetStr;
};

export default function OrderView() {
  const { address, orderId } = useParams();
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { send, sending } = useMultisigSendTransaction();
  const { info, loading } = useMultisigInfo(address);
  const [orderInfo, setOrderInfo] = useState<MultisigOrderInfo | undefined>(
    undefined,
  );
  const [err, setErr] = useState<string | null>(null);

  const orderIdBig = useMemo(() => {
    try {
      return orderId ? BigInt(orderId) : undefined;
    } catch {
      return undefined;
    }
  }, [orderId]);

  const orderAddress = useMemo<AddressInfo | undefined>(() => {
    if (!address || orderIdBig === undefined) return undefined;
    const temp = Order.createFromConfig(
      {
        multisig: Address.parseFriendly(address).address,
        orderSeqno: orderIdBig,
      },
      MULTISIG_ORDER_CODE,
    );
    const a: AddressInfo = {
      address: temp.address,
      isBounceable: true,
      isTestOnly: IS_TESTNET,
    };
    return a;
  }, [address, orderIdBig]);

  useEffect(() => {
    if (!info || !orderAddress) return;
    let cancelled = false;
    const load = async (isFirst: boolean) => {
      try {
        const oi = await checkMultisigOrder(
          orderAddress,
          MULTISIG_ORDER_CODE,
          info,
          IS_TESTNET,
          false,
        );
        if (cancelled) return;
        setOrderInfo(oi);
        setErr(null);
      } catch (e: any) {
        if (cancelled) return;
        if (isFirst || !e?.message?.startsWith("Timeout"))
          setErr(e?.message || "Ошибка");
      } finally {
        if (!cancelled) setTimeout(() => load(false), 5000);
      }
    };
    load(true);
    return () => {
      cancelled = true;
    };
  }, [info, orderAddress]);

  useDnsNames((orderInfo?.signers ?? []).map((a) => a.address));

  if (!address || orderIdBig === undefined) {
    navigate("/multisig", { replace: true });
    return null;
  }
  if (loading && !info) {
    return (
      <Box className="multisigPage multisigLoading">
        <CircularProgress />
      </Box>
    );
  }
  if (!info || !orderAddress) return null;

  const onApprove = async () => {
    setErr(null);
    if (!myAddress) {
      setErr("Пожалуйста, подключите кошелёк");
      return;
    }
    const mySignerIndex = orderInfo!.signers.findIndex((a) =>
      a.address.equals(myAddress),
    );
    if (mySignerIndex === -1) {
      setErr("Вы не подписант");
      return;
    }
    try {
      const message = prepareApprove(orderInfo!);
      await send({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [message],
      });
    } catch (e: any) {
      setErr(e?.message || "Ошибка отправки");
    }
  };

  if (err && !orderInfo) {
    return (
      <Box className="multisigPage">
        <Button variant="text" onClick={() => multisigPage.address(address!)}>
          ← К мультикошельку
        </Button>
        <Typography color="error">Ошибка: {err}</Typography>
      </Box>
    );
  }

  if (!orderInfo) {
    return (
      <Box className="multisigPage multisigLoading">
        <CircularProgress />
      </Box>
    );
  }

  const {
    tonBalance,
    actions,
    isExecuted,
    approvalsNum,
    approvalsMask,
    threshold,
    signers,
    expiresAt,
    isMismatchThreshold,
    isMismatchSigners,
  } = orderInfo;

  const isExpired = new Date().getTime() > expiresAt.getTime();
  let isApprovedByMe = false;
  const signerNodes = signers.map((signer, i) => {
    const mask = 1 << i;
    const isSigned = (approvalsMask & mask) > 0;
    if (myAddress && isSigned && signer.address.equals(myAddress))
      isApprovedByMe = true;
    const isMe = myAddress ? signer.address.equals(myAddress) : false;
    return (
      <Box key={i} className="daoAvatarGridItem">
        <AddressAvatar
          address={signer}
          isMe={isMe}
          statusBadge={isSigned ? "✅" : "❌"}
        />
      </Box>
    );
  });

  const showApprove =
    !isExecuted && !isExpired && !isApprovedByMe && !!myAddress;

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.address(address!)}>
        ← К мультикошельку
      </Button>
      <Typography variant="h4">Заявка #{orderIdBig.toString()}</Typography>
      <Typography className="multisigCardAddress">
        <AddressLink address={orderAddress} />
      </Typography>

      {isExecuted ? (
        <Box className="orderField">
          <Typography className="label">Выполнено:</Typography>
          <Typography className="value">Да</Typography>
        </Box>
      ) : null}

      <Box className="orderField">
        <Typography className="label">Баланс заявки:</Typography>
        <Typography className="value">{tonBalance.toString()} GRAM</Typography>
      </Box>

      <Box className="orderField">
        <Typography className="label">Подтверждения:</Typography>
        <Typography className="value">
          {approvalsNum}/{threshold}
        </Typography>
      </Box>

      <Box className="orderField">
        <Typography className="label">Истекает:</Typography>
        <Typography className="value">
          {(isExpired && !isExecuted ? "❌ ИСТЁК - " : "") + formatDateRu(expiresAt)}
        </Typography>
      </Box>

      {isMismatchThreshold ? (
        <Typography color="error">
          Порог мультикошелька не совпадает с порогом заявки
        </Typography>
      ) : null}
      {isMismatchSigners ? (
        <Typography color="error">
          Подписанты мультикошелька не совпадают с подписантами заявки
        </Typography>
      ) : null}

      <Box className="multisigSection">
        <Typography className="label">
          {actions.length === 0
            ? "Нет действий"
            : actions.length === 1
              ? "Одно действие:"
              : actions.length + " действий:"}
        </Typography>
        {actions.map((a, i) => (
          <Box
            key={i}
            dangerouslySetInnerHTML={{ __html: a }}
            className="orderAction"
          />
        ))}
      </Box>

      <Box className="multisigSection">
        <Typography className="label">Подписанты:</Typography>
        <Box className="daoAvatarGrid">{signerNodes}</Box>
      </Box>

      {showApprove ? (
        <Box className="multisigHeaderButtons">
          <Button variant="contained" onClick={onApprove} disabled={sending}>
            {sending ? "Подтверждение..." : "Подтвердить"}
          </Button>
        </Box>
      ) : null}
      {err ? <Typography color="error">{err}</Typography> : null}
    </Box>
  );
}
