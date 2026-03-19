import _ from "lodash";

export const routes = {
  spaces: "/",
  createSpace: "/setup",
  // short proposal routes (preferred)
  proposal: "/proposal/:proposalId",
  editProposal: "/proposal/:proposalId/edit",
  // legacy routes (kept for backward compatibility)
  proposalLegacy: "/:daoId/proposal/:proposalId",
  editProposalLegacy: "/:daoId/proposal/:proposalId/edit",
  space: "/:daoId",
  spaceAbout: "/:daoId/about",
  spaceSettings: "/:daoId/settings",
  createProposal: "/:daoId/create",
};

export const flatRoutes = _.map(routes, (value) => {
  return { path: value };
});

export const TOOLBAR_WIDTH = 60;
export const ZERO_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

export const TELETGRAM_URL = "https://t.me/gradosphera";
export const SUPPORT_URL = "https://t.me/gradosphera?direct";
export const WHITEPAPER_URL = "https://github.com/gradosphera/whitepaper";
export const ABOUT_URL = "https://gradosphera.org";
export const ABOUT_CHARS_LIMIT = 2350;
export const TITLE_LIMIT = 180;

export const MOBILE_WIDTH = 768;

export const ONE_WALLET_ONE_VOTE_URL =
  "https://github.com/gradosphera/blago-vote?tab=readme-ov-file#supported-strategies";
