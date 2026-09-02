import { useQueries } from "@tanstack/react-query";
import { Box, Button, styled, Typography } from "@mui/material";
import { IoArrowDown, IoArrowUp } from "react-icons/io5";
import { IoTriangle } from "react-icons/io5";
import { QueryKeys } from "config";
import _ from "lodash";
import moment from "moment";
import { useMemo, useState } from "react";
import { api } from "api";
import { useAppNavigation } from "router/navigation";
import { StyledFlexColumn, StyledFlexRow, StyledSkeletonLoader } from "styles";
import { parseLanguage } from "utils";
import { FEATURED_DAOS } from "whitelisted";
import { useDaosQuery } from "query/getters";
import { MOBILE_WIDTH } from "consts";

interface ActiveProposal {
  proposalAddress: string;
  daoName: string;
  endTime: number;
  startTime: number;
  votesCount: number;
  title: string;
  description: string;
  leadingChoice: string;
  totalChoices: string[];
  isActive: boolean;
}

const HIDDEN_PROPOSALS = [
  "EQDzyp8GQpTcL3UxBfppfhHr4oizVxIir6RPbgZNAL6mmXxS",
  "EQCXLon8hgGkRIk9RzIcDO4xa8YX7Fpmv5ubMYzrmF8b6srQ",
];

const ActiveProposalsLoader = () => {
  return (
    <StyledSection>
      <StyledFlexColumn gap={0} alignItems="flex-start" style={{ width: "100%" }}>
        <StyledSkeletonLoader style={{ width: 200, height: 24, marginBottom: 16 }} />
        {_.range(0, 3).map((_, i) => (
          <StyledTableRow key={i}>
            <StyledSkeletonLoader style={{ width: "100%", height: 40 }} />
          </StyledTableRow>
        ))}
      </StyledFlexColumn>
    </StyledSection>
  );
};

const SortIcon = ({ direction }: { direction: "asc" | "desc" }) => {
  return direction === "asc" ? (
    <IoArrowUp size={14} style={{ marginLeft: 4 }} />
  ) : (
    <IoArrowDown size={14} style={{ marginLeft: 4 }} />
  );
};

const ActiveProposalRow = ({
  proposalAddress,
  daoName,
  endTime,
  votesCount,
  title,
  description,
  leadingChoice,
  totalChoices,
  isActive,
}: Omit<ActiveProposal, "startTime">) => {
  const { proposalPage } = useAppNavigation();

  const isPositive = totalChoices.length > 0 && leadingChoice === totalChoices[0];

  const onClick = () => {
    proposalPage.root(proposalAddress);
  };

  const formattedEndDate = moment.unix(endTime).format("DD.MM.YYYY");
  const shortDescription = description
    ? description.substring(0, 80) + (description.length > 80 ? "..." : "")
    : "";

  return (
    <StyledTableRow onClick={onClick} isActive={isActive}>
      <StyledTableCell style={{ flex: 3 }}>
        <StyledFlexColumn alignItems="flex-start" gap={2}>
          <StyledProposalTitle>{title}</StyledProposalTitle>
          {shortDescription && (
            <StyledProposalDescription>{shortDescription}</StyledProposalDescription>
          )}
          <StyledDaoName>{daoName}</StyledDaoName>
        </StyledFlexColumn>
      </StyledTableCell>
      <StyledTableCellCenter style={{ flex: 1.5 }}>
        {isActive ? (
          <StyledEndDate>{formattedEndDate}</StyledEndDate>
        ) : (
          <StyledEndedText>Голосование закончено</StyledEndedText>
        )}
      </StyledTableCellCenter>
      <StyledTableCellCenter style={{ flex: 1 }}>
        <StyledFlexColumn alignItems="center" gap={2}>
          <IoTriangle
            size={12}
            color={isPositive ? "#4caf50" : "#f44336"}
          />
          <StyledVotesCount>{votesCount}</StyledVotesCount>
        </StyledFlexColumn>
      </StyledTableCellCenter>
    </StyledTableRow>
  );
};

