import { useQuery } from "@tanstack/react-query";
import {
  BLAGO_JETTON_ADDRESS,
  BLAGO_JETTON_DECIMALS,
  IS_TESTNET,
} from "multisig/constants";
import { fetchJettonBalance } from "multisig/utils/MultisigRegistry";

export function useDaoBlagoBalance(daoAddress: string | undefined): string {
  return useQuery({
    queryKey: ["daoBlagoBalance", daoAddress],
    async queryFn() {
      if (!daoAddress) return "";
      return fetchJettonBalance(BLAGO_JETTON_ADDRESS, daoAddress, IS_TESTNET);
    },
    enabled: !!daoAddress,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  }).data ?? "";
}
