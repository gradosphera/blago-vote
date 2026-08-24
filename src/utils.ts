import { BLACKLISTED_DAOS, IS_DEV, TONVIEWER, VERIFIED_DAOS } from "config";
import _ from "lodash";
import moment from "moment";
import { Address, fromNano } from "ton";
import {
  ProposalMetadata,
  VotingPowerStrategy,
  VotingPowerStrategyType,
} from "ton-vote-contracts-sdk";
import {
  Proposal,
  ProposalResults,
  ProposalStatus,
  RawVote,
  Vote,
  VotingPower,
} from "types";
import * as TonVoteSDK from "ton-vote-contracts-sdk";
import { FormikProps } from "formik";
import { WHITELISTED_DAOS, WHITELISTED_PROPOSALS } from "whitelisted";
import BigNumber from "bignumber.js";
import { ZERO_ADDRESS } from "consts";
import { errorToast } from "toasts";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const Logger = (...args: any) => {
  if (IS_DEV || import.meta.env.DEV) {
    console.log(...args);
  }
};

const getVotingPowerByAddress = (address: string, votingPower: VotingPower) => {
  const rawAddress = normalizeTonAddress(address);
  const normalizedByRaw = rawAddress ? votingPower[rawAddress] : undefined;
  const normalizedByFriendly = votingPower[address];

  return normalizedByRaw || normalizedByFriendly;
};

const extractVoteValue = (value: any) => {
  return (
    value?.vote ??
    value?.choice ??
    value?.choices ??
    value?.option ??
    value?.selection ??
    ""
  );
};

export const parseVotes = (
  rawVotes: TonVoteSDK.Votes | Vote[] | Record<string, any>,
  votingPower: VotingPower,
) => {
  let votes: Vote[] = [];

  if (_.isArray(rawVotes)) {
    votes = rawVotes.map((item: any) => {
      const address = item?.address || item?.voter || item?.wallet || "";
      const _votingPower = getVotingPowerByAddress(address, votingPower);
      return {
        address,
        vote: extractVoteValue(item),
        votingPower: _votingPower ? fromNano(_votingPower) : "0",
        timestamp: Number(item?.timestamp || item?.time || item?.utime || 0),
        hash: item?.hash || item?.txHash || item?.transactionHash || "",
      };
    });
  } else {
    votes = Object.entries(rawVotes).map(([key, value]) => {
      const v = value as RawVote & Record<string, any>;
      const address = v?.address || v?.voter || v?.wallet || key;
      const _votingPower = getVotingPowerByAddress(address, votingPower);

      return {
        address,
        vote: extractVoteValue(v),
        votingPower: _votingPower ? fromNano(_votingPower) : "0",
        timestamp: Number(v?.timestamp || v?.time || v?.utime || 0),
        hash: v?.hash || v?.txHash || v?.transactionHash || "",
      };
    });
  }

  const sortedVotes = _.orderBy(votes, "timestamp", ["desc", "asc"]);
  return sortedVotes;
};

export function nFormatter(num: number, digits = 2) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: " тыс." },
    { value: 1e6, symbol: " млн." },
    { value: 1e9, symbol: " млрд." },
    { value: 1e12, symbol: " трлн." },
    { value: 1e15, symbol: " квадрлн." },
    { value: 1e18, symbol: " квинтлн." },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  if (num < 1) {
    return num.toFixed(5).replace(rx, "$1");
  }
  return item
    ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
    : "0";
}

export const getTimeDiff = (value: number, reverse?: boolean) => {
  var a = moment(unixToMilliseconds(value));
  var b = moment();

  const from = reverse ? b : a;
  const to = reverse ? a : b;

  const days = from.diff(to, "days");
  const hours = from.diff(to, "hours");
  const minutes = from.diff(to, "minutes");

  if (days > 0) {
    return days === 1 ? "1 день" : `${days} дн.`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 час" : `${hours} час.`;
  }

  return minutes === 1 ? "1 минута" : `${minutes} мин.`;
};

export const getProposalStatus = (
  proposalMetadata?: ProposalMetadata,
): ProposalStatus | null => {
  if (!proposalMetadata) return null;
  const { proposalStartTime, proposalEndTime } = proposalMetadata;

  const now = moment.utc().valueOf();
  const voteStarted = unixToMilliseconds(Number(proposalStartTime)) <= now;
  const finished = unixToMilliseconds(Number(proposalEndTime)) <= now;

  return finished
    ? ProposalStatus.CLOSED
    : voteStarted && !finished
      ? ProposalStatus.ACTIVE
      : !voteStarted
        ? ProposalStatus.NOT_STARTED
        : null;
};

export const unixToMilliseconds = (value: Number) => {
  return moment.unix(Number(value)).valueOf();
};

export const urlPatternValidation = (URL: string) => {
  const regex = new RegExp(
    "(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?",
  );
  return regex.test(URL);
};

