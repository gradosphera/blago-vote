import { useAppParams } from "hooks/hooks";
import { useCreateProposalStore } from "./store";
import _ from "lodash";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { appNavigation as navigation, useAppNavigation } from "router/navigation";
import { useCreateProposalQuery } from "query/setters";
import { useNewDataStore } from "store";
import { useErrorToast } from "toasts";
import { LayoutSection } from "../components";
import { ProposalForm } from "forms/proposal-form/ProposalForm";
import { ProposalForm as ProposalFormType, ProposalHidePopupVariant } from "types";
import { prepareMetadata } from "forms/proposal-form/utils";
import { useDaoQuery } from "query/getters";
import { usePublisherMultisigSigner } from "multisig/usePublisherMultisigSigner";
import { buildCreateProposalOrder } from "multisig/createProposalOrder";
import { ProposalMetadata } from "ton-vote-contracts-sdk";
import { useTranslation } from "react-i18next";
import { useCommonTranslations } from "i18n/hooks/useCommonTranslations";


export const CreateProposal = () => {
  const { daoAddress } = useAppParams();
  const { t } = useTranslation("multisig");
  const commonT = useCommonTranslations();

  const { data: dao, isLoading: daoLoading } = useDaoQuery(daoAddress);
  const { setFormData, formData } = useCreateProposalStore();
  const appNavigation = useAppNavigation();
  const navigate = useNavigate();
  const { mutate: createProposal, isLoading } = useCreateProposalQuery();
  const { addProposal } = useNewDataStore();
  const showErrorToast = useErrorToast();
  const [isPreparingOrder, setIsPreparingOrder] = useState(false);
  const { isSigner, multisigAddress } = usePublisherMultisigSigner(dao);

  const onSubmit = async (formValues: ProposalFormType) => {
    const metadata = prepareMetadata(formValues);
    console.log(metadata);

    if (isSigner && multisigAddress) {
      setIsPreparingOrder(true);
      try {
        const { orderBoc, feeTon } = await buildCreateProposalOrder({
          daoAddress,
          metadata: metadata as ProposalMetadata,
        });
        navigate(
          navigation.multisigPage.newOrder(multisigAddress),
          {
            state: {
              orderType: t("customOrder"),
              values: {
                order: orderBoc,
                amount: feeTon,
                toAddress: dao!.daoAddress,
              },
            },
          },
        );
      } catch (e: any) {
        showErrorToast(
          e?.message ||
            t("prepareOrderFailed"),
        );
      } finally {
        setIsPreparingOrder(false);
      }
      return;
    }

    createProposal({
      metadata,
      onSuccess: (proposalAddress: string) => {
        appNavigation.proposalPage.root(proposalAddress);
        setFormData({} as ProposalFormType);
        addProposal(dao!.daoAddress, proposalAddress);
      },
    });
  };

  return (
    <LayoutSection title={commonT.create} isLoading={daoLoading}>
      
      <ProposalForm
        submitText="Создать"
        initialFormData={formData}
        persistForm={setFormData}
        onSubmit={onSubmit}
        isLoading={isLoading || isPreparingOrder}
        dao={dao!}
      />
    </LayoutSection>
  );
};

export default CreateProposal;