export const ActiveProposals = () => {
  const { data: allDaos = [], isLoading: daosLoading } = useDaosQuery();
  const [filter, setFilter] = useState<"active" | "finished">("active");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const featuredProposalAddresses = useMemo(() => {
    const addresses: { proposalAddress: string; daoAddress: string }[] = [];
    FEATURED_DAOS.forEach((daoAddress: string) => {
      const dao = allDaos.find((d: any) => d.daoAddress === daoAddress);
      if (dao?.daoProposals) {
        dao.daoProposals.forEach((pa: string) => {
          addresses.push({ proposalAddress: pa, daoAddress });
        });
      }
    });
    return addresses;
  }, [allDaos]);

  const proposalQueries = useQueries({
    queries: featuredProposalAddresses.map(({ proposalAddress }: { proposalAddress: string }) => ({
      queryKey: [QueryKeys.PROPOSAL, proposalAddress, "active-check"],
      queryFn: async () => {
        return (await api.getProposal(proposalAddress)) || null;
      },
      enabled: !!proposalAddress,
      staleTime: 30_000,
      retry: false,
    })),
  });

  const allProposals = useMemo(() => {
    const now = Date.now();
    return featuredProposalAddresses
      .map(({ proposalAddress, daoAddress }: { proposalAddress: string; daoAddress: string }) => {
        const idx = featuredProposalAddresses.findIndex(
          (a: { proposalAddress: string }) => a.proposalAddress === proposalAddress
        );
        const query = proposalQueries[idx];
        const proposalData = query?.data as any;
        if (!proposalData) return null;
        const metadata = proposalData?.metadata;
        if (!metadata) return null;
        const startTime = Number(metadata.proposalStartTime) * 1000;
        const endTime = Number(metadata.proposalEndTime) * 1000;
        const votesCount = _.size(proposalData?.votes) || 0;
        const choices = metadata?.votingSystem?.choices || [];
        const votesByChoice: Record<string, number> = {};
        _.forEach(proposalData?.votes || [], (currentVote: any) => {
          const rawVotes = _.isArray(currentVote.vote) ? currentVote.vote : [currentVote.vote];
          _.forEach(rawVotes, (rawVoteValue: any) => {
            const value = String(rawVoteValue ?? "").trim();
            if (!value) return;
            const numIdx = Number(value);
            if (!Number.isNaN(numIdx)) {
              const choice = choices[numIdx] || choices[numIdx - 1];
              if (choice) { votesByChoice[choice] = (votesByChoice[choice] || 0) + 1; return; }
            }
            const matched = _.find(choices, (c: string) => c.toLowerCase() === value.toLowerCase());
            if (matched) { votesByChoice[matched] = (votesByChoice[matched] || 0) + 1; }
          });
        });
        const leadingChoice = _.maxBy(_.entries(votesByChoice), ([, v]) => v)?.[0] || "";
        const dao = allDaos.find((d: any) => d.daoAddress === daoAddress);
        const daoName = parseLanguage(dao?.daoMetadata?.metadataArgs?.name);
        const title = parseLanguage(metadata?.title);
        const description = parseLanguage(metadata?.description, "en")
          .split("\n")
          .filter((line: string) => !line.match(/^\*?\*?Место проведения:\*?\*?/))
          .join("\n");
        return {
          proposalAddress,
          daoName,
          endTime,
          startTime,
          votesCount,
          title,
          description,
          leadingChoice,
          totalChoices: choices,
          isActive: startTime <= now && endTime > now,
        } as ActiveProposal;
      })
      .filter((p): p is ActiveProposal => !!p && !HIDDEN_PROPOSALS.includes(p.proposalAddress));
  }, [featuredProposalAddresses, proposalQueries, allDaos]);

  const activeProposals = useMemo(() => {
    return _.orderBy(
      _.filter(allProposals, (p) => p.isActive),
      "endTime",
      sortDirection
    );
  }, [allProposals, sortDirection]);

  const finishedProposals = useMemo(() => {
    return _.orderBy(
      _.filter(allProposals, (p) => !p.isActive),
      "endTime",
      "desc"
    );
  }, [allProposals]);

  const displayedProposals = useMemo(() => {
    if (filter === "finished") {
      return finishedProposals;
    }
    if (activeProposals.length) {
      return activeProposals;
    }
    return _.take(finishedProposals, 3);
  }, [filter, activeProposals, finishedProposals]);

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  if (daosLoading) {
    return <ActiveProposalsLoader />;
  }

  const showFallback = filter === "active" && !activeProposals.length;

  return (
    <StyledSection>
      <StyledFlexColumn gap={0} alignItems="flex-start" style={{ width: "100%" }}>
        <StyledTitleRow>
          <StyledActiveProposalsTitle>
            {filter === "active"
              ? (activeProposals.length
                  ? "Активные предложения"
                  : "Последние предложения")
              : "Завершённые голосования"}
          </StyledActiveProposalsTitle>
          <StyledFilter>
            <StyledFilterButton
              active={filter === "active"}
              onClick={() => setFilter("active")}
            >
              Активные
            </StyledFilterButton>
            <StyledFilterButton
              active={filter === "finished"}
              onClick={() => setFilter("finished")}
            >
              Завершённые
            </StyledFilterButton>
          </StyledFilter>
        </StyledTitleRow>
        <StyledTableHeader>
          <StyledHeaderCell style={{ flex: 3 }}>Предложение</StyledHeaderCell>
          <StyledHeaderCellCenter style={{ flex: 1.5 }} onClick={filter === "active" && !showFallback ? toggleSort : undefined} clickable={filter === "active" && !showFallback}>
            Дата окончания <SortIcon direction={sortDirection} />
          </StyledHeaderCellCenter>
          <StyledHeaderCellRight style={{ flex: 1 }}>Голоса</StyledHeaderCellRight>
        </StyledTableHeader>
        {displayedProposals.map((proposal: ActiveProposal) => (
          <ActiveProposalRow
            key={proposal.proposalAddress}
            proposalAddress={proposal.proposalAddress}
            daoName={proposal.daoName}
            endTime={proposal.endTime}
            votesCount={proposal.votesCount}
            title={proposal.title}
            description={proposal.description}
            leadingChoice={proposal.leadingChoice}
            totalChoices={proposal.totalChoices}
            isActive={proposal.isActive}
          />
        ))}
      </StyledFlexColumn>
    </StyledSection>
  );
};

