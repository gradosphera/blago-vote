import { Box, Button, Typography, CircularProgress, MenuItem, Select } from "@mui/material";
import "./multisig.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Address, fromNano } from "@ton/core";
import { useMultisigInfo } from "multisig/useMultisigInfo";
import { useMyAddress } from "multisig/useMyAddress";
import { useMultisigSendTransaction } from "multisig/useMultisigSendTransaction";
import { useAppNavigation } from "router/navigation";
import { AddressLink } from "./Avatar";
import { addressToString, AddressInfo } from "multisig/utils/utils";
import { getOrderTypes, validateOrderField } from "multisig/orderTypes";
import { prepareNewOrder, PreparedNewOrder } from "multisig/orders";
import { IS_TESTNET } from "multisig/constants";
import { LOCK_TYPES, lockTypeToDescription } from "multisig/jetton/JettonMinter";

interface PrefillState {
  orderType?: string;
  values?: { [key: string]: any };
}

export default function NewOrder() {
  const { address } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const { send, sending } = useMultisigSendTransaction();
  const { info, loading } = useMultisigInfo(address);

  const prefill = (location.state as PrefillState) || undefined;

  const orderTypes = useMemo(
    () => (info ? getOrderTypes({ isTestnet: IS_TESTNET, multisigInfo: info }) : []),
    [info],
  );

  const [orderTypeIndex, setOrderTypeIndex] = useState(0);
  const [fields, setFields] = useState<{ [key: string]: string }>({});
  const [orderId, setOrderId] = useState<string>("");
  const [prepared, setPrepared] = useState<PreparedNewOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Инициализация: префилл из голосования + дефолтный orderId.
  useEffect(() => {
    if (!info || orderTypes.length === 0) return;
    if (prefill?.orderType) {
      const idx = orderTypes.findIndex((t) => t.name === prefill.orderType);
      if (idx >= 0) setOrderTypeIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, orderTypes.length]);

  useEffect(() => {
    if (!info) return;
    const initial: { [key: string]: string } = {};
    for (const fieldId in orderTypes[orderTypeIndex].fields) {
      const f = orderTypes[orderTypeIndex].fields[fieldId];
      let v = "";
      const pv = prefill?.values?.[fieldId];
      if (pv !== undefined) {
        if (f.type === "Address") {
          v =
            typeof pv === "string"
              ? pv
              : addressToString(pv as AddressInfo);
        } else {
          v = String(pv);
        }
      }
      initial[fieldId] = v;
    }
    setFields(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeIndex, info, prefill]);

  useEffect(() => {
    if (!info) return;
    if (orderId !== "") return;
    if (info.lastOrders.length === 0) setOrderId("1");
    else {
      let highest = -1n;
      info.lastOrders.forEach((o: { order?: { id: bigint } }) => {
        if (o.order && o.order.id > highest) highest = o.order.id;
      });
      setOrderId(highest === -1n ? "" : (highest + 1n).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  if (!address) {
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
  if (!info) return null;

  const orderType = orderTypes[orderTypeIndex];
  const isMe =
    info.signers.some((s: { address: Address }) => s.address.equals(myAddress!)) ||
    info.proposers.some((s: { address: Address }) => s.address.equals(myAddress!));

  const onTypeChange = (idx: number) => {
    setOrderTypeIndex(idx);
    setErr(null);
  };

  const validateAll = (): { [key: string]: any } | null => {
    const values: { [key: string]: any } = {};
    for (const fieldId in orderType.fields) {
      const field = orderType.fields[fieldId];
      const validated = validateOrderField(
        field.name,
        fields[fieldId] ?? "",
        field.type,
        IS_TESTNET,
      );
      if (validated.error) {
        setErr(validated.error);
        return null;
      }
      values[fieldId] = validated.value;
    }
    return values;
  };

  const onCreate = async () => {
    setErr(null);
    if (!myAddress) {
      setErr("Пожалуйста, подключите кошелёк");
      return;
    }
    const oid = BigInt(orderId);
    if (oid < 0n) {
      setErr("Неверный номер заявки");
      return;
    }
    const values = validateAll();
    if (!values) return;

    try {
      const prepared = await prepareNewOrder({
        multisigInfo: info,
        isTestnet: IS_TESTNET,
        orderId: oid,
        orderTypeIndex,
        values,
        myAddress,
      });
      setPrepared(prepared);
    } catch (e: any) {
      setErr(e?.message || "Ошибка подготовки заявки");
    }
  };

  const onSend = async () => {
    if (!prepared) return;
    try {
      await send({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [prepared.message],
      });
      multisigPage.order(address!, prepared.orderId);
    } catch (e: any) {
      setErr(e?.message || "Ошибка отправки");
      setPrepared(null);
    }
  };

  const parsedAddress = Address.parseFriendly(address);
  parsedAddress.isBounceable = true;
  parsedAddress.isTestOnly = IS_TESTNET;

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.address(address!)}>
        ← К мультикошельку
      </Button>
      <Typography variant="h4">Новая заявка</Typography>
      <Typography className="multisigCardAddress">
        <AddressLink address={parsedAddress} />
      </Typography>

      {prepared ? (
        <Box className="newOrderConfirm">
          <Typography className="label">Подтвердите отправку заявки #{prepared.orderId.toString()}</Typography>
          <Typography className="value">
            К мультикошельку будет отправлена транзакция на {fromNano(BigInt(prepared.message.amount))} TON
            с телом заявки. Далее заявку нужно подтвердить другим подписантам.
          </Typography>
          {err ? <Typography color="error">{err}</Typography> : null}
          <Box className="multisigHeaderButtons">
            <Button variant="outlined" disabled={sending} onClick={() => setPrepared(null)}>
              Отмена
            </Button>
            <Button variant="contained" disabled={sending} onClick={onSend}>
              {sending ? "Отправка..." : "Отправить транзакцию"}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box className="newOrderForm">
          {!isMe ? (
            <Typography color="error">
              Вы не являетесь подписантом или инициатором этого мультикошелька
            </Typography>
          ) : null}

          <Box className="newOrderField">
            <Typography className="label">Тип заявки:</Typography>
            <Select
              value={orderTypeIndex}
              onChange={(e) => onTypeChange(Number(e.target.value))}
              fullWidth
            >
              {orderTypes.map((t, i) => (
                <MenuItem key={i} value={i}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box className="newOrderField">
            <Typography className="label">Номер заявки:</Typography>
            <input
              className="newOrderInput"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              inputMode="numeric"
            />
          </Box>

          {Object.keys(orderType.fields).map((fieldId) => {
            const field = orderType.fields[fieldId];
            return (
              <Box className="newOrderField" key={fieldId}>
                <Typography className="label">{field.name}:</Typography>
                {field.type === "Status" ? (
                  <Select
                    value={fields[fieldId] || LOCK_TYPES[0]}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, [fieldId]: e.target.value }))
                    }
                    fullWidth
                  >
                    {LOCK_TYPES.map((lt) => (
                      <MenuItem key={lt} value={lt}>
                        {lockTypeToDescription(lt as any)}
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <input
                    className="newOrderInput"
                    value={fields[fieldId] || ""}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, [fieldId]: e.target.value }))
                    }
                  />
                )}
              </Box>
            );
          })}

          {err ? <Typography color="error">{err}</Typography> : null}

          <Box className="multisigHeaderButtons">
            <Button variant="outlined" onClick={() => multisigPage.address(address!)}>
              Назад
            </Button>
            <Button variant="contained" onClick={onCreate} disabled={sending}>
              {sending ? "Проверка..." : "Создать"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
