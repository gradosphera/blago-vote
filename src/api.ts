import axios from "axios";
import _ from "lodash";
import { Dao, Proposal, ProposalResults, RawVotes, VotingPower } from "types";
import { Logger, parseVotes } from "utils";
import { API_RETRIES } from "config";
import retry from "async-retry";

// Для локальной разработки используем относительный путь —
// Vite проксирует запросы к https://api.ton.vote.
// import.meta.env.DEV — правильное условие для Vite (process.env недоступен
// в браузере, поэтому условие выше всегда false в dev-режиме).
const baseURL = import.meta.env.DEV ? "" : "https://api.ton.vote";

// индексёр может отвечать очень долго (минуты), поэтому каждый запрос
// ограничен таймаутом, а повторы делает только async-retry ниже
const axiosInstance = axios.create({
  baseURL,
  timeout: 12_000,
});

const getDaos = async (signal?: AbortSignal): Promise<Dao[]> => {
  Logger("Fetching daos from server");
  return (await axiosInstance.get(`/daos`, { signal })).data;
};

const getAllNftHolders = async (
  proposalAddress: string,
  signal?: AbortSignal
): Promise<{ [key: string]: string[] }> => {
  const promise = async (bail: any, attempt: number) => {
    try {
      const res = await axiosInstance.get(`/nftHolders/${proposalAddress}`, {
        signal,
      });

      if (_.isEmpty(res.data)) {
        throw new Error("getAllNftHolders not found in server");
      }

      return res.data;
    } catch (error) {
      if (attempt === API_RETRIES + 1) {
        Logger("Failed to fetch getAllNftHolders from server");
      }
      throw new Error(error instanceof Error ? error.message : "");
    }
  };
  return retry(promise, { retries: API_RETRIES });
};

const getProposal = async (
  proposalAddress: string,
  signal?: AbortSignal
): Promise<Proposal | undefined> => {
  const promise = async (bail: any, attempt: number) => {
    try {
      Logger(
        `Fetching proposal from server, address: ${proposalAddress}, attempt: ${attempt}`
      );

      const [result, maxLt] = await Promise.all([
        axiosInstance.get(`/proposal/${proposalAddress}`, {
          signal,
        }),
        getMaxLt(proposalAddress, signal),
      ]);

      if (_.isEmpty(result.data?.metadata)) {
        throw new Error("proposal not found in server");
      }

      const proposal: Proposal = {
        ...result.data,
        votes: parseVotes(result.data.votes, result.data.votingPower),
        maxLt,
        rawVotes: result.data.votes,
      };

      return proposal;
    } catch (error) {
      if (attempt === API_RETRIES + 1) {
        Logger("Failed to fetch proposal from server");
      }
      throw new Error(error instanceof Error ? error.message : "");
    }
  };
  return retry(promise, { retries: API_RETRIES });
};

const serverVersion = async () => {
  return (await axiosInstance.get("/version")).data;
};

const getMaxLt = async (
  proposalAddress: string,
  signal?: AbortSignal
): Promise<string> => {
  return (await axiosInstance.get(`/maxLt/${proposalAddress}`, { signal }))
    .data;
};

const getDao = async (
  daoAddress: string,
  signal?: AbortSignal
): Promise<Dao | undefined> => {
  const promise = async (bail: any, attempt: number) => {
    try {
      Logger(
        `Fetching dao from server, address ${daoAddress}, attempt: ${attempt}`
      );
      const data = (await axiosInstance.get(`/dao/${daoAddress}`, { signal }))
        .data;

      if (_.isEmpty(data)) {
        throw new Error("dao not found in server");
      }
      return data;
    } catch (error) {
      if (attempt === API_RETRIES + 1) {
        Logger("dao not found is server");
      }

      throw new Error(error instanceof Error ? error.message : "");
    }
  };

  return retry(promise, { retries: API_RETRIES });
};

const geOperatingValidatorsInfo = async (address: string) => {
  const res = await axiosInstance.get(`/operatingValidatorsInfo/${address}`);
  return res.data;
};

const getUpdateTime = async (): Promise<number> => {
  const res = await axiosInstance.get("/updateTime");
  return res.data;
};

export type JettonDisplayMetadata = {
  name?: string;
  symbol?: string;
  image?: string;
  decimals?: string;
};

const getJettonMetadata = async (
  address: string,
  signal?: AbortSignal
): Promise<JettonDisplayMetadata | undefined> => {
  try {
    const res = await axios.get(`https://tonapi.io/v2/jettons/${address}`, {
      signal,
      timeout: 12_000,
    });
    const metadata = res.data?.metadata;
    if (!metadata) return undefined;
    return {
      name: metadata.name,
      symbol: metadata.symbol,
      // preview — CDN TonAPI, стабильнее raw github/ipfs ссылок из metadata.image
      image: res.data?.preview || metadata.image,
      decimals: metadata.decimals,
    };
  } catch (error) {
    Logger(`Failed to fetch jetton metadata for ${address}`);
    return undefined;
  }
};

export const api = {
  getDaos,
  getProposal,
  getMaxLt,
  getDao,
  getAllNftHolders,
  getUpdateTime,
  serverVersion,
  geOperatingValidatorsInfo,
  getJettonMetadata,
};

export interface GetStateApiPayload {
  votes: RawVotes;
  votingPower: VotingPower;
  results: ProposalResults;
  maxLt: string;
}
