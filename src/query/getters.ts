import { QueryKey, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  releaseMode,
  QueryKeys,
  IS_DEV,
  PROD_TEST_DAOS,
  REFETCH_INTERVALS,
  BLACKLISTED_PROPOSALS,
  CLIENT_V4_ENDPOINT,
} from "config";
import { Dao, Proposal } from "types";
import _ from "lodash";
import {
  getClientV4,
  getDaoMetadata,
  getSingleVoterPower,
  getDaoState,
  getRegistryState,
} from "ton-vote-contracts-sdk";
import { getClientV2 } from "../tonRpc";
import {
  getIsOneWalletOneVote,
  getProposalSymbol,
  getVoteStrategyType,
  isProposalWhitelisted,
  Logger,
  nFormatter,
} from "utils";
import { useSyncStore, useVotePersistedStore, useVoteStore } from "store";
import { contract } from "contract";
import { useCurrentRoute, useDevFeatures } from "hooks/hooks";
import { Address, fromNano } from "ton-core";
import { mock } from "mock/mock";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { routes, toAbs } from "consts";
import {
  getIsServerUpToDate,
  syncDaoFromChain,
  useDaoNewProposals,
  useIsDaosUpToDate,
  useNewDaoAddresses,
  verifyDaoWithChain,
} from "./hooks";
import { api } from "api";
import { useMemo, useCallback, useState } from "react";
import { lib } from "lib";
import { getProposalDescription } from "data/foundation/proposals-descriptions";

const BLAGO_JETTON_ADDRESS = "EQBlaryI1HCY6hIlW9giBoqKGtuMHfxlULZOhD6UyzpqLcll";

const toRaw = (address?: string) => {
  if (!address) return "";
  try {
    return Address.parse(address).toRawString();
  } catch {
    return address;
  }
};

const getWalletVariants = (address?: string) => {
  if (!address) return [];
  try {
    const parsed = Address.parse(address);
    return _.uniq([
      address,
      parsed.toRawString(),
      parsed.toString({ urlSafe: true, bounceable: true }),
      parsed.toString({ urlSafe: true, bounceable: false }),
    ]);
  } catch {
    return [address];
  }
};

const normalizeStrategyAddresses = (
  proposal?: Proposal | null
): Proposal | null | undefined => {
  if (!proposal?.metadata?.votingPowerStrategies) return proposal;

  const metadata = _.cloneDeep(proposal.metadata);
  metadata.votingPowerStrategies = metadata.votingPowerStrategies.map(
    (strategy) => ({
      ...strategy,
      arguments: (strategy.arguments || []).map((arg) => {
        if (arg.name === "jetton-address" || arg.name === "nft-address") {
          const value =
            arg.name === "jetton-address" && !arg.value
              ? BLAGO_JETTON_ADDRESS
              : arg.value;
          return { ...arg, value: toRaw(value) };
        }
        return arg;
      }),
    })
  );

  return { ...proposal, metadata };
};

export const useRegistryStateQuery = () => {
  const clients = useGetClients().data;
  return useQuery(
    [QueryKeys.REGISTRY_STATE],
    async () => {
      const result = await getRegistryState(clients!.clientV2, releaseMode);

      return {
        ...result,
        deployAndInitDaoFee: result
          ? fromNano(result!.deployAndInitDaoFee)
          : "",
      };
    },
    {
      enabled: !!clients?.clientV2,
    }
  );
};

export const useDaoStateQuery = (daoAddress?: string) => {
  const clients = useGetClients().data;
  return useQuery(
    [QueryKeys.DAO_STATE],
    async () => {
      if (mock.isMockDao(daoAddress!))
        return {
          registry: "",
          owner: "EQDehfd8rzzlqsQlVNPf9_svoBcWJ3eRbz-eqgswjNEKRIwo",
          proposalOwner: "EQDehfd8rzzlqsQlVNPf9_svoBcWJ3eRbz-eqgswjNEKRIwo",
          metadata: "",
          daoIndex: 2,
          fwdMsgFee: 2,
        };
      const result = await getDaoState(clients!.clientV2, daoAddress!);
      return {
        ...result,
        fwdMsgFee: fromNano(result!.fwdMsgFee),
      };
    },
    {
      enabled: !!clients?.clientV2 && !!daoAddress,
    }
  );
};

