import { Box, Button, Typography } from "@mui/material";
import "./multisig.css";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Address } from "@ton/core";
import { useMyAddress } from "multisig/useMyAddress";
import { useMultisigSendTransaction } from "multisig/useMultisigSendTransaction";
import { useAppNavigation } from "router/navigation";
import { prepareCreateMultisig } from "multisig/orders";
import { IS_TESTNET } from "multisig/constants";
import {
  validateUserFriendlyAddress,
  addressToString,
} from "multisig/utils/utils";

export default function CreateMultisig() {
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { send, sending } = useMultisigSendTransaction();

  const [signers, setSigners] = useState<string[]>([""]);
  const [proposers, setProposers] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (myAddress && signers.length === 1 && signers[0] === "") {
      setSigners([addressToString({ address: myAddress, isBounceable: true, isTestOnly: IS_TESTNET })]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAddress]);

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
    } catch (e: any) {
      setErr(e?.message || "Ошибка отправки");
    }
  }, [myAddress, threshold, signers, proposers, send, multisigPage]);

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.root()}>
        ← К списку
      </Button>
      <Typography variant="h4">Создать мультикошелек</Typography>

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
          {sending ? "Создание..." : "Создать"}
        </Button>
      </Box>
    </Box>
  );
}
