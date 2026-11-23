import { styled } from "@mui/material";
import { Container, Markdown } from "components";
import { useAppParams } from "hooks/hooks";
import { useDaoQuery } from "query/getters";
import React, { useMemo } from "react";
import { parseLanguage } from "utils";
import { useTranslation } from "react-i18next";

export function DaoDescription() {
  const {daoAddress} = useAppParams()
  const rawAbout = useDaoQuery(daoAddress).data?.daoMetadata.metadataArgs.about;
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const about = useMemo(() => parseLanguage(rawAbout, currentLang), [rawAbout, currentLang]);

  if (!about) return null;
  return (
    <StyledDescription>
      <Markdown>{about}</Markdown>
    </StyledDescription>
  );
}

const StyledDescription = styled(Container)({
  width: "100%",
  padding: "30px",
});
