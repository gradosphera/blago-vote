import { Typography, useTheme, Box } from "@mui/material";
import { useTonAddress } from "@tonconnect/ui-react";
import {
  AppTooltip,
  VerifiedDao,
  WalletStyleCard,
} from "components";
import { mock } from "mock/mock";
import { AiFillEyeInvisible } from "react-icons/ai";
import { useIntersectionObserver } from "react-intersection-observer-hook";
import { useAppNavigation } from "router/navigation";
import { Dao } from "types";
import {
  areTonAddressesEqual,
  getIsVerifiedDao,
  makeElipsisAddress,
  parseLanguage,
  sanitizeDaoName,
} from "utils";
import debatesLogo from "assets/debates.svg";

// Маппинг известных DAO → локальные логотипы
const DAO_AVATAR_MAP: { [key: string]: string } = {
  "EQCOjq7w658I7FjGoMdJdWxpkw6pHvSBQHkfs-wCBCbhU8BU": debatesLogo,
};

const resolveAvatar = (daoAddress: string, avatar?: string): string | undefined => {
  return DAO_AVATAR_MAP[daoAddress] || avatar;
};

export const DaoListItem = ({ dao }: { dao: Dao }) => {
  const [ref, { entry }] = useIntersectionObserver();
  const isVisible = entry == null || entry.isIntersecting;
  const { daoPage } = useAppNavigation();
  const metadataArgs = dao.daoMetadata?.metadataArgs;
  const walletAddress = useTonAddress();
  const theme = useTheme();

  const isOwner =
    areTonAddressesEqual(dao.daoRoles.owner, walletAddress) ||
    areTonAddressesEqual(dao.daoRoles.proposalOwner, walletAddress);

  if ((metadataArgs.hide || !getIsVerifiedDao(dao.daoAddress)) && !isOwner) return null;

  const mockPrefix = mock.isMockDao(dao.daoAddress) ? "(mock)" : "";
  const name = sanitizeDaoName(parseLanguage(metadataArgs?.name) || "");
  const addressText = metadataArgs?.dns
    ? metadataArgs.dns
    : makeElipsisAddress(dao.daoAddress, 6);
  const avatar = resolveAvatar(dao.daoAddress, metadataArgs?.avatar);

  const hiddenIcon = (metadataArgs.hide || !getIsVerifiedDao(dao.daoAddress)) && isOwner ? (
    <AppTooltip text="Dao is hidden, you can change it in the settings page">
      <AiFillEyeInvisible
        style={{ width: 25, height: 25 }}
        color={theme.palette.primary.main}
      />
    </AppTooltip>
  ) : null;

  return (
    <Box ref={ref} sx={{ width: "100%" }}>
      {isVisible ? (
        <WalletStyleCard
          name={name + mockPrefix}
          address={addressText}
          avatar={avatar}
          hiddenIcon={hiddenIcon}
          children={<VerifiedDao daoAddress={dao.daoAddress} />}
          onClick={() => daoPage.root(dao.daoAddress)}
        />
      ) : null}
    </Box>
  );
};
