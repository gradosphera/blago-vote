import blagoLogo from "assets/jetton-blago-logo.svg";
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
  mapWithConcurrency,
  MultisigStatus,
  RegistryEntry,
  RegistryJetton,
} from "multisig/utils/MultisigRegistry";
import { MULTISIG_CODE, IS_TESTNET, GRAM_LOGO_URL } from "multisig/constants";
import { Address } from "@ton/core";
import { MultisigInfo } from "./MultisigInfo";
import { makeElipsisAddress } from "utils";
import { WalletStyleCard } from "components";
import {
  BLAGO_JETTON_ADDRESS,
  BLAGO_JETTON_DECIMALS,
} from "multisig/constants";
import { fetchJettonBalance } from "multisig/utils/MultisigRegistry";

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

export function MultisigList() {
  const { multisigPage } = useAppNavigation();
  const myAddress = useMyAddress();
  const [items, setItems] = useState<DaoListItem[]>([]);
  const [results, setResults] = useState<MultisigStatus[] | null[]>([]);
  const [blagoBalances, setBlagoBalances] = useState<string[]>([]);
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
    setBlagoBalances(merged.map(() => ""));

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
      setBlagoBalances(fresh.map(() => ""));
    } catch (e) {
      console.error(e);
    }

    try {
      const computed = await mapWithConcurrency(
        entries,
        6,
        async (item: DaoListItem) => {
          return await fetchMultisigStatus(
            item.address,
            MULTISIG_CODE,
            IS_TESTNET,
            myAddress,
          );
        },
      );
      setResults(computed);

      // Загружаем баланс Благо только для мультикошельков с ролью пользователя
      const enabledIndexes: number[] = [];
      computed.forEach((r, i) => {
        if (r.role !== "none") enabledIndexes.push(i);
      });
      const balances = new Array(entries.length).fill("");
      if (enabledIndexes.length > 0) {
        const loaded = await mapWithConcurrency(
          enabledIndexes,
          6,
          async (idx: number) => {
            return await fetchJettonBalance(
              BLAGO_JETTON_ADDRESS,
              entries[idx].address,
              IS_TESTNET,
            );
          },
        );
        enabledIndexes.forEach((idx, i) => {
          balances[idx] = loaded[i];
        });
      }
      setBlagoBalances(balances);
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

  const BLAGO_LOGO = blagoLogo;

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
          const blagoBalance = blagoBalances[i] || "";
          const info = Address.parseFriendly(item.address);
          info.isBounceable = true;
          info.isTestOnly = IS_TESTNET;
          const avatar = item.logo || item.jetton?.logo || GRAM_LOGO_URL;
          const addressText = item.name ? makeElipsisAddress(item.address, 6) : "Мультикошелек";
          const displayName = item.name || "Мультикошелек";

          const roleBadge =
            result?.role && result.role !== "none" ? (
              <span
                className={
                  "badge " +
                  (result.role === "signer"
                    ? "badgeSigner"
                    : "badgeProposer")
                }
              >
                {result.role === "signer" ? "Подписант" : "Инициатор"}
              </span>
            ) : null;

          const removeBadge =
            item.mine && result?.ok && !result.isMultisig ? (
              <span
                className="daoMultisigRemoveBadge"
                title="Скрыть карточку"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.address);
                }}
              >
                ✕
              </span>
            ) : null;

          return (
            <Box
              key={item.address}
              className={
                "daoMultisigItem" + (item.mine ? " daoMultisigMine" : "")
              }
              onClick={() => onCardClick(item.address)}
            >
              <WalletStyleCard
                name={displayName}
                address={addressText}
                avatar={avatar}
                jettonBalance={blagoBalance}
                jettonLogo={BLAGO_LOGO}
                jettonName="Благо"
                badge={roleBadge}
                hiddenIcon={removeBadge}
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
