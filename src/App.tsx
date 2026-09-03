import { GlobalStyles, ThemeProvider } from "@mui/material";
import { APP_NAME } from "config";
import { useAppSettings } from "hooks/hooks";
import { Suspense, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { RouterProvider } from "react-router-dom";
import { getGlobalStyles } from "styles";
import { useRouter } from "router/router";
import "styles";
import { darkTheme, lightTheme, useInitThemeMode } from "theme";
import { getStartParam, isTelegram, initTelegram } from "multisig/utils/telegram";

const useInitApp = () => {
  useInitThemeMode();
};

// Перенаправление из Telegram Mini App на страницу предложения, если переход
// открыт кнопкой бота («Открыть в приложении») — в start_param передан адрес.
// isTelegram()/getStartParam() читаются НА МОМЕНТ вызова (SDK подставляется
// асинхронно), поэтому проверяем повторно несколько раз с паузой, пока SDK не
// будет готов, а затем переходим на /proposal/<адрес>.
function TelegramStartParamRedirect({ router }: { router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;

    const tryRedirect = () => {
      if (cancelled) return;
      if (!isTelegram()) return;
      const param = getStartParam();
      if (param) {
        router.navigate(`/proposal/${param}`, { replace: true });
        return;
      }
      if (attempts < MAX_ATTEMPTS) {
        attempts += 1;
        setTimeout(tryRedirect, 300);
      }
    };

    tryRedirect();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}

function App() {
  useInitApp();

  useEffect(() => {
    initTelegram();
  }, []);

  useEffect(() => {
    const loader = document.querySelector(".app-loader");
    if (loader) {
      loader.classList.add("app-loader-hidden");
      setTimeout(() => {
        loader.classList.add("app-loader-none");
      }, 300);
    }
  }, []);

  const { isDarkMode } = useAppSettings();
  const router = useRouter();

  const theme = useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.palette.mode);
  }, [theme.palette.mode]);

  return (
    <>
      <Helmet>
        <title>{APP_NAME}</title>
      </Helmet>
      <ThemeProvider theme={theme}>
        <GlobalStyles styles={getGlobalStyles(theme)} />
        <Suspense>
          <RouterProvider router={router} />
          <TelegramStartParamRedirect router={router} />
        </Suspense>
      </ThemeProvider>
    </>
  );
}

export default App;
