import { List, LoadMore } from "components";
import {
  StyledEmptyText,
  StyledFlexColumn,
  StyledSkeletonLoader,
} from "styles";
import {
  StyledAboutSection,
  StyledDao,
  StyledDaoContent,
  StyledDaosAmount,
  StyledDaosList,
  StyledEmptyList,
  StyledHeader,
  StyledNewDao,
  StyledSearch,
} from "./styles";
import { nFormatter } from "utils";
import { Dao } from "types";
import { useMemo, useCallback } from "react";
import _ from "lodash";
import { DAOS_LIMIT, useDaosListLimit } from "./store";
import { useAppQueryParams, useRole } from "hooks/hooks";
import { DaoListItem } from "./Dao";
import { useDaosQuery } from "query/getters";
import { Page } from "wrappers";
import { Typography } from "@mui/material";
import { useAppNavigation } from "router/navigation";

// Страница «ДАО»: список Дао, которыми управляет пользователь
// (где у него есть права на создание голосований: owner / proposalOwner).
export function ManageDaosPage() {
  const { data = [], isLoading } = useDaosQuery();
  const { limit, loadMore } = useDaosListLimit();
  const { getRole } = useRole();

  const { query, setSearch } = useAppQueryParams();
  const searchValue = query.search || "";

  const onSearchInputChange = useCallback(
    (value: string) => {
      setSearch(value);
    },
    [setSearch]
  );

  const managedDaos = useMemo(
    () =>
      _.filter(data, (it: Dao) => {
        const { isOwner, isProposalPublisher } = getRole(it.daoRoles);
        return isOwner || isProposalPublisher;
      }),
    [data, getRole]
  );

  const visibleData = useMemo(() => {
    if (!searchValue) return managedDaos;
    const nameFilter = _.filter(managedDaos, (it: Dao) =>
      it.daoMetadata.metadataArgs.name
        .toLowerCase()
        .includes(searchValue.toLowerCase())
    );
    const addressFilter = _.filter(managedDaos, (it: Dao) =>
      it.daoAddress.toLowerCase().includes(searchValue.toLowerCase())
    );
    return _.uniqBy([...nameFilter, ...addressFilter], "daoAddress");
  }, [managedDaos, searchValue]);

  const emptyList = !isLoading && !_.size(visibleData);

  return (
    <Page hideBack={false}>
      <StyledFlexColumn alignItems="flex-start" gap={24}>
        <StyledAboutSection>
          <Typography className="title">Мои ДАО</Typography>
          <Typography className="subtitle">
            ДАО, которыми вы управляете и можете создавать голосования
          </Typography>
        </StyledAboutSection>

        <StyledHeader>
          <StyledSearch
            initialValue={searchValue}
            onChange={onSearchInputChange}
            placeholder="Поиск по ДАО"
          />
          <StyledDaosAmount>
            {nFormatter(_.size(managedDaos))} ДАО
          </StyledDaosAmount>
        </StyledHeader>

        <StyledFlexColumn gap={25}>
          <List
            isLoading={isLoading}
            isEmpty={!!emptyList}
            loader={<ListLoader />}
            emptyComponent={
              <StyledEmptyList>
                <StyledFlexColumn style={{ gap: 0 }}>
                  <StyledEmptyText>
                    Нет ДАО, которыми вы управляете
                  </StyledEmptyText>
                </StyledFlexColumn>
              </StyledEmptyList>
            }
          >
            <StyledDaosList>
              {visibleData.map((dao: Dao, index) => {
                if (index > limit) return null;
                return <DaoListItem key={dao.daoAddress} dao={dao} />;
              })}
              <NewDao />
            </StyledDaosList>
          </List>

          <LoadMore
            totalItems={_.size(visibleData)}
            amountToShow={limit}
            showMore={loadMore}
            limit={DAOS_LIMIT}
          />
        </StyledFlexColumn>
      </StyledFlexColumn>
    </Page>
  );
}

export default ManageDaosPage;

const NewDao = () => {
  const { createSpace } = useAppNavigation();
  return (
    <StyledNewDao onClick={() => createSpace.root()}>
      <StyledDaoContent hover className="container">
        <StyledFlexColumn className="flex">
          <Typography>Создать новое ДАО</Typography>
        </StyledFlexColumn>
      </StyledDaoContent>
    </StyledNewDao>
  );
};

const ListLoader = () => {
  return (
    <StyledDaosList>
      {_.range(0, 1).map((it, i) => {
        return (
          <StyledDao key={i}>
            <StyledDaoContent>
              <StyledFlexColumn>
                <StyledSkeletonLoader
                  style={{ borderRadius: "50%", width: 70, height: 70 }}
                />
                <StyledSkeletonLoader style={{ width: "70%" }} />
                <StyledSkeletonLoader />
              </StyledFlexColumn>
            </StyledDaoContent>
          </StyledDao>
        );
      })}
    </StyledDaosList>
  );
};
