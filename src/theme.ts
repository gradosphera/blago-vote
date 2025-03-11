import { createTheme, Theme } from "@mui/material";
import { useAppSettings } from "hooks/hooks";
import { useEffect } from "react";
import { useSettingsStore } from "store";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#F8F9FB",
      paper: "white",
    },
    error: {
      main: "#d32f2f",
    },
    primary: {
      main: "#0098ea",
    },
    text: {
      primary: "rgb(30, 35, 55)",
      secondary: "rgb(22, 28, 40)",
    },
  },

  typography: {
    allVariants: {
      color: "rgb(30, 35, 55)",
      fontFamily: "inter",
    },
    h1: {
      fontSize: 44,
      fontWeight: 800,
      color: "rgb(22, 28, 40)",
    },
    h2: {
      fontSize: 20,
      fontWeight: 800,
      color: "rgb(22, 28, 40)",
    },
    h4: {
      fontSize: 20,
      fontWeight: 800,
      color: "rgb(22, 28, 40)",
    },
    fontFamily: "inter",
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1E2337",
      paper: "#1E2337",
    },
    error: {
      main: "#d32f2f",
    },
    primary: {
      main: "#0098ea",
    },
    text: {
      primary: "rgba(255,255,255,0.8)",
      secondary: "rgba(255,255,255,0.8)",
    },
  },

  typography: {
    allVariants: {
      color: "rgba(255,255,255,0.8)",
      fontFamily: "inter",
    },
    h1: {
      fontSize: 44,
      fontWeight: 800,
      color: "rgba(255,255,255,0.8)",
    },
    h2: {
      fontSize: 20,
      fontWeight: 800,
      color: "rgba(255,255,255,0.8)",
    },
    h4: {
      fontSize: 20,
      fontWeight: 800,
      color: "rgba(255,255,255,0.8)",
    },
    fontFamily: "inter",
  },
});

const darkThemeBorder = "rgba(255,255,255, 0.2)";
const lightModeBorder = "#e0e0e0";

export const getBorderColor = (mode: "light" | "dark") => {
  return mode === "light" ? lightModeBorder : darkThemeBorder;
};

export const useInitThemeMode = () => {
  const { themeMode, setThemeMode } = useAppSettings();

  useEffect(() => {
    if (themeMode) return;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeMode(isDark ? "dark" : "light");
  }, []);
};
