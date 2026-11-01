import _ from "lodash";

/** Получает базовый путь из окружения Vite */
const getBase = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

/** Конвертирует относительный route в абсолютный путь для сравнений с pathname */
export function toAbs(route: string): string {
  const base = getBase();
  if (route === "." || route === "") return base || "/";
  if (route.startsWith(":") || route.startsWith("*")) return `${base}/${route}`;
  return `${base}/${route}`;
}

export const routes = {
  // Относительные пути (без ведущего /) — React Router v6 требует этого
  // для вложенных роутов при деплое на подпуть (/blago-vote/).
  spaces: ".",
  manage: "manage",
  createSpace: "setup",
  // short proposal routes (preferred)
  proposal: "proposal/:proposalId",
  editProposal: "proposal/:proposalId/edit",
  // legacy routes (kept for backward compatibility)
  proposalLegacy: ":daoId/proposal/:proposalId",
  editProposalLegacy: ":daoId/proposal/:proposalId/edit",
  space: ":daoId",
  spaceAbout: ":daoId/about",
  spaceSettings: ":daoId/settings",
  createProposal: ":daoId/create",
  // multisig (Мультикошелек)
  multisig: "multisig",
  multisigImport: "multisig/import",
  multisigCreate: "multisig/new",
  multisigAddress: "multisig/:address",
  multisigNewOrder: "multisig/:address/new-order",
  multisigOrder: "multisig/:address/order/:orderId",
};

export const flatRoutes = _.map(routes, (value) => {
  return { path: toAbs(value) };
});

export const TOOLBAR_WIDTH = 60;
export const ZERO_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

export const TELETGRAM_URL = "https://t.me/gradosphera";
export const SUPPORT_URL = "https://t.me/gradosphera?direct";
export const WHITEPAPER_URL = "https://github.com/gradosphera/whitepaper";
export const ABOUT_URL = "https://gradosphera.ru";
export const ABOUT_CHARS_LIMIT = 10000;
export const TITLE_LIMIT = 180;

export const MOBILE_WIDTH = 768;

export const ONE_WALLET_ONE_VOTE_URL =
  "https://github.com/gradosphera/blago-vote?tab=readme-ov-file#supported-strategies";
