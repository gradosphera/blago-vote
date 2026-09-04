import { Box, Fade, styled } from "@mui/material";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { BsArrowUpShort } from "react-icons/bs";
import { MOBILE_WIDTH, TOOLBAR_WIDTH } from "consts";

function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <StyledContainer>
      <Fade in={show}>
        <StyledScrollBtn onClick={() => window.scrollTo({ top: 0, left: 0 })}>
          <BsArrowUpShort style={{ width: 35, height: 35, color: "white" }} />
        </StyledScrollBtn>
      </Fade>
    </StyledContainer>
  );
}

export default ScrollTop;

const StyledContainer = styled(Box)({
  position: "fixed",
  bottom: 20,
  right: isMobile ? 20 : 24,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  zIndex: 100,
  [`@media (max-width: ${MOBILE_WIDTH}px)`]: {
    bottom: TOOLBAR_WIDTH + 16,
  },
});

const StyledScrollBtn = styled("button")(({ theme }) => ({
  zIndex: 100,
  background: theme.palette.primary.main,
  borderRadius: "50%",
  border: "unset",
  width: 45,
  height: 45,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "0.1s all",
  "&:hover": {
    transform: "scale(1.1)",
  },
}));