export const toTonviewerAddress = (address?: string) => {
  if (!address) return "";
  try {
    // Tonviewer принимает friendly (EQ...) адреса; конвертируем из raw "0:..."
    return Address.parse(address).toString({ urlSafe: true, bounceable: true });
  } catch {
    return address;
  }
};

export const toNoBounceAddress = (address?: string) => {
  if (!address) return "";
  try {
    return Address.parse(address).toString({
      urlSafe: true,
      bounceable: false,
    });
  } catch {
    return address;
  }
};

export const normalizeTonAddress = (address?: string) => {
  if (!address) return "";
  try {
    return Address.parse(address).toRawString();
  } catch {
    return address;
  }
};

export const areTonAddressesEqual = (addressA?: string, addressB?: string) => {
  if (!addressA || !addressB) return false;
  return normalizeTonAddress(addressA) === normalizeTonAddress(addressB);
};

export const makeElipsisAddress = (address?: string, padding = 6): string => {
  if (!address) return "";
  const formatted = toNoBounceAddress(address);
  return `${formatted.substring(0, padding)}...${formatted.substring(
    formatted.length - padding,
  )}`;
};

export const getTonScanContractUrl = (address?: string) => {
  if (!address) return "";
  return `${TONVIEWER}/${toTonviewerAddress(address)}`;
};

export const calculateTonAmount = (
  type: VotingPowerStrategyType,
  percent?: number,
  total?: string,
) => {
  if (!percent || !total) return;
  const result = BigNumber(fromNano(total))
    .multipliedBy(percent)
    .div(100)
    .toNumber();

  if (type === VotingPowerStrategyType.NftCcollection) {
    return nFormatter(Math.round(result), 2);
  }
  return nFormatter(result, 2);
};

export const getTonAmounFromSumCoins = (value?: BigNumber) => {
  if (!value) return "0";

  const amount = typeof value === "string" ? Number(value) : value.toNumber();

  return nFormatter(Number(fromNano(Math.round(amount))), 2);
};

export const validateAddress = (value?: string) => {
  if (!value) {
    return true;
  }
  try {
    return Address.isAddress(Address.parse(value));
  } catch (error) {
    return false;
  }
};

export async function validateFormik(formik: FormikProps<any>) {
  let value = "";
  await formik.validateForm().then((errors) => {
    if (!_.isEmpty(errors)) {
      const error = _.first(_.values(errors)) as string;
      value = error;
      error && errorToast(error);
    }
  });

  return value;
}

export function validateFormikSingleField<T>(
  formik: FormikProps<T>,
  name: string,
) {
  formik.validateField(name);

  const error = formik.errors[name as keyof T] as string;

  if (error) {
    errorToast(error);
  }

  return error;
}

export const normalizeResults = (
  proposalResult?: ProposalResults,
): { title: string; percent: number }[] => {
  if (!proposalResult) return [];
  return _.map(proposalResult, (value, key) => {
    return {
      title: key,
      percent: value ? Number(value) : 0,
    };
  }).filter((it) => it.title !== "totalWeight");
};

export const parseLanguage = (json?: string, lang: string = "en") => {
  if (!json || !lang) return "";

  try {
    const parsed = JSON.parse(json);
    const value = parsed[lang];
    if (!value) {
      throw new Error("No value");
    }
    return value.trim();
  } catch (error) {
    return json.trim();
  }
};

const PROPOSAL_TEMPLATE_MARKER_PREFIX = "<!--proposal-template:";

export interface ExtractedProposalTemplate {
  templateId: string;
  templateParams: Record<string, string>;
}

