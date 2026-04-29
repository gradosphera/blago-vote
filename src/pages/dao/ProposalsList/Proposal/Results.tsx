import { Chip, styled, Typography } from "@mui/material";
import { useGetProposalSymbol, useProposalResults } from "hooks/hooks";
import { useDaoPageTranslations } from "i18n/hooks/useDaoPageTranslations";
import { StyledFlexColumn, StyledFlexRow } from "styles";
import { StyledAlert, StyledProposalPercent, StyledProposalResult, StyledProposalResultContent, StyledProposalResultProgress, StyledResultName, StyledTonAmount } from "../styles";

const QUORUM_PERCENT = 66;

export const Results = ({
  proposalAddress,
}: {
  proposalAddress: string;
}) => {
  const translations = useDaoPageTranslations();
  const results = useProposalResults(proposalAddress);
  const winnerPercent = Math.max(...results.map((it) => it.percent), 0);
  const isQuorumPassed = winnerPercent >= QUORUM_PERCENT;

  return (
    <StyledResults gap={10}>
      <StyledQuorumChip
        label={isQuorumPassed ? "Кворум 2/3 пройден" : "Кворум 2/3 не пройден"}
        color={isQuorumPassed ? "success" : "warning"}
      />
      {!isQuorumPassed && (
        <StyledAlert severity="warning">
          <Typography>{translations.endedAndDidntPassedQuorum}</Typography>
        </StyledAlert>
      )}
      {results.map((result) => {
        return (
          <Result
            key={result.choice}
            title={result.choice}
            percent={result.percent}
            amount={result.amount}
          />
        );
      })}
    </StyledResults>
  );
};

const Result = ({
  title,
  percent = 0,
  amount = "",
}: {
  title: string;
  percent?: number;
  amount?: string;
}) => {
  return (
    <StyledProposalResult>
      <StyledProposalResultProgress style={{ width: `${percent}%` }} />
      <StyledProposalResultContent>
        <StyledFlexRow justifyContent="flex-start">
          <StyledResultName text={title} />
          <StyledTonAmount>
            {amount}
          </StyledTonAmount>
        </StyledFlexRow>
        <StyledProposalPercent>{percent}%</StyledProposalPercent>
      </StyledProposalResultContent>
    </StyledProposalResult>
  );
};

const StyledResults = styled(StyledFlexColumn)({
  width: "100%",
});

const StyledQuorumChip = styled(Chip)({
  width: "fit-content",
  fontWeight: 600,
});
