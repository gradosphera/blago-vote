import { useCallback, useEffect, useRef, useState } from "react";
import { Address } from "@ton/core";
import { checkMultisig, MultisigInfo } from "./multisig/MultisigChecker";
import { MULTISIG_CODE, MULTISIG_ORDER_CODE, IS_TESTNET } from "./constants";

const POLL_INTERVAL_MS = 5000;

/**
 * Загружает MultisigInfo по адресу и обновляет её каждые 5 секунд
 * (порт updateMultisig из gradoshpera-multisig/src/index.ts).
 */
export const useMultisigInfo = (address: string | undefined) => {
  const [info, setInfo] = useState<MultisigInfo | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const currentAddressRef = useRef<string | undefined>(undefined);

  const load = useCallback(
    async (isFirst: boolean) => {
      if (!address) return;
      try {
        const multisigInfo = await checkMultisig(
          Address.parseFriendly(address),
          MULTISIG_CODE,
          MULTISIG_ORDER_CODE,
          IS_TESTNET,
          "aggregate",
          false,
        );
        if (!mountedRef.current || currentAddressRef.current !== address) return;
        setInfo(multisigInfo);
        setError(null);
      } catch (e: any) {
        if (!mountedRef.current || currentAddressRef.current !== address) return;
        if (isFirst) setError(e?.message || "Ошибка загрузки мультикошелька");
      } finally {
        if (mountedRef.current && currentAddressRef.current === address) {
          setLoading(false);
        }
      }
    },
    [address],
  );

  useEffect(() => {
    mountedRef.current = true;
    currentAddressRef.current = address;
    if (!address) {
      setInfo(undefined);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    load(true);
    const id = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [address, load]);

  return { info, loading, error, reload: () => load(true) };
};
