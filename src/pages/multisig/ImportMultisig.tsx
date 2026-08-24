import { Box, Button, Typography } from "@mui/material";
import "./multisig.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Address } from "@ton/core";
import { useAppNavigation } from "router/navigation";
import { addOpenedMultisig } from "multisig/utils/MultisigRegistry";
import {
  validateUserFriendlyAddress,
  addressToString,
  AddressInfo,
} from "multisig/utils/utils";
import { IS_TESTNET } from "multisig/constants";

export default function ImportMultisig() {
  const navigate = useNavigate();
  const { multisigPage } = useAppNavigation();
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = () => {
    setErr(null);
    const error = validateUserFriendlyAddress(value, IS_TESTNET);
    if (error) {
      setErr(error);
      return;
    }
    const parsed = Address.parseFriendly(value);
    parsed.isBounceable = true;
    parsed.isTestOnly = IS_TESTNET;
    const friendly = addressToString(parsed as AddressInfo);
    addOpenedMultisig(friendly);
    multisigPage.address(friendly);
  };

  return (
    <Box className="multisigPage">
      <Button variant="text" onClick={() => multisigPage.root()}>
        ← К списку
      </Button>
      <Typography variant="h4">Импортировать мультикошелек</Typography>
      <Typography className="value">
        Введите адрес мультикошелька (например, из tonviewer или другого
        источника).
      </Typography>
      <Box className="newOrderField">
        <input
          className="newOrderInput"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="EQ..."
        />
      </Box>
      {err ? <Typography color="error">{err}</Typography> : null}
      <Box className="multisigHeaderButtons">
        <Button variant="outlined" onClick={() => multisigPage.root()}>
          Назад
        </Button>
        <Button variant="contained" onClick={onSubmit}>
          Открыть
        </Button>
      </Box>
    </Box>
  );
}
