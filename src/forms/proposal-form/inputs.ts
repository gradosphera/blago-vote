import { ABOUT_CHARS_LIMIT, TITLE_LIMIT } from "consts";
import _ from "lodash";
import moment from "moment";
import { FormArgs, ProposalForm, ProposalStatus } from "types";
import { useMemo } from "react";
import { useCreateProposalTranslations } from "i18n/hooks/useCreateProposalTranslations";
export const useCreateProposalForm = (
  formData: ProposalForm,
  editMode?: boolean,
  status?: ProposalStatus
): FormArgs<ProposalForm>[] => {
  const translations = useCreateProposalTranslations();
  const { proposalStartTime, proposalEndTime } = formData;

  return useMemo(() => {
    const start = moment(formData.proposalStartTime);
    const end = moment(formData.proposalEndTime);

    const diff = moment.duration(moment(end).diff(moment(start)));
    const days = diff.days();
    const hours = diff.hours();
    const invalidDuration = days < 0 || hours < 0;

    const showManual = editMode || formData.isManual;

    const baseDetails: FormArgs<ProposalForm> = {
      title: "",
      subTitle: showManual ? translations.subTitle : undefined,
      inputs: [
        {
          label: translations.title,
          type: "text",
          name: "title_en",
          required: true,
          limit: TITLE_LIMIT,
          tooltip: translations.tooltips.title,
        },
        {
          label: translations.title,
          type: "text",
          name: "title_ru",
          required: true,
          limit: TITLE_LIMIT,
          tooltip: translations.tooltips.title,
        },
        {
          label: translations.description,
          type: "textarea",
          name: "description_en",
          rows: 9,
          tooltip: translations.tooltips.description,
          limit: ABOUT_CHARS_LIMIT,
          isMarkdown: true,
          required: true,
        },
        {
          label: translations.description,
          type: "textarea",
          name: "description_ru",
          rows: 9,
          tooltip: translations.tooltips.description,
          limit: ABOUT_CHARS_LIMIT,
          isMarkdown: true,
          required: true,
        },
        ...(!editMode
          ? [
              {
                label: "",
                type: "custom" as const,
                name: "_categorySelector",
              },
            ]
          : []),
      ],
    };

    const votingParameters: FormArgs<ProposalForm> = {
      title: translations.votingParameters,
      inputs: [
        {
          label: translations.votingPowerStrategy,
          type: "custom",
          name: "votingPowerStrategies",
          tooltip: translations.tooltips.votingPowerStrategy,
          required: true,
        },
        {
          label: translations.votingChoices,
          type: "list",
          name: "votingChoices",
          required: true,
          tooltip: translations.tooltips.votingChoices,
          limit: 64,
        },
      ],
    };

    const duration = invalidDuration
      ? ""
      : `${days} дн. ${hours ? `и ${hours} час.` : ""} `;

    const votingPeriod: FormArgs<ProposalForm> = {
      title: translations.votingPeroid,
      inputsInRow: 2,
      subTitle: translations.votingPeriodInfo,
      inputs: [
        {
          label: translations.startTime,
          type: "date",
          name: "proposalStartTime",
          required: true,
          tooltip: translations.tooltips.startTime,
        },
        {
          label: translations.endTime,
          type: "date",
          name: "proposalEndTime",
          required: true,
          tooltip: translations.tooltips.endTime,
        },
        {
          label: translations.snaphotTime,
          type: "date",
          name: "proposalSnapshotTime",
          required: true,
          tooltip: translations.tooltips.snapshotTime,
        },
        {
          style: { width: "100%" },
          label: "",
          type: "display-text",
          name: "",
          text: duration ? `${translations.proposalDuration} ${duration}` : "",
        },
        {
          label: translations.hideLabel,
          type: "checkbox",
          name: "hide",
          tooltip: translations.hideTooltip,
        },
      ],
    };

    const sections: FormArgs<ProposalForm>[] = [];
    if (showManual) {
      sections.push(baseDetails);
    }
    sections.push(votingParameters, votingPeriod);

    if (!editMode) {
      return sections;
    }

    if (status === ProposalStatus.NOT_STARTED) {
      return sections;
    }

    return showManual ? [baseDetails] : [];
  }, [proposalStartTime, proposalEndTime, translations, formData.isManual]);
};
