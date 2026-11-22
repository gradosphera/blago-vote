import { Box, Button, Typography, CircularProgress } from "@mui/material";
import "./multisig.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Address } from "@ton/core";
import { useMyAddress } from "multisig/useMyAddress";
import { useMultisigSendTransaction } from "multisig/useMultisigSendTransaction";
import { useAppNavigation } from "router/navigation";
import { useMultisigInfo } from "multisig/useMultisigInfo";
import { prepareCreateMultisig, prepareUpdateMultisig, TonConnectMessage } from "multisig/orders";
import { IS_TESTNET } from "multisig/constants";
import {
  validateUserFriendlyAddress,
  addressToString,
  equalsMsgAddresses,
} from "multisig/utils/utils";

interface PreparedUpdate {
  orderId: bigint;
  message: TonConnectMessage;
}

export default function CreateMultisig() {
  const { address } = useParams();
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { send, sending } = useMultisigSendTransaction();

  // Режим редактирования: если есть address в URL — это edit
  const isEdit = !!address;

  // Загрузка информации о текущем мультикошельке для edit режима
  const { info: multisigInfo, loading: multisigLoading } = useMultisigInfo(
    isEdit ? address : undefined
  );

  const [signers, setSigners] = useState<string[]>([""]);
  const [proposers, setProposers] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [preparedUpdate, setPreparedUpdate] = useState<PreparedUpdate | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Вычисление order ID из lastOrders
  useEffect(() => {
    if (!isEdit || !multisigInfo) return;
    if (multisigInfo.lastOrders.length === 0) {
      setOrderId("1");
    } else {
      let highest = -1n;
      multisigInfo.lastOrders.forEach((o: { order?: { id: bigint } }) => {
        if (o.order && o.order.id > highest) highest = o.order.id;
      });
      setOrderId(highest === -1n ? "" : (highest + 1n).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, multisigInfo]);

  // Инициализация формы
  useEffect(() => {
    if (isEdit && multisigInfo) {
      // Edit mode: pre-fill with current config
      const signerAddresses = multisigInfo.signers.map((s) =>
        addressToString({ address: s.address, isBounceable: true, isTestOnly: IS_TESTNET })
      );
      const proposerAddresses = multisigInfo.proposers.map((p) =>
        addressToString({ address: p.address, isBounceable: true, isTestOnly: IS_TESTNET })
      );
      setSigners(signerAddresses);
      setProposers(proposerAddresses);
      setThreshold(multisigInfo.threshold.toString());
    } else if (!isEdit && myAddress && signers.length === 1 && signers[0] === "") {
      // Create mode: pre-fill with user's address
      setSigners([addressToString({ address: myAddress, isBounceable: true, isTestOnly: IS_TESTNET })]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, multisigInfo, myAddress]);

  const addSigner = () => setSigners((s) => [...s, ""]);
  const addProposer = () => setProposers((p) => [...p, ""]);
  const setSigner = (i: number, v: string) =>
    setSigners((s) => s.map((x, j) => (j === i ? v : x)));
  const setProposer = (i: number, v: string) =>
    setProposers((p) => p.map((x, j) => (j === i ? v : x)));
  const removeSigner = (i: number) =>
    setSigners((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s));
  const removeProposer = (i: number) =>
    setProposers((p) => p.filter((_, j) => j !== i));

  const onSubmit = useCallback(async () => {
    setErr(null);
    if (!myAddress) {
      setErr("Пожалуйста, подключите кошелёк");
      return;
    }
    const thresholdNum = parseInt(threshold);
    if (
      isNaN(thresholdNum) ||
      thresholdNum <= 0 ||
      thresholdNum > signers.length
    ) {
      setErr("Порог: некорректное число");
      return;
    }
    const addressMap: { [key: string]: boolean } = {};
    const signerAddresses: Address[] = [];
    for (const s of signers) {
      if (s === "") {
        setErr("Пустое поле подписанта");
        return;
      }
      const error = validateUserFriendlyAddress(s, IS_TESTNET);
      if (error) {
        setErr("Подписант: " + error);
        return;
      }
      const addr = Address.parseFriendly(s).address;
      const raw = addr.toRawString();
      if (addressMap[raw]) {
        setErr("Дубликат " + s);
        return;
      }
      addressMap[raw] = true;
      signerAddresses.push(addr);
    }
    const proposerAddresses: Address[] = [];
    for (const p of proposers) {
      if (p === "") continue;
      const error = validateUserFriendlyAddress(p, IS_TESTNET);
      if (error) {
        setErr("Инициатор: " + error);
        return;
      }
      const addr = Address.parseFriendly(p).address;
      const raw = addr.toRawString();
      if (addressMap[raw]) {
        setErr("Дубликат " + p);
        return;
      }
      addressMap[raw] = true;
      proposerAddresses.push(addr);
    }

    try {
      if (isEdit && address && multisigInfo) {
        // Update mode: prepare an update order
        const oid = BigInt(orderId);
        if (oid < 0n) {
          setErr("Неверный номер заявки");
          return;
        }

        const parsedAddress = Address.parseFriendly(address);
        parsedAddress.isBounceable = false;
        parsedAddress.isTestOnly = IS_TESTNET;

        const prepared = await prepareUpdateMultisig({
          multisigInfo,
          isTestnet: IS_TESTNET,
          orderId: oid,
          threshold: thresholdNum,
          signers: signerAddresses,
          proposers: proposerAddresses,
          myAddress: myAddress!,
        });

        setPreparedUpdate(prepared);
      } else {
        // Create mode: create a new multisig
        const { multisigAddress, message } = prepareCreateMultisig({
          threshold: thresholdNum,
          signers: signerAddresses,
          proposers: proposerAddresses,
          isTestnet: IS_TESTNET,
        });
        await send({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [message],
        });
        multisigPage.address(addressToString({ address: multisigAddress, isBounceable: true, isTestOnly: IS_TESTNET }));
      }
    } catch (e: any) {
      setErr(e?.message || "Ошибка отправки");
    }
  }, [myAddress, threshold, signers, proposers, send, multisigPage, isEdit, address, multisigInfo, orderId]);

  const onSend = useCallback(async () => {
    if (!preparedUpdate) return;
    try {
      await send({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [preparedUpdate.message],
      });
      // Navigate to the order page to display the request number
      if (isEdit && address) {
        multisigPage.order(address, preparedUpdate.orderId);
      }
    } catch (e: any) {
      setErr(e?.message || "Ошибка отправки");
      setPreparedUpdate(null);
    }
  }, [preparedUpdate, send, multisigPage, isEdit, address]);

  // Заголовок и текст кнопки зависят от режима
  const title = isEdit ? "Обновить конфигурацию" : "Создать мультикошелек";
  const submitLabel = sending
    ? (isEdit ? "Обновление..." : "Создание...")
    : (isEdit ? "Обновить" : "Создать");

  if (isEdit && multisigLoading && !multisigInfo) {
    return (
      <Box className="multisigPage" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.root()}>
        ← К списку
      </Button>
      <Typography variant="h4">{title}</Typography>

      {isEdit && multisigInfo ? (
        <Typography variant="body2" color="text.secondary" style={{ marginBottom: 16 }}>
          Мультикошелек: {address}
        </Typography>
      ) : null}

      {isEdit && multisigInfo && preparedUpdate ? (
        /* Confirm phase for update */
        <Box className="newOrderConfirm">
          <Typography className="label">Номер заявки: {preparedUpdate.orderId.toString()}</Typography>
          <Typography className="value">
            К мультикошельку будет отправлена транзакция на обновление конфигурации.
            Далее заявку нужно подтвердить другим подписантам.
          </Typography>
          {err ? <Typography color="error">{err}</Typography> : null}
          <Box className="multisigHeaderButtons">
            <Button variant="outlined" disabled={sending} onClick={() => setPreparedUpdate(null)}>
              Отмена
            </Button>
            <Button variant="contained" disabled={sending} onClick={onSend}>
              {sending ? "Отправка..." : "Подтвердить"}
            </Button>
          </Box>
        </Box>
      ) : (
        /* Fill phase */
        <>
          {isEdit && multisigInfo ? (
            <Box className="newOrderField">
              <Typography className="label">Номер заявки:</Typography>
              <input
                className="newOrderInput"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                inputMode="numeric"
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </Box>
          ) : null}

          <Box className="newOrderField">
            <Typography className="label">Порог (число подписантов для подтверждения):</Typography>
            <input
              className="newOrderInput"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              inputMode="numeric"
              placeholder={"1 … " + signers.length}
            />
          </Box>

          <Box className="multisigSection">
            <Typography className="label">Подписанты:</Typography>
            {signers.map((s, i) => (
              <Box className="address-input" key={i}>
                <span className="address-input-num">#{i + 1}.</span>
                <input
                  className="newOrderInput"
                  value={s}
                  onChange={(e) => setSigner(i, e.target.value)}
                />
                <button
                  onClick={() => removeSigner(i)}
                  disabled={signers.length <= 1}
                >
                  —
                </button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addSigner}>
              + Подписант
            </Button>
          </Box>

          <Box className="multisigSection">
            <Typography className="label">Инициаторы (необязательно):</Typography>
            {proposers.map((p, i) => (
              <Box className="address-input" key={i}>
                <span className="address-input-num">#{i + 1}.</span>
                <input
                  className="newOrderInput"
                  value={p}
                  onChange={(e) => setProposer(i, e.target.value)}
                />
                <button onClick={() => removeProposer(i)}>—</button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addProposer}>
              + Инициатор
            </Button>
          </Box>

          {err ? <Typography color="error">{err}</Typography> : null}

          <Box className="multisigHeaderButtons">
            <Button variant="outlined" onClick={() => multisigPage.root()}>
              Назад
            </Button>
            <Button variant="contained" onClick={onSubmit} disabled={sending}>
              {submitLabel}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
