import { Chip, styled, Typography } from "@mui/material";
import { AddressDisplay, TitleContainer } from "components";
import { useAppParams } from "hooks/hooks";
import { useCommonTranslations } from "i18n/hooks/useCommonTranslations";
import { useDaoQuery } from "query/getters";
import { parseLanguage } from "utils";
import { StyledFlexColumn, StyledFlexRow } from "styles";
import { LayoutSection } from "./components";
import { DaoDescription } from "./DaoDescription";

export function DaoAbout() {
    const { daoAddress } = useAppParams();

  const daoData = useDaoQuery(daoAddress).data;
  const roles = daoData?.daoRoles;
  const daoName = parseLanguage(daoData?.daoMetadata?.metadataArgs?.name);
  const translations = useCommonTranslations();

  return (
    <>
      {daoName && (
        <StyledDaoName variant="h3">{daoName}</StyledDaoName>
      )}
      <LayoutSection title="Описание ДАО">
      <DaoDescription />
      <StyledTitleContainer
        title={translations.administrators}
        headerComponent={<Chip label={2} />}
      >
        <StyledFlexColumn gap={0}>
          <StyledSection>
            {roles && (
              <StyledAddressDisplay address={roles.owner} padding={10} />
            )}
            <Chip label={translations.daoSpaceOwner} color="primary" />
          </StyledSection>
          <StyledSection>
            {roles && (
              <StyledAddressDisplay
                address={roles?.proposalOwner}
                padding={10}
              />
            )}
            <Chip label={translations.proposalPublisher} color="primary" />
          </StyledSection>
        </StyledFlexColumn>
      </StyledTitleContainer>
    </LayoutSection>
    </>
  );
}

export default DaoAbout;


const StyledAddressDisplay = styled(AddressDisplay)({
  P: {
    fontWeight: 600,
  },
});

const StyledDaoName = styled(Typography)(({ theme }) => ({
  fontSize: "28px",
  fontWeight: 800,
  lineHeight: "34px",
  color: theme.palette.text.primary,
}));

const StyledTitleContainer = styled(TitleContainer)({
  ".title-container-header": {
    justifyContent: "flex-start",
  },
  ".title-container-children": {
    padding: 0,
  },
});

const StyledSection = styled(StyledFlexRow)({
  gap: 30,
  justifyContent: "space-between",
  padding: "14px 25px",
  borderBottom: "1px solid rgba(114, 138, 150, 0.24)",
  "&:last-child": {
    border: "unset",
  },
});
