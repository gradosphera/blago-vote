import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material";
import { StyledFlexColumn, StyledFlexRow, StyledSkeletonLoader } from "styles";
import {
  useAppParams,
  useMobile,
  useProposalStatus,
  useProposalResults,
} from "hooks/hooks";
import { Link, useNavigate } from "react-router-dom";
import { appNavigation } from "router/navigation";
import AnimateHeight from "react-animate-height";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LoadingContainer,
  Markdown,
  Header,
  AddressDisplay,
  Img,
  Container,
  Button,
  ShareButton,
  Status,
  OverflowWithTooltip,
  HiddenProposal,
  Loader,
  AppTooltip,
} from "components";
import { makeElipsisAddress, parseLanguage, extractProposalTemplate } from "utils";
import { ProposalStatus as ProposalStatusEnum } from "types";
import { useProposalPageTranslations } from "i18n/hooks/useProposalPageTranslations";
import { MOBILE_WIDTH } from "consts";
import { useDaoQuery, useProposalQuery } from "query/getters";
import { mock } from "mock/mock";
import { Address } from "@ton/core";
import { useMyAddress } from "multisig/useMyAddress";
import { useMultisigInfo } from "multisig/useMultisigInfo";

const MIN_DESCRIPTION_HEIGHT = 450;

export const ProposalAbout = () => {
  const mobile = useMobile();

  return (
    <StyledContainer>
      {mobile ? <MobileAbout /> : <DesktopAbout />}
    </StyledContainer>
  );
};

function DesktopAbout() {
  return (
    <StyledFlexColumn alignItems="flex-start" gap={20}>
      <ProposalHeader />
      <StyledProposalOwner justifyContent="flex-start">
        <ProposalStatus />
        <DaoInfo />
        <StyledShareButton url={window.location.href} />
      </StyledProposalOwner>
      <ProposalOwnerAddress />
      <Description />
      <ProposalApplyButton />
    </StyledFlexColumn>
  );
};

function MobileAbout() {
  return (
    <StyledFlexColumn alignItems="flex-start" gap={20}>
      <ProposalHeader />
      <StyledProposalOwner justifyContent="flex-start">
        <StyledFlexRow justifyContent="flex-start">
          <ProposalStatus />
          <DaoInfo />
        </StyledFlexRow>
        <StyledFlexRow>
          <StyledShareButton url={window.location.href} />
        </StyledFlexRow>
      </StyledProposalOwner>
      <ProposalOwnerAddress />
      <Description />
      <ProposalApplyButton />
    </StyledFlexColumn>
  );
}

const ProposalHeader = () => {
  const { proposalAddress } = useAppParams();
  const { data, isLoading } = useProposalQuery(proposalAddress);

  const mockPrefix = mock.isMockProposal(proposalAddress) ? " (Mock)" : "";

  const title = parseLanguage(data?.metadata?.title);

  if (isLoading) {
    return <StyledSkeletonLoader />;
  }
  return (
    <StyledFlexRow>
      <StyledHeader title={`${title}${mockPrefix}`} />
      {data && <StyledHiddenProposal proposal={data} />}
    </StyledFlexRow>
  );
};

const StyledHiddenProposal = styled(HiddenProposal)({
  position: "absolute",
  top: 7,
  right: 7,
});

const ShowMoreButton = ({
  onClick,
  showMore,
}: {
  onClick: (value: boolean) => void;
  showMore: boolean;
}) => {
  const translations = useProposalPageTranslations();

  return (
    <StyledShowMore open={showMore ? 1 : 0}>
      <StyledShowMoreButton
        onClick={() => onClick(!showMore)}
        variant="transparent"
      >
        <Typography>
          {showMore ? translations.showLess : translations.showMore}
        </Typography>
      </StyledShowMoreButton>
    </StyledShowMore>
  );
};

