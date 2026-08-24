import { useTonAddress } from "@tonconnect/ui-react";
import { Address } from "@ton/core";
import { useMemo } from "react";

/** Адрес подключённого кошелька как @ton/core Address (или null). */
export const useMyAddress = (): Address | null => {
  const raw = useTonAddress();
  return useMemo(() => (raw ? Address.parse(raw) : null), [raw]);
};
