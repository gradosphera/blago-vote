import { useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useState } from "react";
import {
  BRIDGE_CHECK_TIMEOUT_MS,
  SEND_TRANSACTION_TIMEOUT_MS,
  UNREACHABLE_BRIDGE_CACHE_MS,
} from "./constants";

type TonConnectTransaction = Parameters<
  ReturnType<typeof useTonConnectUI>[0]["sendTransaction"]
>[0];

// --- Проверка достижимости bridge-сервера подключённого кошелька ---
// (порт логики из gradoshpera-multisig/src/index.ts:272-348)

const unreachableBridgesCache = new Map<string, number>();

const bridgeUnreachableMessage = (bridgeUrl: string): string => {
  let host = bridgeUrl;
  try {
    host = new URL(bridgeUrl).host;
  } catch (e) {}
  return (
    "Не удалось связаться с bridge-сервером кошелька (" +
    host +
    "). Проверьте интернет-соединение или подключите другой кошелёк."
  );
};

const isBridgeUnreachableError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || error.toString?.() || "";
  return (
    message.indexOf("Failed to fetch") > -1 ||
    message.indexOf("NetworkError") > -1 ||
    message.indexOf("Load failed") > -1 ||
    message.indexOf("ERR_NAME_NOT_RESOLVED") > -1 ||
    message.indexOf("ERR_CONNECTION") > -1 ||
    message.indexOf("ERR_INTERNET_DISCONNECTED") > -1 ||
    message.indexOf("ERR_TIMED_OUT") > -1 ||
    message.indexOf("Network request failed") > -1
  );
};

const checkBridgeReachable = async (bridgeUrl: string): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIDGE_CHECK_TIMEOUT_MS);
  try {
    let origin = bridgeUrl;
    try {
      origin = new URL(bridgeUrl).origin + "/";
    } catch (e) {}
    await fetch(origin, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const getConnectedBridgeUrl = async (
  tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
): Promise<string | null> => {
  const wallet = tonConnectUI.wallet;
  if (!wallet || wallet.provider !== "http") {
    return null;
  }
  try {
    const wallets = await tonConnectUI.getWallets();
    const info = wallets.find((w) => w.appName === wallet.device.appName);
    if (info && "bridgeUrl" in info) {
      return (info as any).bridgeUrl;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};

/**
 * Отправляет транзакцию через TonConnect с таймаутом и предварительной
 * проверкой достижимости bridge подключённого кошелька. Возвращает ошибку,
 * если кошелёк не ответил или bridge недоступен, чтобы UI не блокировался.
 */
export const useMultisigSendTransaction = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (transaction: TonConnectTransaction): Promise<void> => {
      const bridgeUrl = await getConnectedBridgeUrl(tonConnectUI);

      if (bridgeUrl) {
        const cachedFailAt = unreachableBridgesCache.get(bridgeUrl);
        const cachedFresh =
          cachedFailAt !== undefined &&
          Date.now() - cachedFailAt < UNREACHABLE_BRIDGE_CACHE_MS;
        const reachable = cachedFresh
          ? false
          : await checkBridgeReachable(bridgeUrl);
        if (!reachable) {
          unreachableBridgesCache.set(bridgeUrl, Date.now());
          throw new Error(bridgeUnreachableMessage(bridgeUrl));
        }
        unreachableBridgesCache.delete(bridgeUrl);
      }

      let settled = false;
      let timer: any;
      setSending(true);
      try {
        await new Promise<void>((resolve, reject) => {
          timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(
                new Error(
                  "Кошелёк не ответил. Откройте приложение кошелька и подтвердите действие, либо попробуйте ещё раз.",
                ),
              );
            }
          }, SEND_TRANSACTION_TIMEOUT_MS);
          tonConnectUI.sendTransaction(transaction).then(
            () => {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve();
              }
            },
            (error) => {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (bridgeUrl && isBridgeUnreachableError(error)) {
                  reject(new Error(bridgeUnreachableMessage(bridgeUrl)));
                } else {
                  reject(error);
                }
              }
            },
          );
        });
      } finally {
        setSending(false);
      }
    },
    [tonConnectUI],
  );

  return { send, sending };
};