const Description = () => {
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const elRef = useRef<any>();
  const { proposalAddress } = useAppParams();
  const { data, isLoading } = useProposalQuery(proposalAddress);
  const [showMore, setShowMore] = useState(false);


  useLayoutEffect(() => {
    if (elRef.current) {
      setDescriptionHeight(elRef.current.offsetHeight);
    }
  }, [data?.metadata?.description]);
  const description = parseLanguage(data?.metadata?.description)
    .split("\n")
    .filter((line: string) => !line.match(/^\*?\*?Место проведения:\*?\*?/))
    .join("\n");

  const showMoreButton = descriptionHeight > MIN_DESCRIPTION_HEIGHT;

  const HEIGHT =
    descriptionHeight > MIN_DESCRIPTION_HEIGHT
      ? MIN_DESCRIPTION_HEIGHT
      : descriptionHeight;

  if (isLoading) {
    return (
      <StyledFlexColumn alignItems="flex-start">
        <StyledSkeletonLoader width="70%" />
        <StyledSkeletonLoader />
      </StyledFlexColumn>
    );
  }

  return (
    <StyledDescription>
      <StyledPlaceholder ref={elRef}>
        <StyledMarkdown open={0}>{description}</StyledMarkdown>
      </StyledPlaceholder>
      <AnimateHeight height={showMore ? "auto" : HEIGHT} duration={0}>
        <StyledMarkdown open={showMore ? 1 : 0}>{description}</StyledMarkdown>
      </AnimateHeight>
      {showMoreButton && (
        <ShowMoreButton showMore={showMore} onClick={setShowMore} />
      )}
    </StyledDescription>
  );
};

const StyledDescription = styled(Box)({
  position: "relative",
  width: "100%",
});

const StyledPlaceholder = styled("span")({
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  height: "auto",
});

const StyledMarkdown = styled(Markdown)<{ open: number }>(({ open }) => ({
  img: {
    display: open ? "block" : "none",
  },
  ul: {
    paddingLeft: 20,
  },
  ol: {
    paddingLeft: 20,
  },
}));

const StyledHeader = styled(Header)({
  marginBottom: 0,
  marginTop: 0,
});

const ProposalStatus = () => {
  const { proposalAddress } = useAppParams();
  const { proposalStatusText } = useProposalStatus(proposalAddress);

  return <Status status={proposalStatusText} />;
};

const QUORUM_PERCENT = 66;

const ProposalApplyButton = () => {
  const { proposalAddress } = useAppParams();
  const navigate = useNavigate();
  const myAddress = useMyAddress();
  const { proposalStatus } = useProposalStatus(proposalAddress);
  const { data } = useProposalQuery(proposalAddress);
  const results = useProposalResults(proposalAddress);

  const template = data?.metadata?.description
    ? extractProposalTemplate(parseLanguage(data.metadata.description))
    : undefined;
  const multisigAddress =
    template?.templateId === "multisig-mint"
      ? template.templateParams.multisigAddress
      : undefined;

  const { info, loading } = useMultisigInfo(multisigAddress);

  if (proposalStatus !== ProposalStatusEnum.CLOSED) return null;
  if (!template || template.templateId !== "multisig-mint") return null;

  const winnerPercent = results.length
    ? Math.max(...results.map((r) => r.percent))
    : 0;
  const quorumPassed = winnerPercent >= QUORUM_PERCENT;
  if (!quorumPassed) return null;

  const { jettonMinterAddress, amount, toAddress } = template.templateParams;
  if (!multisigAddress) return null;

  const isEligible =
    !loading &&
    !!info &&
    !!myAddress &&
    (info.signers.some((s: { address: Address }) =>
      s.address.equals(myAddress!),
    ) ||
      info.proposers.some((s: { address: Address }) =>
        s.address.equals(myAddress!),
      ));

  let reason: string;
  if (!myAddress) reason = "Подключите кошелёк, чтобы создать заявку";
  else if (loading) reason = "Проверка прав в мультикошельке...";
  else if (!info)
    reason = "Указанный адрес мультикошелька недоступен или не является мультикошельком";
  else
    reason =
      "Вы не являетесь подписантом или инициатором этого мультикошелька";

  const onClick = () => {
    if (!isEligible) return;
    navigate(appNavigation.multisigPage.newOrder(multisigAddress), {
      state: {
        orderType: "Минт жетонов",
        values: {
          jettonMinterAddress: (jettonMinterAddress || "").trim(),
          amount: (amount || "").trim(),
          toAddress: (toAddress || "").trim(),
        },
      },
    });
  };

  const button = (
    <StyledApplyButton
      onClick={onClick}
      grey={!isEligible}
      disabled={!isEligible}
    >
      Применить в мультикошельке
    </StyledApplyButton>
  );

  return isEligible ? button : <AppTooltip text={reason}>{button}</AppTooltip>;
};

