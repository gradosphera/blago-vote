import Layout from "layout/Layout";
import { Box, Button, Typography } from "@mui/material";
import _ from "lodash";
import { routes } from "consts";
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
          to={routes.spaces}
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
      createBrowserRouter([
        {
          path: "/",
          element: <Layout />,
          children: [
            {
              path: routes.spaces,
              element: (
                <Suspense fallback={<DaosPageFallback />}>
                  <DaosPage />
                </Suspense>
              ),
            },
            {
              path: routes.createSpace,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <CreateDao />
                </Suspense>
              ),
            },

            {
              path: routes.space,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<DaoPageFallback />}>
                  <Dao />
                </Suspense>
              ),
              children: [
                {
                  path: routes.createProposal,
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
                  path: routes.spaceSettings,
                  errorElement: <RouteError />,
                  element: (
                    <Suspense fallback={<PageFallback />}>
                      <DaoSettings />
                    </Suspense>
                  ),
                },
                {
                  path: routes.spaceAbout,
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
              path: routes.proposal,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <Proposal />
                </Suspense>
              ),
              children: [
                {
                  path: routes.proposal,
                  errorElement: <RouteError />,
                  element: (
                    <Suspense fallback={<PageFallback />}>
                      <ProposalDisplay />
                    </Suspense>
                  ),
                },
                {
                  path: routes.editProposal,
                  errorElement: <RouteError />,
                  element: devFeatures ? (
                    <Suspense fallback={<PageFallback />}>
                      <EditProposal />
                    </Suspense>
                  ) : (
                    <Navigate to={routes.proposal} />
                  ),
                },
              ],
            },
            // multisig (Мультикошелек)
            {
              path: routes.multisig,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <MultisigPage />
                </Suspense>
              ),
            },
            {
              path: routes.multisigImport,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <ImportMultisig />
                </Suspense>
              ),
            },
            {
              path: routes.multisigCreate,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <CreateMultisig />
                </Suspense>
              ),
            },
            {
              path: routes.multisigAddress,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <MultisigView />
                </Suspense>
              ),
            },
            {
              path: routes.multisigNewOrder,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <NewOrder />
                </Suspense>
              ),
            },
            {
              path: routes.multisigOrder,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <OrderView />
                </Suspense>
              ),
            },

            // legacy proposal routes
            {
              path: routes.proposalLegacy,
              errorElement: <RouteError />,
              element: (
                <Suspense fallback={<PageFallback />}>
                  <Proposal />
                </Suspense>
              ),
              children: [
                {
                  path: routes.proposalLegacy,
                  errorElement: <RouteError />,
                  element: (
                    <Suspense fallback={<PageFallback />}>
                      <ProposalDisplay />
                    </Suspense>
                  ),
                },
                {
                  path: routes.editProposalLegacy,
                  errorElement: <RouteError />,
                  element: devFeatures ? (
                    <Suspense fallback={<PageFallback />}>
                      <EditProposal />
                    </Suspense>
                  ) : (
                    <Navigate to={routes.proposal} />
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
      ]),
    [devFeatures]
  );
};
