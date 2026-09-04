import { Fade, styled } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { StyledFlexColumn, StyledGrid } from "styles";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";
import ScrollTop from "components/ScrollTop";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./ErrorBoundary";
import { Toolbar } from "./Toolbar";
import { ReactNode, useEffect } from "react";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { MOBILE_WIDTH, TOOLBAR_WIDTH } from "consts";
import { useAppQueryParams, useAppSettings } from "hooks/hooks";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { LatestBlock } from "components";
import { useSettingsStore } from "store";
import { getStartParam, isTelegram } from "multisig/utils/telegram";

const useIsBeta = () => {
  const {
    query: { dev },
  } = useAppQueryParams();
  const setBeta = useAppSettings().setBeta;

  useEffect(() => {
    if (dev) {
      setBeta(true);
    }
  }, [dev, setBeta]);
};

// Перенаправление из Telegram Mini App на страницу предложения, если переход
// открыт кнопкой бота («Открыть в приложении») — в start_param передан адрес.
// Компонент находиТСЯ ВНУТРИ Router, поэтому useNavigate() гарантированно
// работает. isTelegram()/getStartParam() читаются на момент вызова (SDK
// подставляется асинхронно), поэтому повторяем попытки с паузой.
function TelegramStartParamRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTelegram()) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    const tryRedirect = () => {
      if (cancelled) return;
      const param = getStartParam();
      if (param) {
        navigate(`/proposal/${param}`, { replace: true });
        return;
      }
      if (attempts < MAX_ATTEMPTS) {
        attempts += 1;
        setTimeout(tryRedirect, 250);
      }
    };

    tryRedirect();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}

function Layout({ children }: { children?: ReactNode }) {
  useIsBeta();
  const sidebarHidden = useSettingsStore((s) => s.sidebarHidden);

  return (
    <>
      <Fade in={true} timeout={500}>
        <StyledContainer>
          <Toolbar />
          <Navbar />
          <ErrorBoundary
            fallbackRender={(props) => <ErrorFallback {...props} />}
          >
            <StyledContent toolbarOffset={!sidebarHidden}>
              {children}
              <Outlet />
              <Footer />
            </StyledContent>
          </ErrorBoundary>
        </StyledContainer>
      </Fade>
      <TelegramStartParamRedirect />
      <ScrollTop />
      {/* <LatestBlock /> */}
      <Toaster
        toastOptions={{
          className: "toast",
        }}
      />
    </>
  );
}

const Wrapped = ({ children }: { children?: ReactNode }) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      <Layout>{children}</Layout>
      <ReactQueryDevtools />
    </QueryParamProvider>
  );
};

const StyledContent = styled(StyledGrid, {
  shouldForwardProp: (prop) => prop !== "toolbarOffset",
})<{ toolbarOffset?: boolean }>(({ toolbarOffset }) => ({
  paddingTop: 100,
  paddingBottom: toolbarOffset ? TOOLBAR_WIDTH + 24 : 24,
  flex: 1,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    paddingTop: 80,
  },
}));

const StyledContainer = styled(StyledFlexColumn)({
  minHeight: "100vh",
  gap: 0,
  display: "flex",
});

export default Wrapped;
