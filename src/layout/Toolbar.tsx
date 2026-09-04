import { Box, styled } from "@mui/material";
import { useTonAddress } from "@tonconnect/ui-react";
import { AppTooltip, Button, Img } from "components";
import { DevParametersModal } from "components/DevParameters";
import { MOBILE_WIDTH, TOOLBAR_WIDTH } from "consts";
import { useRole } from "hooks/hooks";
import { useDaosQuery } from "query/getters";
import { AiOutlinePlus } from "react-icons/ai";
import { Link, useParams } from "react-router-dom";
import { appNavigation, useAppNavigation } from "router/navigation";
import { getBorderColor } from "theme";
import { parseLanguage } from "utils";

// Левая боковая панель с ДАО пользователя — только для десктопа.
// Постоянно открыта, кнопки скрытия/раскрытия нет (см. ScrollTop).
export function Toolbar() {
  const { createSpace } = useAppNavigation();

  return (
    <StyledToolbar>
      <StyledToolbarContent>
        <StyledTopArea>
          <DevParametersModal />
          <StyledCreateArea>
            <AppTooltip text="Создать новое ДАО" placement="right">
              <StyledButton onClick={createSpace.root} variant="transparent">
                <AiOutlinePlus />
              </StyledButton>
            </AppTooltip>
          </StyledCreateArea>
        </StyledTopArea>
        <UserDaos />
      </StyledToolbarContent>
    </StyledToolbar>
  );
}

const StyledCreateArea = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const StyledTopArea = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  paddingTop: 12,
});

const StyledToolbar = styled(Box)(({ theme }) => ({
  width: TOOLBAR_WIDTH,
  background: theme.palette.background.paper,
  position: "fixed",
  left: 0,
  top: 70,
  bottom: 0,
  borderRight: `0.5px solid ${getBorderColor(theme.palette.mode)}`,
  zIndex: 25,
  overflowY: "auto",
  overflowX: "hidden",
  display: "flex",
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    display: "none",
  },
}));

const StyledToolbarContent = styled(Box)({
  height: "100%",
  minWidth: TOOLBAR_WIDTH,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  padding: "0 10px 16px",
});

const StyledButton = styled(Button)({
  borderRadius: "50%",
  cursor: "pointer",
  padding: 10,
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  svg: { width: 20, height: 20 },
});

const UserDaos = () => {
  const { data: daos } = useDaosQuery();
  const connectedWallet = useTonAddress();

  const { getRole } = useRole();

  const daoId = useParams().daoId;

  if (!connectedWallet) {
    return null;
  }

  return (
    <StyledUserDaos>
      {daos &&
        daos?.map((dao) => {
          const { isOwner, isProposalPublisher } = getRole(dao.daoRoles);

          if (isOwner || isProposalPublisher) {
            const selected = daoId === dao.daoAddress;
            return (
              <StyledLink
                selected={selected ? 1 : 0}
                to={appNavigation.daoPage.root(dao.daoAddress)}
                key={dao.daoAddress}
              >
                <AppTooltip
                  text={parseLanguage(dao.daoMetadata.metadataArgs.name)}
                  placement="right"
                >
                  <StyledDaoImg src={dao.daoMetadata.metadataArgs.avatar} />
                </AppTooltip>
              </StyledLink>
            );
          }
          return null;
        })}
    </StyledUserDaos>
  );
};

const StyledLink = styled(Link)<{ selected: number }>(({ selected, theme }) => {
  const shadow =
    theme.palette.mode === "light"
      ? "0px 0px 12px 3px rgba(0,136,204,1)"
      : "0px 0px 12px 3px rgba(255,255,255,0.25)";
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    transition: "0.2s all",
    boxShadow: selected === 1 ? shadow : "unset",
    borderRadius: "50%",
    border: selected === 1 ? `2px solid ${theme.palette.primary.main}` : "none",
  };
});

const StyledDaoImg = styled(Img)({
  width: 40,
  height: 40,
  borderRadius: "50%",
});

const StyledUserDaos = styled(Box)({
  flex: 1,
  gap: 16,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});
