import { Button, Box, Typography, CircularProgress } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppNavigation } from "router/navigation";
import { useMyAddress } from "multisig/useMyAddress";
import {
  getSnapshotEntries,
  fetchRegistry,
  loadOpenedMultisigs,
  loadHiddenMultisigs,
  addHiddenMultisig,
  fetchMultisigStatus,
  fetchJettonBalance,
  mapWithConcurrency,
  MultisigStatus,
  RegistryEntry,
  RegistryJetton,
} from "multisig/utils/MultisigRegistry";
import { MULTISIG_CODE, IS_TESTNET, GRAM_LOGO_URL } from "multisig/constants";
import { Address, fromNano } from "@ton/core";
import { AddressLink } from "./Avatar";
import { MultisigInfo } from "./MultisigInfo";

interface DaoListItem {
  name: string;
  address: string;
  mine: boolean;
  logo?: string;
  jetton?: RegistryJetton;
}

const PENDING_STATUS: MultisigStatus = {
  ok: true,
  isMultisig: true,
  balance: "",
  role: "none",
};

const formatJettonAmount = (balance: string, decimals: number): string => {
  const value = BigInt(balance || "0");
  if (decimals <= 0) return value.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return whole.toString() + "." + fracStr;
};

const balancesHTML = (
  item: DaoListItem,
  result?: { status: MultisigStatus; jettonBalance: string },
): string => {
  const lines: string[] = [];
  if (!result) {
    lines.push("Загрузка...");
  } else if (result.status.ok) {
    if (result.status.isMultisig) {
      lines.push(
        '<span class="daoBalance"><img class="daoBalanceLogo" src="' +
          GRAM_LOGO_URL +
          '" alt=""> ' +
          fromNano(BigInt(result.status.balance || "0")) +
          " GRAM</span>",
      );
      if (item.jetton && result.jettonBalance !== "") {
        lines.push(
          '<span class="daoBalance"><img class="daoBalanceLogo" src="' +
            (item.jetton.logo || "") +
            '" alt=""> ' +
            formatJettonAmount(
              result.jettonBalance,
              item.jetton.decimals ?? 0,
            ) +
            " " +
            item.jetton.name +
            "</span>",
        );
      }
    } else {
      lines.push("не мультикошелек");
    }
  } else {
    lines.push(result.status.error || "Ошибка проверки");
  }
  return lines
    .map((l) => "<div>" + l + "</div>")
    .join("");
};