const StyledSection = styled(Box)({
  width: "100%",
});

const StyledActiveProposalsTitle = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 800,
  color: theme.typography.h2.color,
  marginBottom: 12,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 17,
  },
}));

const StyledTitleRow = styled(StyledFlexRow)({
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
  flexWrap: "wrap",
});

const StyledFilter = styled(Box)(({ theme }) => ({
  display: "flex",
  background:
    theme.palette.mode === "light"
      ? "rgba(0, 0, 0, 0.05)"
      : "rgba(255, 255, 255, 0.06)",
  borderRadius: 10,
  padding: 3,
}));

const StyledFilterButton = styled(Button)<{ active?: boolean }>(
  ({ theme, active }) => ({
    fontSize: 13,
    fontWeight: 700,
    textTransform: "none",
    borderRadius: 8,
    padding: "6px 14px",
    color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
    background: active ? theme.palette.primary.main : "transparent",
    "&:hover": {
      background: active
        ? theme.palette.primary.main
        : theme.palette.action.hover,
    },
  })
);

const StyledTableHeader = styled(StyledFlexRow)(({ theme }) => ({
  width: "100%",
  padding: "10px 16px",
  borderBottom: `2px solid ${theme.palette.divider}`,
  alignItems: "center",
}));

const StyledHeaderCell = styled(Typography)({
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  opacity: 0.5,
});

const StyledHeaderCellCenter = styled(StyledHeaderCell)<{ clickable?: boolean }>(
  ({ clickable, theme }) => ({
    textAlign: "center",
    cursor: clickable ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: clickable ? "none" : "auto",
    "&:hover": clickable
      ? { color: theme.palette.primary.main }
      : {},
  })
);

const StyledHeaderCellRight = styled(StyledHeaderCell)({
  textAlign: "center",
});

const StyledTableRow = styled(StyledFlexRow)<{ isActive?: boolean }>(
  ({ theme, isActive }) => ({
    width: "100%",
    padding: "14px 16px",
    cursor: "pointer",
    alignItems: "center",
    borderBottom: `1px solid ${theme.palette.divider}`,
    opacity: isActive === false ? 0.6 : 1,
    transition: "background 0.15s",
    "&:hover": {
      opacity: 1,
      background:
        theme.palette.mode === "light"
          ? "rgba(0, 136, 204, 0.04)"
          : "rgba(255, 255, 255, 0.04)",
    },
  })
);

const StyledTableCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  flexShrink: 1,
});

const StyledTableCellCenter = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100%",
});

const StyledTableCellRight = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
});

const StyledProposalTitle = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.typography.h2.color,
  minWidth: 0,
  overflowWrap: "break-word",
  wordBreak: "break-word",
  whiteSpace: "normal",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 14,
  },
}));

const StyledDaoName = styled(Typography)({
  fontSize: 12,
  fontWeight: 600,
  opacity: 0.5,
});

const StyledProposalDescription = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 500,
  opacity: 0.5,
  lineHeight: "18px",
  display: "-webkit-box",
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 12,
  },
}));

const StyledEndDate = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.primary.main,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 13,
  },
}));

const StyledEndedText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.disabled,
  textAlign: "center",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 12,
  },
}));

const StyledVotesCount = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 800,
  textAlign: "center",
  width: "100%",
  color: theme.typography.h2.color,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 16,
  },
}));
