import { Link, styled, Typography, useTheme } from "@mui/material";
import {
  AddressDisplay,
  LoadingContainer,
  OverflowWithTooltip,
  TitleContainer,
  Img,
} from "components";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import { StyledFlexColumn, StyledFlexRow } from "styles";
import moment from "moment";
import { useProposalPageTranslations } from "i18n/hooks/useProposalPageTranslations";
import {
  useAppParams,
  useIsOneWalletOneVote,
  useProposalStrategyName,
  useStrategyArguments,
} from "hooks/hooks";
import { useProposalQuery } from "query/getters";
import { ONE_WALLET_ONE_VOTE_URL } from "consts";
import { getTonScanContractUrl, getVoteStrategyType } from "utils";
import { VotingPowerStrategyType } from "ton-vote-contracts-sdk";
import CheckImg from "assets/check.svg";
import CheckImgGray from "assets/check-gray.svg";

const MONTHS_RU: { [key: number]: string } = {
  1: 'января',
  2: 'февраля',
  3: 'марта',
  4: 'апреля',
  5: 'мая',
  6: 'июня',
  7: 'июля',
  8: 'августа',
  9: 'сентября',
  10: 'октября',
  11: 'ноября',
  12: 'декабря'
};

const fromUnixToString = (time: number) => {
  const date = moment.unix(time).utc().local();
  const day = date.format('D');
  const month = MONTHS_RU[parseInt(date.format('M'))];
  const year = date.format('YYYY');
  const time_str = date.format('HH:mm');
  
  return `${day} ${month} ${year} ${time_str}`;
};

export const Metadata = () => {
  const { proposalAddress } = useAppParams();
  const { isLoading, data, dataUpdatedAt } = useProposalQuery(proposalAddress);
  const translations = useProposalPageTranslations();
  const proposalMetadata = data?.metadata;
  const strategyName = useProposalStrategyName(proposalAddress);

  const type = useMemo(() => {
    return getVoteStrategyType(proposalMetadata?.votingPowerStrategies);
  }, [dataUpdatedAt]);

  if (isLoading) {
    return <LoadingContainer />;
  }

  return (
    <StyledInformation title={translations.information}>
      {proposalMetadata && (
        <>
          <StyledPadding>
            <InformationRow label={translations.startDate}>
              <Typography>
                {fromUnixToString(Number(proposalMetadata.proposalStartTime))}
              </Typography>
            </InformationRow>
            <InformationRow label={translations.endDate}>
              <Typography>
                {fromUnixToString(Number(proposalMetadata.proposalEndTime))}
              </Typography>
            </InformationRow>

            <InformationRow label={translations.snapshot}>
              <Typography>
                {fromUnixToString(
                  Number(proposalMetadata.proposalSnapshotTime)
                )}
              </Typography>
            </InformationRow>
            <InformationRow label={translations.contract}>
              <AddressDisplay address={proposalAddress} />
            </InformationRow>
            <InformationRow label={translations.votingStrategy}>
              <HandleStrategyNameDisplay name={strategyName} type={type} />
            </InformationRow>
            <Jetton />
            <NFT />
          </StyledPadding>
        </>
      )}
      <ExtraInfo />
    </StyledInformation>
  );
};

const StyledPadding = styled(StyledFlexColumn)({
  gap: 12,
  padding: 20,
  paddingBottom: 0,
});

const HandleStrategyNameDisplay = ({
  name,
  type,
}: {
  name?: string;
  type: VotingPowerStrategyType;
}) => {
  const { proposalAddress } = useAppParams();
  const isOneWalletOneVote = useIsOneWalletOneVote(proposalAddress);
  if (isOneWalletOneVote) {
    return (
      <StyledLink href={ONE_WALLET_ONE_VOTE_URL} target="_blank">
        <OverflowWithTooltip text={name} />
      </StyledLink>
    );
  }

  return <OverflowWithTooltip text={name} />;
};