export const useDaosQuery = () => {
  const devFeatures = useDevFeatures();
  const queryClient = useQueryClient();

  const handleNewDaoAddresses = useNewDaoAddresses();
  const handleDaosUpToDate = useIsDaosUpToDate();
  const route = useCurrentRoute();

  const config = useMemo(() => {
    return {
      staleTime: 10_000,
      refetchInterval:
        route === toAbs(routes.spaces) ? REFETCH_INTERVALS.daos : undefined,
    };
  }, [route]);

  // фоновая сверка списка с цепочкой обновляет кэш по мере готовности каждого
  // ДАО, чтобы пользователь видел актуальные название/иконку без перезагрузки
  const queueDaoCorrection = useCallback(
    (correctedDao: Dao) => {
      queryClient.setQueryData<Dao[]>(
        [QueryKeys.DAOS, devFeatures],
        (prev = []) =>
          prev.map((dao) =>
            dao.daoAddress === correctedDao.daoAddress
              ? correctedDao
              : dao
          )
      );
    },
    [queryClient, devFeatures]
  );

  return useQuery(
    [QueryKeys.DAOS, devFeatures],
    async ({ signal }) => {
      const payload = (await api.getDaos(signal)) || [];

      const prodDaos = await handleDaosUpToDate(payload, queueDaoCorrection);

      // add mock daos if dev mode
      let daos = IS_DEV ? _.concat(prodDaos, mock.daos) : prodDaos;

      // add new dao addresses, if exist in local storage
      daos = await handleNewDaoAddresses(daos);

      if (!devFeatures) {
        daos = _.filter(
          daos,
          (it) => !PROD_TEST_DAOS.includes(it.daoAddress)
        );
      }
      return daos;
    },
    {
      refetchInterval: config.refetchInterval,
      staleTime: 60_000,
      retry: 1,
    }
  );
};

const DAO_SYNC_TIMEOUT_MS = 15_000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// фоновая сверка ДАО с цепочкой: возвращает актуализированные роли и метаданные
const syncDaoWithChain = async (
  daoAddress: string,
  serverDao: Dao,
  force: boolean,
  daoProposals: string[],
  onUpToDate?: () => void
): Promise<Dao | null> => {
  try {
    const client = await getClientV2();

    const verification = await withTimeout(
      verifyDaoWithChain(daoAddress, serverDao, force, client),
      DAO_SYNC_TIMEOUT_MS
    );

    if (verification.isUpToDate) {
      onUpToDate?.();
      return null;
    }

    if (verification.chainMetadataAddress) {
      const synced = await withTimeout(
        syncDaoFromChain(serverDao, verification, client),
        DAO_SYNC_TIMEOUT_MS
      );

      return {
        ...synced,
        daoProposals,
      };
    }

    return null;
  } catch (error) {
    Logger("Failed to sync DAO with chain:", error);
    return null;
  }
};

