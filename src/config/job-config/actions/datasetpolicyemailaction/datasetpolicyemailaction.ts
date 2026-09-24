/**
 * Group the datasets attached to a job by ownerGroup, and send one email per
 * group to the recipients configured on that ownerGroup's Policy, if enabled.
 */
import { readFileSync } from "fs";
import { compileJobTemplate, TemplateJob } from "../../handlebar-utils";
import { Logger } from "@nestjs/common";
import {
  JobAction,
  JobDto,
  JobPerformContext,
} from "../../jobconfig.interface";
import { ISendMailOptions } from "@nestjs-modules/mailer";
import { ModuleRef } from "@nestjs/core";
import {
  actionType,
  DatasetPolicyEmailJobActionOptions,
} from "./datasetpolicyemailaction.interface";
import { MailService } from "src/common/mail.service";
import { PoliciesV4Service } from "src/policies/policies.v4.service";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";

export class DatasetPolicyEmailJobAction implements JobAction<JobDto> {
  private from?: string = undefined;
  private subjectTemplate: TemplateJob;
  private bodyTemplate: TemplateJob;
  private ignoreErrors = false;

  getActionType(): string {
    return actionType;
  }

  constructor(
    private mailService: MailService,
    private moduleRef: ModuleRef,
    options: DatasetPolicyEmailJobActionOptions,
  ) {
    Logger.log(
      "DatasetPolicyEmailJobAction parameters are valid.",
      "DatasetPolicyEmailJobAction",
    );

    if (options["from"]) {
      this.from = options.from as string;
    }
    this.subjectTemplate = compileJobTemplate(options.subject);

    const templateFile = readFileSync(
      options["bodyTemplateFile"] as string,
      "utf8",
    );
    this.bodyTemplate = compileJobTemplate(templateFile);

    if (options["ignoreErrors"]) {
      this.ignoreErrors = options.ignoreErrors;
    }
  }

  private groupDatasetsByOwnerGroup(
    datasets: DatasetClass[],
  ): Map<string, DatasetClass[]> {
    const groups = new Map<string, DatasetClass[]>();
    for (const dataset of datasets) {
      const group = groups.get(dataset.ownerGroup) ?? [];
      group.push(dataset);
      groups.set(dataset.ownerGroup, group);
    }
    return groups;
  }

  private async resolvePoliciesService(
    context: JobPerformContext<JobDto>,
  ): Promise<PoliciesV4Service> {
    try {
      return await this.moduleRef.resolve(PoliciesV4Service, undefined, {
        strict: false,
      });
    } catch (err) {
      Logger.error(
        `(Job ${context.job.id}) DatasetPolicyEmailJobAction: Failed to resolve PoliciesV4Service: ${err}`,
        "DatasetPolicyEmailJobAction",
      );
      throw err;
    }
  }

  async perform(context: JobPerformContext<JobDto>) {
    Logger.log(
      `(Job ${context.job.id}) Performing DatasetPolicyEmailJobAction`,
      "DatasetPolicyEmailJobAction",
    );

    const datasetsByOwnerGroup = this.groupDatasetsByOwnerGroup(
      context.datasets,
    );
    if (datasetsByOwnerGroup.size === 0) return;

    try {
      const policiesService = await this.resolvePoliciesService(context);

      const policies = await policiesService.findAll({
        where: {
          ownerGroup: { $in: [...datasetsByOwnerGroup.keys()] },
          type: context.job.type,
          emailNotification: true,
          emailTo: { $exists: true, $not: { $size: 0 } },
        },
        fields: ["ownerGroup", "emailTo"],
      });
      await Promise.all(
        policies.map(async (policy) => {
          const groupDatasets = datasetsByOwnerGroup.get(policy.ownerGroup);
          const emailTo = policy.emailTo;
          if (!groupDatasets || !emailTo) return;

          await this.sendGroupEmail(context, groupDatasets, emailTo);
        }),
      );
    } catch (err) {
      if (!this.ignoreErrors) {
        throw err;
      }
    }
  }

  private async sendGroupEmail(
    context: JobPerformContext<JobDto>,
    groupDatasets: DatasetClass[],
    emailTo: string[],
  ) {
    const groupContext = { ...context, datasets: groupDatasets };

    let mail: ISendMailOptions;
    try {
      mail = {
        to: emailTo,
        subject: this.subjectTemplate(groupContext),
        html: this.bodyTemplate(groupContext),
      };
      if (this.from) {
        mail.from = this.from;
      }
    } catch (err) {
      Logger.error(
        `(Job ${context.job.id}) DatasetPolicyEmailJobAction: Template error: ${err}`,
        "DatasetPolicyEmailJobAction",
      );
      throw err;
    }

    try {
      await this.mailService.sendMail(mail);
    } catch (err) {
      Logger.error(
        `(Job ${context.job.id}) DatasetPolicyEmailJobAction: Sending email failed: ${err}`,
        "DatasetPolicyEmailJobAction",
      );
      throw err;
    }
  }
}
