import { routes, toAbs } from "consts";
import { useNavigate } from "react-router-dom";

export const appNavigation = {
  spaces: toAbs(routes.spaces),
  daosPage: {
    root: () => toAbs(routes.spaces),
  },
  managePage: {
    root: () => toAbs(routes.manage),
  },
  daoPage: {
    root: (daoId: string) => `${toAbs(routes.space).replace(":daoId", daoId)}`,
    about: (daoId: string) => `${toAbs(routes.spaceAbout).replace(":daoId", daoId)}`,
    create: (daoId: string) => toAbs(routes.createProposal).replace(":daoId", daoId),
    settings: (daoId: string) => toAbs(routes.spaceSettings).replace(":daoId", daoId),
  },
  proposalPage: {
    root: (proposalId: string) =>
      toAbs(routes.proposal).replace(":proposalId", proposalId),
    edit: (proposalId: string) =>
      toAbs(routes.editProposal).replace(":proposalId", proposalId),
  },
  multisigPage: {
    root: () => toAbs(routes.multisig),
    address: (address: string) => toAbs(routes.multisigAddress).replace(":address", address),
    newOrder: (address: string) =>
      toAbs(routes.multisigNewOrder).replace(":address", address),
    order: (address: string, orderId: string | bigint) =>
      toAbs(routes.multisigOrder)
        .replace(":address", address)
        .replace("*", orderId.toString()),
    create: () => toAbs(routes.multisigCreate),
    import: () => toAbs(routes.multisigImport),
  },
};

export const useAppNavigation = () => {
  const navigate = useNavigate();

  return {
    daoPage: {
      root: (daoId: string) => navigate(appNavigation.daoPage.root(daoId)),
      createProposal: (daoId: string) =>
        navigate(appNavigation.daoPage.create(daoId)),
      about: (daoId: string) => navigate(appNavigation.daoPage.about(daoId)),
    },
    proposalPage: {
      edit: (proposalId: string) =>
        navigate(appNavigation.proposalPage.edit(proposalId)),

      root: (proposalId: string) =>
        navigate(appNavigation.proposalPage.root(proposalId)),
    },
    daosPage: {
      root: () => navigate(appNavigation.daosPage.root()),
    },
    createSpace: {
      root: () => navigate(toAbs(routes.createSpace)),
    },
    multisigPage: {
      root: () => navigate(appNavigation.multisigPage.root()),
      address: (address: string) =>
        navigate(appNavigation.multisigPage.address(address)),
      newOrder: (address: string) =>
        navigate(appNavigation.multisigPage.newOrder(address)),
      order: (address: string, orderId: string | bigint) =>
        navigate(appNavigation.multisigPage.order(address, orderId)),
      create: () => navigate(appNavigation.multisigPage.create()),
      import: () => navigate(appNavigation.multisigPage.import()),
    },
  };
};
