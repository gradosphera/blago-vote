import { Box, styled } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiGrid, FiCreditCard } from "react-icons/fi";
import { MOBILE_WIDTH, TOOLBAR_WIDTH } from "consts";
import { appNavigation } from "router/navigation";
import { getBorderColor } from "theme";

// Нижняя навигация для мобильной версии / Telegram Mini App:
// 3 кнопки с чёрно-белыми линейными иконками 28×28.
//   🏠 «на главную»  -> "/"
//   🗳 «ДАО»         -> "/manage" (страница ДАО пользователя)
//   👛 «мультикошелек»-> "/multisig"
export function MobileNav() {
  const location = useLocation();

  const items = [
    {
      label: "Главная",
      icon: <FiHome />,
      to: appNavigation.daosPage.root(),
      active: location.pathname === "/",
    },
    {
      label: "ДАО",
      icon: <FiGrid />,
      to: appNavigation.managePage.root(),
      active: location.pathname === "/manage",
    },
    {
      label: "Мультикошелек",
      icon: <FiCreditCard />,
      to: appNavigation.multisigPage.root(),
      active: location.pathname.startsWith("/multisig"),
    },
  ];

  return (
    <StyledContainer>
      {items.map((item) => (
        <StyledLink key={item.to} to={item.to} $active={item.active ? 1 : 0}>
          <StyledIcon $active={item.active ? 1 : 0}>{item.icon}</StyledIcon>
          <StyledLabel $active={item.active ? 1 : 0}>{item.label}</StyledLabel>
        </StyledLink>
      ))}
    </StyledContainer>
  );
}

const StyledContainer = styled(Box)(({ theme }) => ({
  display: "none",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    display: "flex",
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: TOOLBAR_WIDTH,
    background: theme.palette.background.paper,
    borderTop: `0.5px solid ${getBorderColor(theme.palette.mode)}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 -4px 16px rgba(0,0,0,0.35)"
        : "0 -4px 16px rgba(0,0,0,0.08)",
    zIndex: 30,
  },
}));

const StyledLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active: number }>(({ theme, $active }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  textDecoration: "none",
  color: $active ? theme.palette.primary.main : theme.palette.text.secondary,
}));

const StyledIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active: number }>(({ $active }) => ({
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: $active ? "currentColor" : "currentColor",
  svg: { width: 28, height: 28 },
}));

const StyledLabel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$active",
})<{ $active: number }>(({ theme, $active }) => ({
  fontSize: 11,
  fontWeight: $active ? 700 : 500,
  color: $active ? theme.palette.primary.main : theme.palette.text.secondary,
  maxWidth: 90,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
}));
