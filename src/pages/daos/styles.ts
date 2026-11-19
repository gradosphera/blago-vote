import { Box, Chip, styled, Typography } from "@mui/material";
import { Button, Container, Img, Search } from "components";
import { MOBILE_WIDTH } from "consts";
import { StyledFlexRow } from "styles";

export const StyledDaoContent = styled(Container)({
  display: "flex",
  flexDirection: "column",
  borderRadius: 13,
  height: "100%",
  padding: 20,
  position: "relative",
});

export const StyledJoinDao = styled(Button)({
  minWidth: "60%",
});

export const StyledDaoAvatar = styled(Img)({
  width: 80,
  height: 80,
  borderRadius: "50%",
  overflow: "hidden",
  marginBottom: 20,
});

// Карточка ДАО на главной: только аватар, имя и адрес с галочкой верификации.
// Карточка квадратная (aspectRatio 1); число колонок адаптивное (4/3/2/1).
// Используется только для loader и fallback — основные карточки используют WalletStyleCard.
export const StyledDao = styled(Box)({
  width: "calc(100% / 4 - 15px)",
  aspectRatio: "1 / 1",
  cursor: "pointer",
  ".container": {
    height: "100%",
    justifyContent: "center",
  },
});

export const StyledHeader = styled(StyledFlexRow)({
  justifyContent: "space-between",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
});

export const StyledWebsiteChip = styled(Chip)(({ theme }) => ({
  cursor: "pointer",
  "&:hover": {
    background: theme.palette.primary.main,
    "*": {
      color: "white",
    },
  },
}));

// Grid layout: 3 columns desktop → 2 columns tablet → 1 column mobile
export const StyledDaosList = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 15,
  width: "100%",

  "@media (max-width: 1050px)": {
    gridTemplateColumns: "repeat(2, 1fr)",
  },
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    gridTemplateColumns: "repeat(1, 1fr)",
    gap: 10,
  },
}));

export const StyledHiddenIcon = styled(Box)({
  position: "absolute",
  left: 10,
  top: 10,
});

export const StyledEmptyList = styled(Container)({
  width: "100%",
});

export const StyledDaosAmount = styled(Typography)({
  fontSize: 15,
  fontWeight: 700,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    textAlign: "right",
    width: "100%",
  },
});

export const StyledSearch = styled(Search)({
  maxWidth: 400,
  width: "100%",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    maxWidth: "unset",
  },
});

export const StyledAboutSection = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: "40px 20px",
  width: "100%",
  ".title": {
    fontSize: 28,
    fontWeight: 800,
    color: theme.typography.h2.color,
    marginBottom: 12,
  },
  ".subtitle": {
    fontSize: 16,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    maxWidth: 600,
    margin: "0 auto",
    lineHeight: "24px",
  },
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    padding: "30px 10px",
    ".title": {
      fontSize: 22,
    },
    ".subtitle": {
      fontSize: 14,
    },
  },
}));

// New DAO card — rectangular with dashed border
export const StyledNewDao = styled(Box)(({ theme }) => ({
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 13,
  cursor: "pointer",
  transition: "border-color 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "transparent",
  border:
    theme.palette.mode === "light"
      ? "1px dashed rgba(0,0,0 , 0.15)"
      : "1px dashed rgba(229,229,234, 0.2)",
  "&:hover": {
    border: `1px dashed ${theme.palette.primary.main}`,
  },
  ".container": {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  p: {
    textAlign: "center",
    fontWeight: 600,
    fontSize: 17,
  },
}));

export const StyledCreateAbout = styled(Typography)({
  fontSize: 14,
  opacity: 0.7,
  width: "100%",
  textAlign: "left",
});