export const extractProposalTemplate = (
  text?: string,
): ExtractedProposalTemplate | undefined => {
  if (!text) return undefined;
  const start = text.indexOf(PROPOSAL_TEMPLATE_MARKER_PREFIX);
  if (start < 0) return undefined;
  const end = text.indexOf("-->", start);
  if (end < 0) return undefined;
  const json = text
    .slice(start + PROPOSAL_TEMPLATE_MARKER_PREFIX.length, end)
    .trim();
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.templateId === "string") {
      return {
        templateId: parsed.templateId,
        templateParams: parsed.templateParams || {},
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export const stripProposalTemplateMarker = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/<!--proposal-template:[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const isDaoWhitelisted = (address?: string) => {
  if (!address) return false;
  if (isDaoBlacklisted(address)) return false;
  if (!_.size(WHITELISTED_DAOS)) return true;
  return WHITELISTED_DAOS.includes(address);
};

export const isDaoBlacklisted = (address?: string) => {
  if (!address) return false;
  return BLACKLISTED_DAOS.includes(address);
};

export const isProposalWhitelisted = (address?: string) => {
  if (!address) return false;
  if (!_.size(WHITELISTED_PROPOSALS)) return true;
  return WHITELISTED_PROPOSALS.includes(address);
};

export const isZeroAddress = (value?: string) => {
  return value === ZERO_ADDRESS;
};

export const getVoteStrategyType = (
  votingPowerStrategy?: VotingPowerStrategy[],
) => {
  const result =
    !votingPowerStrategy || !_.size(votingPowerStrategy)
      ? VotingPowerStrategyType.TonBalance
      : votingPowerStrategy[0].type;

  return Number(result);
};

export const getTxFee = (value: number = 0, baseFee: number = 0): string => {
  return Math.max(Number(value), baseFee).toString();
};

export const extractArg = (strategy: VotingPowerStrategy, name: string) => {
  return { [name]: strategy.arguments.find((it) => it.name === name)?.value };
};

export const extractStrategyArguments = (
  strategies?: VotingPowerStrategy[],
) => {
  if (!strategies) return {};
  let result: any = {};
  const args = _.flatMap(strategies, (it) => it.arguments);
  _.forEach(args, (it) => {
    result[it.name] = it.value;
  });

  return result;
};

export const getStrategyArgument = (
  name: string,
  strategies?: VotingPowerStrategy[],
) => {
  return extractStrategyArguments(strategies)[name];
};

export const utcMoment = (value?: number) => {
  const dt = value ? moment(value) : moment();

  const offset = dt.parseZone().utcOffset();

  return offset < 0
    ? dt.subtract(Math.abs(offset), "minutes")
    : dt.add(offset, "minutes");
};

export const fromUtcMoment = (value?: number) => {
  const dt = value ? moment(value) : moment();

  const offset = dt.parseZone().utcOffset();

  return offset < 0
    ? dt.add(Math.abs(offset), "minutes")
    : dt.subtract(offset, "minutes");
};

export const validateServerUpdateTime = (
  server: number,
  local: number,
  value: number = 90_000,
) => {
  const now = moment().valueOf();
  const diff = server - local;
  return diff >= value;
};

export const getProposalResultTonAmount = (
  proposal: Proposal,
  choice: string,
  percent: number,
  totalWeight: string,
  type: VotingPowerStrategyType,
) => {
  let result = "0";
  if (proposal?.sumCoins) {
    const value =
      proposal.sumCoins[choice] || proposal.sumCoins[choice.toLowerCase()];
    result = getTonAmounFromSumCoins(value as BigNumber);
  } else {
    result = calculateTonAmount(type, percent, totalWeight) || "0";
  }
  return result;
};

export const getproposalResult = (proposal: Proposal, choice: string) => {
  return (
    proposal?.proposalResult?.[choice] ||
    proposal?.proposalResult?.[choice.toLowerCase()]
  );
};

export const getProposalResultVotes = (proposal: Proposal, choice: string) => {
  let votes = 0;
  if (proposal.sumVotes) {
    votes =
      proposal.sumVotes[choice] || proposal.sumVotes[choice.toLowerCase()];
  } else {
    const votesCount = _.mapValues(
      _.groupBy(proposal.votes, "vote"),
      (value) => {
        return _.size(value);
      },
    );

    votes =
      votesCount[choice as keyof typeof votesCount] ||
      votesCount[choice.toLowerCase() as keyof typeof votesCount] ||
      0;
  }
  return votes;
};

export const getIsVerifiedDao = (address?: string) => {
  return VERIFIED_DAOS.includes(address || "");
};

export const normalizeImageUrl = (url?: string): string => {
  if (!url) return "";
  const githubBlobRegex =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;
  const match = url.match(githubBlobRegex);
  if (match) {
    const [, owner, repo, ref, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  }
  return url;
};

export const isNftProposal = (
  votingPowerStrategies?: VotingPowerStrategy[],
) => {
  const type = getVoteStrategyType(votingPowerStrategies);
  return (
    type == VotingPowerStrategyType.NftCcollection ||
    type == VotingPowerStrategyType.NftCcollection_1Wallet1Vote
  );
};

export const getIsOneWalletOneVote = (
  votingPowerStrategies?: VotingPowerStrategy[],
) => {
  const type = getVoteStrategyType(votingPowerStrategies);

  switch (type) {
    case VotingPowerStrategyType.JettonBalance_1Wallet1Vote:
    case VotingPowerStrategyType.TonBalance_1Wallet1Vote:
    case VotingPowerStrategyType.NftCcollection_1Wallet1Vote:
      return true;

    default:
      return false;
  }
};

export const getProposalSymbol = (
  votingPowerStrategies?: VotingPowerStrategy[],
) => {
  const type = getVoteStrategyType(votingPowerStrategies);

  switch (type) {
    case VotingPowerStrategyType.TonBalance:
    case VotingPowerStrategyType.TonBalance_1Wallet1Vote:
    case VotingPowerStrategyType.TonBalanceWithValidators:
      return "GRAM";
    case VotingPowerStrategyType.JettonBalance:
    case VotingPowerStrategyType.JettonBalance_1Wallet1Vote:
      return "Жетонов";
    case VotingPowerStrategyType.NftCcollection:
    case VotingPowerStrategyType.NftCcollection_1Wallet1Vote:
      return "NFT";

    default:
      break;
  }
};
