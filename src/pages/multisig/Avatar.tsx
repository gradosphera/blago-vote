import { Box } from "@mui/material";
import { Address } from "@ton/core";
import { useEffect, useState } from "react";
import {
  addressAvatarHTML,
  AddressInfo,
  addressToString,
  makeAddressLink,
} from "multisig/utils/utils";
import { getDnsName, fetchDnsNames } from "multisig/utils/Dns";
import { IS_TESTNET } from "multisig/constants";

export const AddressLink = ({ address }: { address: AddressInfo }) => (
  <span dangerouslySetInnerHTML={{ __html: makeAddressLink(address) }} />
);

export const AddressAvatar = ({
  address,
  isMe = false,
  statusBadge,
  meOnCircle = false,
}: {
  address: AddressInfo;
  isMe?: boolean;
  statusBadge?: string;
  meOnCircle?: boolean;
}) => (
  <span
    dangerouslySetInnerHTML={{
      __html: addressAvatarHTML(address, isMe, statusBadge,       getDnsName(address.address) ?? undefined, meOnCircle),
    }}
  />
);

/**
 * Загружает DNS-имена для списка адресов (порт fetchDnsNames) и возвращает
 * счётчик обновлений, чтобы компоненты перерисовались после загрузки.
 */
export const useDnsNames = (addresses: (Address | undefined)[]) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const filtered = addresses.filter((a): a is Address => !!a);
    if (filtered.length === 0) return;
    let cancelled = false;
    fetchDnsNames(filtered, IS_TESTNET).then(() => {
      if (!cancelled) setTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.map((a) => a?.toString()).join(",")]);
  return tick;
};

export const shorten = (addressString: string): string => {
  if (addressString.length <= 14) return addressString;
  return addressString.slice(0, 6) + "…" + addressString.slice(-4);
};

export const toFriendly = (address: Address, bounceable = true): string =>
  address.toString({ bounceable, testOnly: IS_TESTNET });

export { addressToString };