const StyledApplyButton = styled(Button)<{ grey?: boolean }>(
  ({ theme, grey }) => ({
    height: 44,
    minWidth: 220,
    "*": {
      fontSize: 15,
      fontWeight: 600,
      ...(grey ? { color: theme.palette.text.disabled } : {}),
    },
    ...(grey
      ? {
          background: theme.palette.action.disabledBackground,
          color: theme.palette.text.disabled,
          border: `1px solid ${theme.palette.divider}`,
          cursor: "not-allowed",
        }
      : {}),
  }),
);

const StyledShareButton = styled(ShareButton)({
  marginLeft: "auto",
});

const DaoInfo = () => {
  const { proposalAddress } = useAppParams();
  const { data: proposal } = useProposalQuery(proposalAddress);
  const daoAddress = proposal?.daoAddress || "";

  const daoMetadata = useDaoQuery(daoAddress).data?.daoMetadata;

  if (!daoAddress) return null;

  return (
    <StyledFlexRow style={{ width: "auto", flexShrink: 0 }}>
      <StyledDaoImg src={daoMetadata?.metadataArgs.avatar} />
      <StyledDaoLink
        to={appNavigation.daoPage.root(daoAddress)}
        className="dao-name"
      >
        <OverflowWithTooltip
          text={parseLanguage(daoMetadata?.metadataArgs.name)}
        />
      </StyledDaoLink>
    </StyledFlexRow>
  );
};

const ProposalOwnerAddress = () => {
  const { proposalAddress } = useAppParams();
  const { data: proposal } = useProposalQuery(proposalAddress);
  const daoAddress = proposal?.daoAddress || "";

  const daoRoles = useDaoQuery(daoAddress).data?.daoRoles;
  if (!daoRoles?.proposalOwner) {
    return null;
  }
  return (
    <StyledAddressRow justifyContent="flex-start" gap={5}>
      <StyledAddressLabel>От:</StyledAddressLabel>
      <AddressDisplay
        address={daoRoles?.proposalOwner || ""}
        padding={16}
      />
    </StyledAddressRow>
  );
};

const StyledLink = styled(Link)({
  display: "flex",
});

const StyledAddressRow = styled(StyledFlexRow)(({ theme }) => ({
  width: "auto",
  ".address-display-btn": {
    p: {
      color: theme.palette.primary.main,
    },
  },
}));

const StyledAddressLabel = styled(Typography)({
  fontSize: 15,
  fontWeight: 900,
  opacity: 1,
  whiteSpace: "nowrap",
});

const StyledDaoLink = styled(Link)({
  display: "flex",
  minWidth: 0,
  overflow: "hidden",
  ".overflow-with-tooltip": {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
});

const StyledDaoImg = styled(Img)({
  minWidth: 30,
  minHeight: 30,
  width: 30,
  height: 30,
  borderRadius: "50%",
});

const StyledProposalOwner = styled(StyledFlexRow)({
  ".dao-name": {
    p: {
      fontSize: 15,
      fontWeight: 600,
    },
  },
  ".by": {
    fontSize: 15,
    fontWeight: 600,
  },
  ".address-display-btn": {
    p: {
      fontSize: 15,
      fontWeight: 600,
    },
  },
  "*": {
    textDecoration: "unset",
  },
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
});

const StyledShowMoreButton = styled(Button)(({ theme }) => ({
  marginLeft: "auto",
  marginRight: "auto",
  width: "100%",
}));

const StyledShowMore = styled(Box)<{ open: number }>(({ open, theme }) => {
  const shadow =
    theme.palette.mode === "light"
      ? "0px -22px 50px 16px #FFFFFF"
      : "0px -22px 50px 16px #222830";
  return {
    width: "100%",
    position: "relative",
    boxShadow: open === 1 ? "unset" : shadow,
    background: theme.palette.mode === "light" ? "white" : "#222830",
    paddingTop: 20,
  };
});

const StyledContainer = styled(Container)({
  width: "100%",
  padding: 30,
  paddingTop: 40,
  position: "relative",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    padding: 20,
  },
});
