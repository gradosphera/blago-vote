import {
  Button as MuiButton,
  IconButton,
  MenuItem,
  styled,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Box } from "@mui/system";
import { AppTooltip, Button, Github, Menu, TgIcon } from "components";
import { StyledFlexRow, StyledGrid } from "styles";
import { useState } from "react";
import { useAppNavigation, appNavigation } from "router/navigation";
import { useAppSettings, useCopyToClipboard } from "hooks/hooks";
import { APP_NAME, LANGUAGES } from "config";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsGlobeAmericas } from "react-icons/bs";
import _ from "lodash";
import LogoImg from "assets/logo.svg";
import { MOBILE_WIDTH } from "consts";
import { useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { tryConnectEmbeddedWallet } from "components/connectEmbedded";
import { getBorderColor } from "theme";
import { BlagoBalanceBadge } from "./BlagoBalanceBadge";

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
          {/* <LanguageSelect /> */}
          <BlagoBalanceBadge />
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
  const { t } = useTranslation("common");
  return (
    <StyledMultisigTab to={appNavigation.multisigPage.root()} $active={active}>
      <TgIcon name="wallet" size={16} />
      {t("multisig")}
    </StyledMultisigTab>
  );
};

const StyledMultisigTab = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active: number }>(({ theme, $active }) => ({
  textDecoration: "none",
  height: "unset",
  display: "flex",
  alignItems: "center",
  gap: 6,
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
        <TgIcon name={isDarkMode ? "sun" : "moon"} size={20} />
      </StyledThemeToggle>
    </AppTooltip>
  );
};

const StyledThemeToggle = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#ffd54f" : "#000000",
  border: `1px solid ${getBorderColor(theme.palette.mode)}`,
  background:
    theme.palette.mode === "dark"
      ? "rgba(229,229,234,0.08)"
      : "rgba(19,19,20,0.04)",
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

const LanguageSelect = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { i18n } = useTranslation();

  const currentLanguage =
    LANGUAGES[i18n.language as keyof typeof LANGUAGES] || LANGUAGES.en;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSelect = (key: string) => {
    i18n.changeLanguage(key);
    setAnchorEl(null);
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
                onClick={() => handleSelect(key)}
                selected={i18n.language === key}
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
    color: theme.palette.mode === "dark" ? "#ffffff" : "#000000",
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

// Стеклянная шапка: полупрозрачный фон + размытие, как у нижнего меню
// (MobileNav). Фон всегда одинаковый, поэтому при скролле не возникает
// перехода «непрозрачная -> полупрозрачная»; снизу оставлен тонкий контур,
// отделяющий шапку от контента.
const StyledContainer = styled(StyledFlexRow)(({ theme }) => {
  const dark = theme.palette.mode === "dark";
  return {
    background: dark ? "rgba(19, 19, 20, 0.72)" : "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
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
  };
});

const StyledNav = styled(StyledGrid)({
  display: "flex",
  justifyContent: "space-between",
  flexDirection: "row",
});

function ConnectButton() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [, copy] = useCopyToClipboard();

  const walletName = (wallet && (wallet as any).name) as string | undefined;
  const display = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "Кошелек";

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (address) {
      setAnchorEl(event.currentTarget);
      return;
    }
    const embeddedConnected = await tryConnectEmbeddedWallet(tonConnectUI);
    if (!embeddedConnected) {
      tonConnectUI.openModal().catch((e) => {
        console.error("Не удалось открыть окно подключения кошелька:", e);
      });
    }
  };

  const handleCopy = () => {
    if (address) {
      copy(address);
    }
    setAnchorEl(null);
  };

  const handleDisconnect = () => {
    setAnchorEl(null);
    tonConnectUI.disconnect().catch((e) => {
      console.error("Не удалось отключить кошелёк:", e);
    });
  };

  return (
    <>
      <StyledConnectButton
        connected={address ? 1 : 0}
        onClick={handleClick}
      >
        {display}
      </StyledConnectButton>
      <StyledWalletMenu anchorEl={anchorEl} setAnchorEl={setAnchorEl}>
        {address ? (
          <StyledWalletMenuItem>
            <Typography>{walletName}</Typography>
            <Typography className="address">{address}</Typography>
          </StyledWalletMenuItem>
        ) : null}
        <MenuItem onClick={handleCopy}>Скопировать адрес</MenuItem>
        <MenuItem onClick={handleDisconnect}>Выйти</MenuItem>
      </StyledWalletMenu>
    </>
  );
}

const StyledWalletMenu = styled(Menu)({
  "& .address": {
    fontSize: 12,
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  "& .MuiMenuItem-root": {
    minWidth: 220,
  },
});

const StyledWalletMenuItem = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 16px",
  borderBottom: `1px solid ${getBorderColor(theme.palette.mode)}`,
}));

const StyledConnectButton = styled(MuiButton)<{ connected: number }>(
  ({ theme, connected }) => ({
    borderRadius: 40,
    height: 40,
    padding: "0 20px",
    fontSize: 14,
    fontWeight: 700,
    textTransform: "none",
    background: connected
      ? theme.palette.background.paper
      : theme.palette.primary.main,
    color: connected ? theme.palette.primary.main : "#fff",
    border: connected
      ? `1px solid ${theme.palette.primary.main}`
      : "none",
    "&:hover": {
      background: connected
        ? theme.palette.action.hover
        : theme.palette.primary.dark,
    },
    [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
      height: 36,
      padding: "0 12px",
      fontSize: 13,
      maxWidth: "calc(100vw - 246px)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
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
