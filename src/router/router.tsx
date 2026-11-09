import Layout from "layout/Layout";
import { Box, Button, Typography } from "@mui/material";
import _ from "lodash";
import { routes, toAbs } from "consts";
import { createBrowserRouter, Navigate, useRouteError, Link as RouterLink } from "react-router-dom";
import { lazy, Suspense, useMemo } from "react";
import { useDevFeatures } from "hooks/hooks";
import { DaoPageFallback, DaosPageFallback, PageFallback } from "./fallbacks";
import {
  BadRoute,
  CreateProposal,
  Dao,
  DaoAbout,
  DaosPage,
  ManageDaosPage,
  EditProposal,
  Proposal,
  ProposalDisplay,
  ProposalsList,
} from "pages";

function RouteError() {
  const error = useRouteError();
  console.error("Route error:", error);
  return (
    <Box style={{ padding: 60, textAlign: "center" }}>
      <Typography variant="h5" style={{ marginBottom: 20 }}>
        Не удалось загрузить страницу
      </Typography>
      <Button variant="contained">
        <RouterLink
          to={toAbs(routes.spaces)}
          style={{ color: "white", textDecoration: "none" }}
        >
          На главную
        </RouterLink>
      </Button>
    </Box>
  );
}

const CreateDao = lazy(() => import("pages/create-dao/CreateDao"));
const DaoSettings = lazy(() => import("pages/dao/DaoSettings/DaoSettings"));
const MultisigPage = lazy(() => import("pages/multisig/MultisigPage"));
const MultisigView = lazy(() => import("pages/multisig/MultisigView"));
const NewOrder = lazy(() => import("pages/multisig/NewOrder"));
const OrderView = lazy(() => import("pages/multisig/OrderView"));
const CreateMultisig = lazy(() => import("pages/multisig/CreateMultisig"));
const ImportMultisig = lazy(() => import("pages/multisig/ImportMultisig"));

export const useRouter = () => {
  const devFeatures = useDevFeatures();

  return useMemo(
    () =>
      createBrowserRouter(
        [
          {
            path: "/",
            element: <Layout />,
            children: [
              {
                path: toAbs(routes.spaces),
                element: (
                  <Suspense fallback={<DaosPageFallback />}>
                    <DaosPage />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.manage),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<DaosPageFallback />}>
                    <ManageDaosPage />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.createSpace),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <CreateDao />
                  </Suspense>
                ),
              },

              {
                path: toAbs(routes.space),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<DaoPageFallback />}>
                    <Dao />
                  </Suspense>
                ),
                children: [
                  {
                    path: toAbs(routes.createProposal),
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <CreateProposal />
                      </Suspense>
                    ),
                  },
                  {
                    index: true,
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <ProposalsList />
                      </Suspense>
                    ),
                  },
                  {
                    path: toAbs(routes.spaceSettings),
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <DaoSettings />
                      </Suspense>
                    ),
                  },
                  {
                    path: toAbs(routes.spaceAbout),
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <DaoAbout />
                      </Suspense>
                    ),
                  },
                ],
              },
              {
                path: toAbs(routes.proposal),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Proposal />
                  </Suspense>
                ),
                children: [
                  {
                    path: toAbs(routes.proposal),
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <ProposalDisplay />
                      </Suspense>
                    ),
                  },
                  {
                    path: toAbs(routes.editProposal),
                    errorElement: <RouteError />,
                    element: devFeatures ? (
                      <Suspense fallback={<PageFallback />}>
                        <EditProposal />
                      </Suspense>
                    ) : (
                      <Navigate to={toAbs(routes.proposal)} />
                    ),
                  },
                ],
              },
              // multisig (Мультикошелек)
              {
                path: toAbs(routes.multisig),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <MultisigPage />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.multisigImport),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <ImportMultisig />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.multisigCreate),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <CreateMultisig />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.multisigNewOrder),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <NewOrder />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.multisigOrder),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <OrderView />
                  </Suspense>
                ),
              },
              {
                path: toAbs(routes.multisigAddress),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <MultisigView />
                  </Suspense>
                ),
              },

              // legacy proposal routes
              {
                path: toAbs(routes.proposalLegacy),
                errorElement: <RouteError />,
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Proposal />
                  </Suspense>
                ),
                children: [
                  {
                    path: toAbs(routes.proposalLegacy),
                    errorElement: <RouteError />,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <ProposalDisplay />
                      </Suspense>
                    ),
                  },
                  {
                    path: toAbs(routes.editProposalLegacy),
                    errorElement: <RouteError />,
                    element: devFeatures ? (
                      <Suspense fallback={<PageFallback />}>
                        <EditProposal />
                      </Suspense>
                    ) : (
                      <Navigate to={toAbs(routes.proposal)} />
                    ),
                  },
                ],
              },
            ],
            errorElement: (
              <Suspense fallback={<PageFallback />}>
                <BadRoute />
              </Suspense>
            ),
          },
        ],
      ),
    [devFeatures]
  );
};