export function MultisigList() {
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const [items, setItems] = useState<DaoListItem[]>([]);
  const [results, setResults] = useState<
    Array<{ status: MultisigStatus; jettonBalance: string } | null>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const hidden = loadHiddenMultisigs();
    const seen = new Set<string>();
    const merged: DaoListItem[] = [];
    const addItem = (it: DaoListItem) => {
      const raw = Address.parseFriendly(it.address).address.toRawString();
      if (seen.has(raw) || hidden.has(raw)) return;
      seen.add(raw);
      merged.push(it);
    };

    getSnapshotEntries()
      .filter((e: RegistryEntry) => e.testnet === IS_TESTNET)
      .forEach((e) =>
        addItem({
          name: e.name,
          address: e.address,
          mine: false,
          logo: e.logo,
          jetton: e.jetton,
        }),
      );

    loadOpenedMultisigs().forEach((o) =>
      addItem({ name: "", address: o.address, mine: true }),
    );

    setItems(merged);
    setResults(merged.map(() => null));

    let entries = merged;
    try {
      const remote = await fetchRegistry(false);
      const fresh: DaoListItem[] = [];
      const seen2 = new Set<string>();
      const addFresh = (it: DaoListItem) => {
        const raw = Address.parseFriendly(it.address).address.toRawString();
        if (seen2.has(raw) || hidden.has(raw)) return;
        seen2.add(raw);
        fresh.push(it);
      };
      getSnapshotEntries()
        .filter((e: RegistryEntry) => e.testnet === IS_TESTNET)
        .forEach((e) =>
          addFresh({
            name: e.name,
            address: e.address,
            mine: false,
            logo: e.logo,
            jetton: e.jetton,
          }),
        );
      remote
        .filter((e: RegistryEntry) => e.testnet === IS_TESTNET)
        .forEach((e) =>
          addFresh({
            name: e.name,
            address: e.address,
            mine: false,
            logo: e.logo,
            jetton: e.jetton,
          }),
        );
      loadOpenedMultisigs().forEach((o) =>
        addFresh({ name: "", address: o.address, mine: true }),
      );
      entries = fresh;
      setItems(fresh);
      setResults(fresh.map(() => null));
    } catch (e) {
      console.error(e);
    }

    try {
      const computed = await mapWithConcurrency(
        entries,
        6,
        async (item: DaoListItem) => {
          const status = await fetchMultisigStatus(
            item.address,
            MULTISIG_CODE,
            IS_TESTNET,
            myAddress,
          );
          let jettonBalance = "";
          if (status.isMultisig && item.jetton) {
            jettonBalance = await fetchJettonBalance(
              item.jetton.address,
              item.address,
              IS_TESTNET,
            );
          }
          return { status, jettonBalance };
        },
      );
      setResults(computed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [myAddress]);

  useEffect(() => {
    load();
  }, [load]);

  const onCardClick = (address: string) => multisigPage.address(address);

  const onRemove = (address: string) => {
    addHiddenMultisig(address);
    setItems((prev) => prev.filter((it) => it.address !== address));
  };

  const avatarAddresses = useMemo(
    () => items.map((it) => Address.parseFriendly(it.address).address),
    [items],
  );

  return (
    <Box className="multisigPage">
      <MultisigInfo />

      {loading && items.length === 0 ? (
        <Box className="multisigLoading">
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box className="daoMultisigEmpty value">Список пуст</Box>
      ) : null}

      <Box className="daoMultisigList">
        {items.map((item, i) => {
          const result = results[i];
          const info = Address.parseFriendly(item.address);
          info.isBounceable = true;
          info.isTestOnly = IS_TESTNET;
          const avatar = item.logo || item.jetton?.logo || GRAM_LOGO_URL;
          const removeBadge =
            item.mine && result?.status.ok && !result.status.isMultisig ? (
              <button
                className="daoMultisigRemoveBadge"
                title="Скрыть карточку"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.address);
                }}
              >
                ✕
              </button>
            ) : null;
          return (
            <Box
              key={item.address}
              className={
                "daoMultisigItem" + (item.mine ? " daoMultisigMine" : "")
              }
              onClick={() => onCardClick(item.address)}
            >
              {removeBadge}
              <Box className="daoMultisigAvatarWrap">
                <Box className="daoMultisigAvatar">
                  <img src={avatar} alt="" />
                </Box>
                {result?.status.role &&
                  result.status.role !== "none" && (
                    <span
                      className={
                        "badge " +
                        (result.status.role === "signer"
                          ? "badgeSigner"
                          : "badgeProposer")
                      }
                    >
                      {result.status.role === "signer"
                        ? "Подписант"
                        : "Инициатор"}
                    </span>
                  )}
              </Box>
              <Box className="daoMultisigName">
                {item.name || "Мультикошелек"}
              </Box>
              <Box className="daoMultisigAddress">
                <AddressLink address={info} />
              </Box>
              <Box
                className="daoMultisigBalances"
                dangerouslySetInnerHTML={{
                  __html: balancesHTML(
                    item,
                    result === null ? undefined : result,
                  ),
                }}
              />
            </Box>
          );
        })}
        <Box
          className="daoMultisigCreate"
          onClick={() => multisigPage.create()}
        >
          <Typography className="daoMultisigCreateText">
            Создать мультикошелек
          </Typography>
        </Box>
      </Box>

      <Box className="multisigFooter">
        <Button variant="outlined" onClick={() => multisigPage.import()}>
          Импортировать
        </Button>
      </Box>
    </Box>
  );
}
