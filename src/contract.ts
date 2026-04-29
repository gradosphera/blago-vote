import _ from "lodash";
import { TonClient, TonClient4, Transaction } from "ton";
import { Cell } from "ton-core";
import * as TonVoteSDK from "ton-vote-contracts-sdk";
import {
  calcProposalResult,
  filterTxByTimestamp,
  getAllNftHolders,
  getAllVotes,
  getClientV2,
  getClientV4,
  getProposalMetadata,
  getSingleVoterPower,
  getTransactions,
  ProposalMetadata,
  VotingPowerStrategyType,
} from "ton-vote-contracts-sdk";
import { Dao, Proposal } from "types";
import { getVoteStrategyType, isNftProposal, Logger, parseVotes } from "utils";
import retry from "async-retry";
import { CLIENT_V4_ENDPOINT, CONTRACT_RETRIES } from "config";
import { api } from "api";
import axios from "axios";

interface GetProposalArgs {
  clientV2?: TonClient;
  clientV4?: TonClient4;
  proposalAddress: string;
  metadata?: ProposalMetadata;
  maxLt?: string;
}

const VOTE_OPCODE = "0x7c420ea2";

const parseChoiceFromRawBody = (rawBody?: string) => {
  if (!rawBody) return "";
  try {
    const body = Cell.fromBoc(Buffer.from(rawBody, "hex"))[0];
    const slice = body.beginParse();
    slice.loadUint(32);
    // Vote payload stores choice string in the first ref cell.
    if (body.refs?.[0]) {
      return body.refs[0].beginParse().loadStringTail().trim();
    }
    return slice.loadStringTail().trim();
  } catch {
    return "";
  }
};

const getOneWalletOneVoteFallback = async (
  proposalAddress: string,
  metadata: ProposalMetadata
) => {
  const response = await axios.get(
    `https://tonapi.io/v2/blockchain/accounts/${proposalAddress}/transactions?limit=100`
  );
  const txs = response.data?.transactions || [];
  const choices = metadata.votingSystem?.choices || [];
  const choicesByLowerCase = _.keyBy(choices, (it) => it.toLowerCase());
  const votesByAddress: Record<
    string,
    { choice: string; timestamp: number; hash: string }
  > = {};

  _.forEach(txs, (tx: any) => {
    const inMsg = tx?.in_msg;
    if (!inMsg || inMsg.op_code !== VOTE_OPCODE) return;

    const source = inMsg?.source?.address;
    if (!source) return;

    const parsedChoice = parseChoiceFromRawBody(inMsg.raw_body);
    const choice =
      choicesByLowerCase[parsedChoice.toLowerCase()] ||
      _.find(choices, (it) => it.toLowerCase() === parsedChoice.toLowerCase());

    if (!choice) return;

    const timestamp = Number(tx?.utime || inMsg?.created_at || 0);
    const previous = votesByAddress[source];
    if (!previous || timestamp >= previous.timestamp) {
      votesByAddress[source] = {
        choice,
        timestamp,
        hash: inMsg?.hash || tx?.hash || "",
      };
    }
  });

  const votes = _.map(votesByAddress, (value, address) => ({
    address,
    vote: value.choice,
    votingPower: "1",
    timestamp: value.timestamp,
    hash: value.hash,
  }));

  const totalVotes = votes.length;
  const proposalResult = _.reduce(
    choices,
    (acc, choice) => {
      const count = votes.filter((it) => it.vote === choice).length;
      acc[choice.toLowerCase()] =
        totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(4)) : 0;
      return acc;
    },
    { totalWeight: `${totalVotes}`, totalWeights: `${totalVotes}` } as Record<
      string,
      any
    >
  );

  return {
    votingPower: {},
    proposalResult,
    votes,
    metadata,
    maxLt: "",
    rawVotes: {},
  };
};

const getOneWalletOneVoteFallbackSafe = async (
  proposalAddress: string,
  metadata?: ProposalMetadata
) => {
  if (!metadata) return null;
  try {
    return await getOneWalletOneVoteFallback(proposalAddress, metadata);
  } catch (error) {
    Logger("1-wallet-1-vote fallback failed", error);
    return null;
  }
};