const StyledLink = styled("a")(({ theme }) => ({
  textDecoration: "unset",
  color: theme.palette.text.primary,
  "&:hover": {
    textDecoration: "underline",
    textDecorationColor: theme.palette.text.primary,
  },
}));

const InformationRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  return (
    <StyledRow justifyContent="space-between" gap={10}>
      <Typography className="row-label">{label}</Typography>
      <div className="row-children">{children}</div>
    </StyledRow>
  );
};

const StyledRow = styled(StyledFlexRow)({
  width: "100%",
  ".row-label": {
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  ".row-children": {
    "*": {
      fontSize: 14,
      fontWeight: 400,
    },
  },
});

const StyledInformation = styled(TitleContainer)({
  width: "100%",
  ".title-container-children": {
    padding: 0,
  },
});

const NFT = () => {
  const { proposalAddress } = useAppParams();
  const data = useProposalQuery(proposalAddress).data;
  const strategyArgs = useStrategyArguments(proposalAddress);

  return (
    <Asset
      metadata={data?.metadata?.nftMetadata?.metadata}
      address={strategyArgs.nft}
      label="NFT коллекция"
    />
  );
};

const Jetton = () => {
  const { proposalAddress } = useAppParams();
  const data = useProposalQuery(proposalAddress).data;

  const strategyArgs = useStrategyArguments(proposalAddress);

  return (
    <Asset
      metadata={data?.metadata?.jettonMetadata?.metadata}
      address={strategyArgs.jetton}
      label="Жетон"
    />
  );
};

const Asset = ({
  address,
  metadata,
  label,
}: {
  address?: string;
  metadata?: any;
  label: string;
}) => {
  const lastKnownNameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (metadata?.name) {
      lastKnownNameRef.current = metadata.name;
    }
  }, [metadata?.name]);

  if (!address) return null;
  const displayName = metadata?.name || lastKnownNameRef.current || address;

  return (
    <InformationRow label={label}>
      <StyledAsset
        href={getTonScanContractUrl(address)}
        target="_blank"
      >
        <OverflowWithTooltip text={displayName} />
        {metadata?.image && <Img className="asset-img" src={metadata.image} />}
      </StyledAsset>
    </InformationRow>
  );
};

const StyledAsset = styled("a")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 5,
  textDecoration: "unset",
  ".asset-img": {
    minWidth: 25,
    minHeight: 25,
    borderRadius: "50%",
  },
  "&:hover": {
    textDecoration: "underline",
    textDecorationColor: theme.palette.text.primary,
  },
}));

function ExtraInfo() {
  const { proposalAddress } = useAppParams();
  const { data, dataUpdatedAt } = useProposalQuery(proposalAddress);
  const theme = useTheme();
  const proposalStrategyType = useMemo(
    () => getVoteStrategyType(data?.metadata?.votingPowerStrategies),
    [dataUpdatedAt]
  );

  if (
    proposalStrategyType === VotingPowerStrategyType.TonBalanceWithValidators
  ) {
    return (
      <StyledExtraInfo>
        <img
          src={theme.palette.mode === "dark" ? CheckImg : CheckImgGray}
          className="check"
        />
        <Typography>
          Валидаторы также могут участвовать в этом голосовании.{" "}
          <Link
            href="https://github.com/gradosphera/blago-vote/ton-vote#supported-strategies"
            target="_blank"
          >
            Подробнее
          </Link>
        </Typography>
      </StyledExtraInfo>
    );
  }
  return <div style={{ marginTop: 20 }} />;
}

const StyledExtraInfo = styled(StyledFlexRow)({
  width: "100%",
  background: "rgba(0, 136, 204, 0.1)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  flexDirection: "row",
  padding: "14px 20px",
  gap: 12,
  marginTop: 14,
  ".check": {
    width: 22,
    height: 22,
    "*": {
      color: "yellow",
    },
  },
  p: {
    fontSize: 14,
    fontWeight: 600,
    width: "auto",
  },
});