export const useDaoQuery = (daoAddress: string) => {
  const addNewProposals = useDaoNewProposals();
  const { getDaoUpdateMillis, removeDaoUpdateMillis } = useSyncStore();
  const route = useCurrentRoute();

  const config = useMemo(() => {
    const isProposalRoute =
      route === toAbs(routes.proposal) || route === toAbs(routes.proposalLegacy);
    return {
      staleTime: isProposalRoute ? Infinity : 5_000,
      refetchInterval:
        isProposalRoute ? undefined : REFETCH_INTERVALS.dao,
    };
  }, [route]);

  // страницы, где роли и метаданные ДАО видны пользователю:
  // страница ДАО, «О ДАО», настройки и страница голосования
  const shouldSynchronizeWithChain = useMemo(
    () =>
      route === toAbs(routes.space) ||
      route === toAbs(routes.spaceAbout) ||
      route === toAbs(routes.spaceSettings) ||
      route === toAbs(routes.proposal) ||
      route === toAbs(routes.proposalLegacy),
    [route]
  );

  const queryClient = useQueryClient();
  const key = [QueryKeys.DAO, daoAddress];
  return useQuery<Dao | null>(
    key,
    async ({ signal }) => {
      const mockDao = mock.isMockDao(daoAddress!);
      if (mockDao) {
        return {
          ...mockDao,
          daoProposals: mock.proposalAddresses,
        };
      }

      const metadataLastUpdate = getDaoUpdateMillis(daoAddress!);

      const getDaoFromContract = () => contract.getDao(daoAddress);

      // данные ДАО и список предложений сначала берём из API — страница ДАО
      // рендерится сразу, а сверка с цепочкой выполняется фоном и не блокирует её.
      // Исключение — непосредственно после ончейн-обновления метаданных/ролей
      // (задан metadataLastUpdate): индексёр может ещё отдавать старые данные,
      // поэтому новую информацию (название, описание и т.п.) читаем с цепочки,
      // чтобы она отображалась сразу, а не после фоновой сверки.
      let dao: Dao | undefined;
      if (metadataLastUpdate) {
        try {
          dao = await getDaoFromContract();
        } catch (error) {
        }
      }

      if (!dao) {
        try {
          // api.getDao сам повторяет запрос внутри (async-retry), поэтому
          // дублировать вызов здесь не нужно
          dao = await api.getDao(daoAddress!, signal);
        } catch (error) {
        }
      }

      if (!dao && !metadataLastUpdate) {
        try {
          dao = await getDaoFromContract();
        } catch (error) {
        }
      }

      // try to return dao from cache
      if (!dao) {
        dao = queryClient.getQueryData<Dao>(key) || undefined;
      }

      if (!dao) {
        throw new Error("DAO not found");
      }

      // метаданные и роли из API могут отставать от цепочки (индексёр ещё не
      // подхватил ончейн-обновление) — сверяемся с цепочкой и при расхождении
      // сразу подставляем актуальные данные (название, описание и т.п.),
      // а не ждём фоновой сверки
      if (!mock.isMockDao(daoAddress!)) {
        try {
          const client = await getClientV2();
          const verification = await verifyDaoWithChain(
            daoAddress!,
            dao,
            true,
            client
          );
          if (!verification.isUpToDate && verification.chainMetadataAddress) {
            const metadataArgs = await getDaoMetadata(
              client,
              verification.chainMetadataAddress
            );
            dao = {
              ...dao,
              daoRoles: {
                owner: verification.chainOwner,
                proposalOwner: verification.chainProposalOwner,
              },
              daoMetadata: {
                metadataAddress: verification.chainMetadataAddress,
                metadataArgs,
              },
            };
          }
        } catch (error) {
          Logger("Failed to reconcile DAO with chain:", error);
        }
      }

      let proposalAddresses = dao.daoProposals ? [...dao.daoProposals] : [];

      // если индексёр вернул пустой список предложений (например, при отставании
      // индексации), пробуем получить его из второго источника — /daos.
      // Перечисление с цепочки здесь не подходит: для части ДАО (включая
      // «Градосферу») get-method get_proposal_address падает на отдельных
      // идентификаторах (exit_code -13), и полный список собрать нельзя.
      if (!_.size(proposalAddresses)) {
        try {
          const daos = (await api.getDaos(signal)) || [];
          const entry = _.find(
            daos,
            (it) => toRaw(it.daoAddress) === toRaw(daoAddress!)
          );
          if (entry?.daoProposals?.length) {
            proposalAddresses = entry.daoProposals;
          }
        } catch (error) {
        }
      }

      let daoProposals = addNewProposals(daoAddress!, proposalAddresses);
      daoProposals = IS_DEV
        ? _.concat(daoProposals, mock.proposalAddresses)
        : daoProposals;

      daoProposals = _.filter(
        daoProposals,
        (it) => !BLACKLISTED_PROPOSALS.includes(it)
      );

      const result: Dao = {
        ...dao,
        daoProposals,
      };

      // сверка с цепочкой не блокирует рендер: обновлённые роли и метаданные
      // попадают в кэш и подхватываются интерфейсом позже
      if (shouldSynchronizeWithChain) {
        syncDaoWithChain(
          daoAddress!,
          dao,
          !!metadataLastUpdate,
          daoProposals,
          () => {
            if (metadataLastUpdate) {
              removeDaoUpdateMillis(daoAddress!);
            }
          }
        )
          .then((syncedDao) => {
            if (syncedDao) {
              queryClient.setQueryData<Dao>(key, syncedDao);
            }
          })
          .catch(() => undefined);
      }

      return result;
    },
    {
      staleTime: config.staleTime,
      refetchInterval: config.refetchInterval,
      enabled: !!daoAddress,
      retry: false,
    }
  );
};

export const useGetClients = () => {
  return useQuery(
    [QueryKeys.CLIENTS],
    async () => {
      return {
        clientV2: await getClientV2(),
        // avoid unstable auto-routed gateways for snapshot calls
        clientV4: await getClientV4(CLIENT_V4_ENDPOINT),
      };
    },
    {
      staleTime: Infinity,
    }
  );
};

