import { Box, styled, Typography, useTheme } from "@mui/material";
import { MOBILE_WIDTH } from "consts";

const BADGE_GREEN = "#4bb34b";
const LOGO_SIZE = 56;

export interface WalletStyleCardProps {
  name: string;
  address: string;
  avatar?: string;
  jettonBalance?: string;
  jettonLogo?: string;
  jettonName?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  hiddenIcon?: React.ReactNode;
  removeBadge?: React.ReactNode;
}

const StyledWalletCard = styled(Box)(({ theme }) => {
  const borderColor =
    theme.palette.mode === "dark"
      ? "rgba(229, 229, 234, 0.12)"
      : "rgba(19, 19, 20, 0.10)";
  const hoverColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  const textColor = isDark ? "#e5e5ea" : "#1a1a1e";
  const textSecondary = isDark ? "#8a8a93" : "#6b6b72";
  const logoBg = isDark ? "rgba(229,229,234,0.08)" : "rgba(19,19,20,0.05)";

  return {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: 13,
    cursor: "pointer",
    transition: "border-color 0.2s",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gridTemplateRows: "1fr auto auto",
    alignItems: "center",
    justifyContent: "stretch",
    padding: "16px 20px",
    gap: "8px",
    background: theme.palette.background.paper,
    border: `1px solid ${borderColor}`,
    position: "relative" as const,
    aspectRatio: "8 / 5",
    minHeight: 0,
    "&:hover": {
      borderColor: hoverColor,
    },

    // === BALANCE (center-left) ===
    ".card-balance": {
      gridRow: "2",
      gridColumn: "1",
      justifySelf: "start",
      alignSelf: "center",
      display: "flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
    },
    ".card-balance-value": {
      fontSize: 20,
      fontWeight: 800,
      color: BADGE_GREEN,
      lineHeight: 1.2,
    },
    ".card-balance-label": {
      fontSize: 13,
      fontWeight: 600,
      color: BADGE_GREEN,
      opacity: 0.85,
    },

    // === LOGO (center-right) ===
    ".card-logo": {
      gridRow: "2",
      gridColumn: "2",
      justifySelf: "center",
      alignSelf: "center",
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      minWidth: LOGO_SIZE,
      minHeight: LOGO_SIZE,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      background: logoBg,
      position: "relative" as const,
      img: {
        width: "100%",
        height: "100%",
        objectFit: "contain" as const,
      },
    },

    // === NAME (bottom-left) ===
    ".card-name": {
      gridRow: "3",
      gridColumn: "1",
      justifySelf: "start",
      fontSize: 14,
      fontWeight: 800,
      lineHeight: "20px",
      color: textColor,
      overflowWrap: "break-word" as const,
      wordBreak: "break-word" as const,
      whiteSpace: "normal" as const,
    },

    // === ADDRESS WRAP (bottom-right) ===
    ".card-address-wrap": {
      gridRow: "3",
      gridColumn: "2",
      justifySelf: "end",
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "nowrap",
    },
    ".card-address": {
      fontSize: 12,
      lineHeight: "16px",
      color: textSecondary,
      fontFamily: "monospace",
      overflowWrap: "break-word" as const,
      wordBreak: "break-all" as const,
      whiteSpace: "nowrap" as const,
    },

    // === HIDDEN ICON (top-left) ===
    ".card-hidden": {
      position: "absolute" as const,
      left: 10,
      top: 10,
      zIndex: 2,
    },

    // === MOBILE ===
    [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gridTemplateRows: "1fr auto auto",
      padding: "10px 12px",
      gap: "4px",

      ".card-balance": {
        gridRow: "2",
        gridColumn: "1",
        justifySelf: "start",
        alignSelf: "center",
      },
      ".card-balance-value": {
        fontSize: 15,
      },
      ".card-balance-label": {
        fontSize: 10,
      },
      ".card-logo": {
        gridRow: "2",
        gridColumn: "2",
        justifySelf: "center",
        alignSelf: "center",
        width: 40,
        height: 40,
        minWidth: 40,
        minHeight: 40,
      },
      ".card-name": {
        gridRow: "3",
        gridColumn: "1",
        justifySelf: "start",
        fontSize: 11,
        lineHeight: "15px",
      },
      ".card-address-wrap": {
        gridRow: "3",
        gridColumn: "2",
        justifySelf: "end",
        alignSelf: "center",
      },
      ".card-address": {
        fontSize: 9,
        lineHeight: "13px",
      },
      ".card-hidden": {
        left: 6,
        top: 6,
      },
    },
  };
});

export function WalletStyleCard({
  name,
  address,
  avatar,
  jettonBalance,
  jettonLogo,
  jettonName = "Благо",
  badge,
  onClick,
  children,
  hiddenIcon,
}: WalletStyleCardProps) {
  const theme = useTheme();

  const formatBalance = (balance: string): string => {
    if (!balance) return "0";
    try {
      const value = BigInt(balance);
      return value.toLocaleString("ru-RU");
    } catch {
      return balance;
    }
  };

  return (
    <StyledWalletCard onClick={onClick}>
      {/* Hidden icon — top-left */}
      {hiddenIcon && <Box className="card-hidden">{hiddenIcon}</Box>}

      {/* Balance — center-left */}
      {jettonBalance && (
        <Box className="card-balance">
          {jettonLogo && (
            <img
              style={{ width: 18, height: 18, objectFit: "contain" }}
              src={jettonLogo}
              alt=""
            />
          )}
          <span className="card-balance-value">
            {formatBalance(jettonBalance)}
          </span>
          <span className="card-balance-label">{jettonName}</span>
        </Box>
      )}

      {/* Logo — center-right */}
      <Box className="card-logo">
        {avatar ? (
          <img src={avatar} alt="" />
        ) : (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: 20,
              color: theme.palette.text.secondary,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Typography>
        )}
        {/* Role badge — overlaid on logo top-right */}
        {badge && (
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              zIndex: 2,
            }}
          >
            {badge}
          </Box>
        )}
      </Box>

      {/* Name — bottom-left */}
      <Typography className="card-name">{name}</Typography>

      {/* Address + verification — bottom-right */}
      <Box className="card-address-wrap">
        <Typography className="card-address">{address}</Typography>
        {children}
      </Box>
    </StyledWalletCard>
  );
}
