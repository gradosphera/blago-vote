import {
  IconButton,
  MenuItem,
  styled,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Box } from "@mui/system";
import { AppTooltip, Button, Github, Menu } from "components";
import { StyledFlexRow, StyledGrid } from "styles";
import { useState } from "react";
import { useAppNavigation, appNavigation } from "router/navigation";
import { useAppSettings } from "hooks/hooks";
import { APP_NAME, LANGUAGES } from "config";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsGlobeAmericas } from "react-icons/bs";
import _ from "lodash";
import LogoImg from "assets/logo.svg";
import { MOBILE_WIDTH } from "consts";
import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";
import { getBorderColor } from "theme";
import { FiMoon, FiSun } from "react-icons/fi";

export function Navbar() {
  const mobile = useMediaQuery("(max-width:600px)");
  const { daosPage } = useAppNavigation();
  return (
    <StyledContainer>
      <StyledNav>
        <StyledLogo type="button" onClick={() => daosPage.root()}>
          <img src={LogoImg} alt="" />
          <Typography style={{ marginTop: 5 }}>{APP_NAME}</Typography>
        </StyledLogo>
        <StyledFlexRow style={{ width: "fit-content", gap: 8 }}>
          <MultisigTab />
          <ConnectButton />
          <ThemeToggle />
        </StyledFlexRow>
      </StyledNav>
    </StyledContainer>
  );
}

const MultisigTab = () => {
  const location = useLocation();
  const active = location.pathname.startsWith("/multisig") ? 1 : 0;
  return (
    <StyledMultisigTab to={appNavigation.multisigPage.root()} $active={active}>
      Мультикошелек
    </StyledMultisigTab>
  );
};

const StyledMultisigTab = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active: number }>(({ theme, $active }) => ({
  textDecoration: "none",
  height: "unset",
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: $active ? 700 : 500,
  color: $active
    ? theme.palette.primary.main
    : theme.palette.text.secondary,
  borderBottom: $active
    ? `2px solid ${theme.palette.primary.main}`
    : "2px solid transparent",
  borderRadius: 0,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    display: "none",
  },
}));

const ThemeToggle = () => {
  const { toggleTheme, isDarkMode } = useAppSettings();
  return (
    <AppTooltip text={isDarkMode ? "Дневной режим" : "Ночной режим"}>
      <StyledThemeToggle onClick={toggleTheme}>
        {isDarkMode ? <FiSun /> : <FiMoon />}
      </StyledThemeToggle>
    </AppTooltip>
  );
};

const StyledThemeToggle = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#ffd54f" : "#1e2337",
  border: `1px solid ${getBorderColor(theme.palette.mode)}`,
  background:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.04)",
  width: 40,
  height: 40,
  svg: { width: 20, height: 20 },
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    width: 36,
    height: 36,
    padding: 3,
    svg: { width: 18, height: 18 },
  },
}));

const LanuageSelect = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { i18n } = useTranslation();

  const currentLanguage =
    LANGUAGES[i18n.language as keyof typeof LANGUAGES] || LANGUAGES.en;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  return (
    <>
      <StyledLanguageSelectButton onClick={handleClick} variant="transparent">
        <StyledFlexRow>
          <BsGlobeAmericas />
          <Typography>{currentLanguage}</Typography>
        </StyledFlexRow>
      </StyledLanguageSelectButton>
      <Menu anchorEl={anchorEl} setAnchorEl={setAnchorEl}>
        <StyledLanguages>
          {_.map(LANGUAGES, (value, key) => {
            return (
              <MenuItem
                onClick={() => {
                  i18n.changeLanguage(key);
                  setAnchorEl(null);
                }}
                selected={currentLanguage === value}
                key={key}
              >
                {value}
              </MenuItem>
            );
          })}
        </StyledLanguages>
      </Menu>
    </>
  );
};

const StyledLanguages = styled(Box)({
  width: "100%",
});

const StyledLanguageSelectButton = styled(Button)({
  height: "unset",
  padding: "10px 20px",
  "*": { fontSize: 14 },
  svg: {
    width: 17,
    height: 17,
  },
});

const StyledLogo = styled("button")(({ theme }) => ({
  background: "transparent",
  border: "unset",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  margin: 0,
  padding: 0,
  gap: 10,
  p: {
    fontWeight: 800,
    position: "relative",
    color: theme.palette.text.secondary,
    fontSize: 25,
    top: -3,
  },
  img: {
    height: 40,
  },
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    p: {
      fontSize: 22,
    },
    img: {
      height: 35,
    },
  },
}));

const StyledContainer = styled(StyledFlexRow)(({ theme }) => ({
  background: theme.palette.background.paper,
  height: 70,
  position: "fixed",
  left: "50%",
  transform: "translate(-50%)",
  top: 0,
  zIndex: 20,
  borderBottom: `0.5px solid ${getBorderColor(theme.palette.mode)}`,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    height: 60,
  },
}));

const StyledNav = styled(StyledGrid)({
  display: "flex",
  justifyContent: "space-between",
  flexDirection: "row",
});

function ConnectButton() {
  const address = useTonAddress();

  return (
    <>
      <StyledButton connected={address ? 1 : 0} />
    </>
  );
}

const StyledButton = styled(TonConnectButton)<{ connected: number }>(
  ({ theme }) => ({
    button: {
      background: theme.palette.primary.main,
      "*": {
        color: "white",
        stroke: "white",
      },
    },
    [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
      "*": {
        fontSize: 13,
      },
    },
  })
);

const SettingsMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLButtonElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const onClick = () => {};

  return (
    <div>
      <button onClick={handleClick}>Dashboard</button>
      <Menu anchorEl={anchorEl} setAnchorEl={setAnchorEl}>
        <StyledLanguages>
          {_.map(LANGUAGES, (value, key) => {
            return (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                }}
                key={key}
              >
                {value}
              </MenuItem>
            );
          })}
        </StyledLanguages>
      </Menu>
    </div>
  );
};