const getProposal = async (args: GetProposalArgs): Promise<Proposal | null> => {
  const { clientV2, clientV4, proposalAddress, maxLt } = args;

  const proposalType = getVoteStrategyType(
    args.metadata?.votingPowerStrategies
  );

  const promise = async (bail: any, attempt: number) => {
    Logger(
      `Fetching proposal from contract, address: ${proposalAddress}, attempt: ${attempt}`
    );
    try {
      let newMaxLt = undefined;

      const _clientV2 = clientV2 || (await getClientV2());
      const _clientV4 = clientV4 || (await getClientV4(CLIENT_V4_ENDPOINT));

      const metadata =
        args.metadata ||
        (await getProposalMetadata(_clientV2, _clientV4, proposalAddress));
      let transactions: Transaction[];
      const result = await getTransactions(_clientV2, proposalAddress);
      newMaxLt = result.maxLt;
      if (maxLt) {
        transactions = filterTxByTimestamp(result.allTxns, maxLt);
      } else {
        transactions = result.allTxns;
      }

      const { votingPowerStrategies } = metadata;

      const nftItemsHolders = await _getAllNftHolders(metadata, _clientV4);

      let operatingValidatorsInfo = {};

      if (proposalType === VotingPowerStrategyType.TonBalanceWithValidators) {
        operatingValidatorsInfo = await api.geOperatingValidatorsInfo(
          proposalAddress
        );
      }

      const votingPower = await TonVoteSDK.getVotingPower(
        _clientV4,
        metadata,
        transactions,
        {},
        getVoteStrategyType(votingPowerStrategies),
        nftItemsHolders,
        operatingValidatorsInfo
      );

      const proposalResult = TonVoteSDK.getCurrentResults(
        transactions,
        votingPower,
        metadata
      );

      proposalResult.totalWeight = proposalResult.totalWeights;
      const { totalWeights, ...rest } = proposalResult;
      const votes = TonVoteSDK.getAllVotes(transactions, metadata);

      if (
        !Object.keys(votes).length &&
        (proposalType === VotingPowerStrategyType.TonBalance_1Wallet1Vote ||
          proposalType === VotingPowerStrategyType.JettonBalance_1Wallet1Vote ||
          proposalType === VotingPowerStrategyType.NftCcollection_1Wallet1Vote)
      ) {
        const fallback = await getOneWalletOneVoteFallbackSafe(
          proposalAddress,
          metadata
        );
        if (fallback?.votes.length) {
          return fallback;
        }
      }

      return {
        votingPower,
        proposalResult: rest as any,
        votes: parseVotes(votes, votingPower),
        metadata,
        maxLt: newMaxLt,
        rawVotes: votes,
      };
    } catch (error) {
      Logger(error);
      if (attempt === CONTRACT_RETRIES + 1) {
        Logger("Failed to fetch proposal from contract");
      }
      throw new Error(error instanceof Error ? error.message : "");
    }
  };

  return retry(promise, { retries: CONTRACT_RETRIES });
};

interface GetProposalResultsAfterVoteArgs {
  proposalAddress: string;
  walletAddress: string;
  proposal: Proposal;
}

const getProposalResultsAfterVote = async (
  args: GetProposalResultsAfterVoteArgs
) => {
  const { proposalAddress, walletAddress, proposal } = args;
  const metadata = proposal.metadata;

  const clientV2 = await getClientV2();
  const clientV4 = await getClientV4();
  const { allTxns, maxLt } = await getTransactions(
    clientV2,
    proposalAddress,
    proposal.maxLt
  );

  const userTx = _.find(allTxns, (tx) => {
    return tx.inMessage?.info.src?.toString() === walletAddress;
  });

  if (!userTx || !metadata) return;

  const nftItemsHolders = await getAllNftHolders(clientV4, metadata);

  const singleVotingPower = await getSingleVoterPower(
    clientV4,
    walletAddress,
    metadata,
    getVoteStrategyType(metadata.votingPowerStrategies),
    nftItemsHolders
  );

  const rawVotes = getAllVotes([userTx], metadata);
  const votingPower = proposal.votingPower || {};

  const votes = {
    ...proposal.rawVotes,
    [walletAddress]: rawVotes[walletAddress],
  };

  votingPower[walletAddress] = singleVotingPower;

  return {
    proposalResults: calcProposalResult(
      votes,
      votingPower,
      proposal.metadata?.votingSystem!
    ),
    vote: parseVotes(rawVotes, votingPower)[0],
    maxLt,
  };
};

export const getDao = async (daoAddress: string, clientV2?: TonClient) => {
  const promise = async (bail: any, attempt: number) => {
    Logger(
      `Fetching dao from contract, address ${daoAddress}, attempt: ${attempt}`
    );
    const client = clientV2 || (await getClientV2());

    const daoState = await TonVoteSDK.getDaoState(client, daoAddress);

    const metadataArgs = await TonVoteSDK.getDaoMetadata(
      client,
      daoState.metadata
    );

    const daoFromContract: Dao = {
      daoAddress: daoAddress,
      daoRoles: {
        owner: daoState.owner,
        proposalOwner: daoState.proposalOwner,
      },
      daoMetadata: {
        metadataAddress: "",
        metadataArgs,
      },
      daoId: daoState.daoIndex,
      daoProposals:
        (await TonVoteSDK.getDaoProposals(client, daoAddress))
          .proposalAddresses || [],
    };
    return daoFromContract;
  };

  return retry(promise, { retries: CONTRACT_RETRIES });
};

const _getAllNftHolders = (
  metadata: ProposalMetadata,
  clientV4?: TonClient4
) => {
  if (!isNftProposal(metadata.votingPowerStrategies)) {
    return {} as { [key: string]: string[] };
  }
  const promise = async (bail: any, attempt: number) => {
    Logger(`Fetching all nft holders, attempt: ${attempt}`);
    const _clientV4 = clientV4 || (await getClientV4());
    return getAllNftHolders(_clientV4, metadata);
  };
  return retry(promise, { retries: CONTRACT_RETRIES });
};

export const contract = {
  getAllNftHolders: _getAllNftHolders,
  getProposal,
  getDao,
  getProposalResultsAfterVote,
  getOneWalletOneVoteFallback: getOneWalletOneVoteFallbackSafe,
};
