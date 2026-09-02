import { styled } from "@mui/material";
import React, { ReactNode } from "react";
import { StyledFlexRow, StyledTitle } from "styles";

interface Props {
  title: string;
  component?: ReactNode;
  className?: string;
}

export function Header({ title, component, className = '' }: Props) {
  return (
    <StyledHeader justifyContent="space-between" className={`header ${className}`}>
      <StyledHeaderTitle>{title}</StyledHeaderTitle>
      {component}
    </StyledHeader>
  );
}


const StyledHeaderTitle = styled(StyledTitle)({
  flex: "1 1 auto",
  minWidth: 0,
});

const StyledHeader = styled(StyledFlexRow)({
    marginBottom:20,
    marginTop: 20,
    alignItems:'flex-start'
});