export const useConnectedWalletVotingPowerQuery = (
  proposal?: Proposal | null,
  proposalAddress?: string,
  disabled?: boolean
) => {
  const connectedWallet = useTonAddress();
  const clients = useGetClients().data;
  return useQuery(
    [QueryKeys.SIGNLE_VOTING_POWER, connectedWallet, proposalAddress],
    async ({ signal }) => {
      const normalizedProposal = normalizeStrategyAddresses(proposal);
      const allNftHolders = await lib.getAllNFTHolders(
        proposalAddress!,
        normalizedProposal?.metadata!,
        signal
      );
      Logger(`Fetching voting power for account: ${connectedWallet}`);

      const strategy = getVoteStrategyType(
        normalizedProposal?.metadata?.votingPowerStrategies
      );

      const wallets = getWalletVariants(connectedWallet);
      let result = "0";
      let hasSuccessfulQuery = false;
      for (const wallet of wallets) {
        try {
          const current = await getSingleVoterPower(
            clients!.clientV4,
            wallet,
            normalizedProposal?.metadata!,
            strategy,
            allNftHolders
          );
          hasSuccessfulQuery = true;
          result = current;
          if (Number(current) > 0) break;
        } catch (error) {
          Logger("getSingleVoterPower failed for wallet format", wallet, error);
          continue;
        }
      }

      if (!hasSuccessfulQuery) {
        throw new Error("Failed to fetch voting power from RPC");
      }

      const symbol = getProposalSymbol(
        normalizedProposal?.metadata?.votingPowerStrategies
      );

      if (
        getIsOneWalletOneVote(normalizedProposal?.metadata?.votingPowerStrategies)
      ) {
        return {
          votingPower: result,
          votingPowerText: `${nFormatter(Number(result))} ${symbol}`,
        };
      }

      return {
        votingPowerText: `${nFormatter(Number(fromNano(result)))} ${symbol}`,
        votingPower: result,
      };
    },
    {
      enabled:
        !!connectedWallet && !!proposal && !!proposalAddress && !disabled,
      staleTime: Infinity,
    }
  );
};

interface ProposalQueryArgs {
  disabled?: boolean;
  isCustomEndpoint?: boolean;
}

const useGetProposalWithFallback = (proposalAddress: string) => {
  const queryClient = useQueryClient();
  const { getProposalUpdateMillis, removeProposalUpdateMillis } =
    useSyncStore();

  return async (key: QueryKey, maxLt?: string, signal?: AbortSignal) => {
    const getProposalFromContract = () =>
      contract.getProposal({ proposalAddress, maxLt });
    const enrichWithOneWalletOneVoteFallback = async (
      proposal?: Proposal | null
    ) => {
      if (!proposal) return proposal;
      const isOneWalletOneVote = getIsOneWalletOneVote(
        proposal.metadata?.votingPowerStrategies
      );
      if (!isOneWalletOneVote || _.size(proposal.votes)) return proposal;

      const fallback = await contract.getOneWalletOneVoteFallback(
        proposalAddress,
        proposal.metadata
      );
      if (!fallback?.votes.length) return proposal;

      return {
        ...proposal,
        votes: fallback.votes,
        proposalResult: fallback.proposalResult,
      } as Proposal;
    };
    const shouldForceContractRefresh = (proposal?: Proposal | null) => {
      if (!proposal) return false;
      const isOneWalletOneVote = getIsOneWalletOneVote(
        proposal.metadata?.votingPowerStrategies
      );
      return isOneWalletOneVote && !_.size(proposal.votes);
    };

    const isMetadataUpToDateInServer = await getIsServerUpToDate(
      getProposalUpdateMillis(proposalAddress)
    );

    // if updated proposal metadata, and sever is not up to date, get proposal from contract
    try {
      if (!isMetadataUpToDateInServer) {
        return getProposalFromContract();
      } else {
        removeProposalUpdateMillis(proposalAddress);
      }
    } catch (error) {
    }

    let proposal;

    // try to fetch proposal from server

    try {
      proposal = await api.getProposal(proposalAddress!, signal);
      if (shouldForceContractRefresh(proposal)) {
        const fromContract = await getProposalFromContract();
        if (fromContract && _.size(fromContract.votes)) {
          proposal = fromContract;
        }
      }
      proposal = await enrichWithOneWalletOneVoteFallback(proposal);
    } catch (error) {
    }
    // try to fetch proposal from contract
    if (!proposal) {
      try {
        proposal = await getProposalFromContract();
      } catch (error) {
      }
    }
    proposal = await enrichWithOneWalletOneVoteFallback(proposal);
    // failed to fetch proposal from server and contract

    if (!proposal) {
      proposal = queryClient.getQueryData<Proposal | undefined>(key);
    }
    
    proposal = {
      ...proposal,
      metadata: {
        ...proposal?.metadata,
        description: getProposalDescription(
          proposalAddress!,
          proposal?.metadata?.description
        ),
      },
    } as Proposal;
    return proposal;
  };
};

