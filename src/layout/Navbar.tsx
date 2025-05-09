import {
  Chip,
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
import { useAppNavigation } from "router/navigation";
import { useAppSettings, useDevFeatures } from "hooks/hooks";
import { APP_NAME, LANGUAGES } from "config";
import { useTranslation } from "react-i18next";
import { BsGlobeAmericas } from "react-icons/bs";
import _ from "lodash";
import LogoImg from "assets/logo.svg";
import { MOBILE_WIDTH } from "consts";
import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";
import { getBorderColor } from "theme";
import { useSettingsStore } from "store";
import { FiMoon, FiSun } from "react-icons/fi";

export function Navbar() {
  const mobile = useMediaQuery("(max-width:600px)");
  const { createSpace } = useAppNavigation();
  const devFeatures = useDevFeatures();
  return (
    <StyledContainer>
      <StyledNav>
        <StyledLogo>
          <img src={LogoImg} />
          <Typography style={{ marginTop: 5 }}>{APP_NAME}</Typography>
        </StyledLogo>
        <StyledFlexRow style={{ width: "fit-content" }}>
          <EnvModeIndication />
          <ConnectButton />
          <ThemeToggle />
        </StyledFlexRow>
      </StyledNav>
    </StyledContainer>
  );
}

const EnvModeIndication = () => {
  const devFeatures = useDevFeatures();
  const {setBeta, beta} = useAppSettings()

  const onClick = () => {
    if(beta) {
      setBeta(false)
    }
  }

  if (devFeatures) {
    return <StyledDev label="Dev" onClick={onClick} />;
  }
  return null;
};

const ThemeToggle = () => {
  const { toggleTheme, isDarkMode } = useAppSettings();
  return (
    <AppTooltip text={isDarkMode ? "Светлый режим" : "Темный режим"}>
      <StyledThemeToggle onClick={toggleTheme}>
        {isDarkMode ? <FiSun /> : <FiMoon />}
      </StyledThemeToggle>
    </AppTooltip>
  );
};

const StyledThemeToggle = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? theme.palette.primary.main : "black",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    padding: 3,
  },
}));

const StyledDev = styled(Chip)({
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    fontSize: 10,
    ".MuiChip-label": {
      padding: "0px 8px",
    },
  },
});

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
