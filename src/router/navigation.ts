import { routes } from "consts";
import { useNavigate } from "react-router-dom";

export const appNavigation = {
  spaces: routes.spaces,
  daoPage: {
    root: (daoId: string) => routes.space.replace(":daoId", daoId),
    about: (daoId: string) => `${routes.spaceAbout.replace(":daoId", daoId)}`,
    create: (daoId: string) => routes.createProposal.replace(":daoId", daoId),
    settings: (daoId: string) => routes.spaceSettings.replace(":daoId", daoId),
  },
  proposalPage: {
    root: (proposalId: string) =>
      routes.proposal.replace(":proposalId", proposalId),
    edit: (proposalId: string) =>
      routes.editProposal.replace(":proposalId", proposalId),
  },
  multisigPage: {
    root: () => routes.multisig,
    address: (address: string) => routes.multisigAddress.replace(":address", address),
    newOrder: (address: string) =>
      routes.multisigNewOrder.replace(":address", address),
    order: (address: string, orderId: string | bigint) =>
      routes.multisigOrder
        .replace(":address", address)
        .replace(":orderId", orderId.toString()),
    create: () => routes.multisigCreate,
    import: () => routes.multisigImport,
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
      root: () => navigate(routes.spaces),
    },
    createSpace: {
      root: () => navigate(routes.createSpace),
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