export const useProposalQuery = (
  proposalAddress: string,
  args?: ProposalQueryArgs
) => {
  const votePersistStore = useVotePersistedStore();
  const { getProposalUpdateMillis, removeProposalUpdateMillis } =
    useSyncStore();
  const { isVoting } = useVoteStore();
  const key = [QueryKeys.PROPOSAL, proposalAddress];
  const isWhitelisted = isProposalWhitelisted(proposalAddress);
  const [error, setError] = useState(false);
  const route = useCurrentRoute();

  const getProposalWithFallback = useGetProposalWithFallback(proposalAddress);

  const config = useMemo(() => {
    const isProposalRoute =
      route === toAbs(routes.proposal) || route === toAbs(routes.proposalLegacy);
    return {
      refetchInterval: isProposalRoute ? 15_000 : 30_000,
    };
  }, [route]);

  const queryClient = useQueryClient();

  return useQuery(
    key,
    async ({ signal }) => {
      if (!isWhitelisted) {
        throw new Error("Proposal not whitelisted");
      }

      if (BLACKLISTED_PROPOSALS.includes(proposalAddress)) {
        throw new Error("Proposal not found");
      }
      const mockProposal = mock.getMockProposal(proposalAddress!);
      if (mockProposal) {
        return mockProposal;
      }

      if (isVoting) {
        return queryClient.getQueryData<Proposal | undefined>(key) || null;
      }
      const currentProposal = queryClient.getQueryData<Proposal | undefined>(
        key
      );

      const votePersistValues = votePersistStore.getValues(proposalAddress!);

      // maxLtAfterVote is maxLt after voting
      const maxLtAfterVote = votePersistValues.maxLtAfterVote;

      const maxLt = maxLtAfterVote || currentProposal?.maxLt;

      const proposal = await getProposalWithFallback(key, maxLt, signal);

      if (!proposal) {
        // proposal not found in cache, throw error
        throw new Error("Proposal not found");
      }

      //  if proposal is up to date, return proposal, and clear local storage stored values

      const serverMaxLtUpToDate =
        Number(proposal?.maxLt) >= Number(maxLtAfterVote);
      const persistedResult = votePersistValues.results;
      const persistedVote = votePersistValues.vote;

      if (
        !maxLtAfterVote ||
        serverMaxLtUpToDate ||
        !persistedResult ||
        !persistedVote
      ) {
        votePersistStore.resetValues(proposalAddress!);

        return proposal;
      }

      Logger(
        `server proposal is not up to date, getting results and vote from local storage, proposal maxLt: ${proposal?.maxLt}, latestMaxLtAfterTx: ${maxLtAfterVote}`
      );

      // if maxLtAfterVote greater then proposal maxLt, that means that user voted, and
      // we need to get his vote and proposal result from local storage, because server is not up to date

      const filteredVotes = _.filter(
        proposal.votes,
        (it) => it.address !== persistedVote.address
      );

      return {
        ...proposal,
        proposalResult: persistedResult,
        votes: _.orderBy(
          [persistedVote, ...filteredVotes],
          "timestamp",
          "desc"
        ),
      };
    },
    {
      onError: (error: Error) => {
        setError(true);
      },
      refetchOnReconnect: false,
      enabled: !!proposalAddress && !args?.disabled,
      staleTime: Infinity,
      refetchInterval: error
        ? 0
        : isWhitelisted
        ? config.refetchInterval
        : undefined,
      retry: 0,
    }
  );
};

export const useWalletsQuery = () => {
  const [tonConnectUI] = useTonConnectUI();
  return useQuery(["useWalletsQuery"], () => tonConnectUI.getWallets(), {
    staleTime: Infinity,
    enabled: !!tonConnectUI,
  });
};

export const useJettonMetadata = (address?: string) => {
  return useQuery(
    [QueryKeys.JETTON_METADATA, address],
    async ({ signal }) => {
      if (!address) return undefined;
      return api.getJettonMetadata(address, signal);
    },
    {
      enabled: !!address,
      staleTime: Infinity,
      retry: 1,
    }
  );
};
