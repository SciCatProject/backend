/**
 * Send emails in response to job events
 * This is intended as an example of the JobAction interface
 *
 */
import { readFileSync } from "fs";
import { compileJobTemplate, TemplateJob } from "../../handlebar-utils";
import { HttpStatus, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  JobAction,
  JobDto,
  JobPerformContext,
} from "../../jobconfig.interface";
import { ISendMailOptions } from "@nestjs-modules/mailer";
import { actionType, EmailJobActionOptions } from "./emailaction.interface";
import { MailService } from "src/common/mail.service";
import { PoliciesService } from "src/policies/policies.service";
import { makeHttpException } from "src/common/utils";

/**
 * Send an email following a job
 */
export class EmailJobAction implements JobAction<JobDto> {
  private toTemplate?: TemplateJob;
  private toPolicyManagers = false;
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
    options: EmailJobActionOptions,
  ) {
    Logger.log("EmailJobAction parameters are valid.", "EmailJobAction");

    if (options["from"]) {
      this.from = options.from as string;
    }
    if (options.to) {
      this.toTemplate = compileJobTemplate(options.to);
    }
    if (options.toPolicyManagers) {
      this.toPolicyManagers = true;
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

  private async resolvePolicyManagerRecipients(
    context: JobPerformContext<JobDto>,
  ): Promise<string | undefined> {
    if (context.datasets.length === 0) return undefined;

    const ownerGroups = new Set(
      context.datasets.map((dataset) => dataset.ownerGroup),
    );
    if (ownerGroups.size > 1)
      throw new Error(
        `EmailJobAction (toPolicyManagers) only supports datasets from a single ownerGroup, got: ${[...ownerGroups].join(", ")}`,
      );
    const [ownerGroup] = ownerGroups;

    const policiesService = await this.moduleRef.resolve(
      PoliciesService,
      undefined,
      { strict: false },
    );
    if (policiesService === undefined) {
      const msg =
        "Unable to resolve PoliciesService. This indicates an unexpected server state.";
      Logger.error(msg, "EmailJobAction");
      throw makeHttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const policy = await policiesService.findOne({ ownerGroup });
    const recipients = policy?.manager ?? [];
    if (recipients.length === 0) {
      Logger.warn(
        `(Job ${context.job.id}) EmailJobAction: no policy managers configured for ownerGroup '${ownerGroup}', skipping notification.`,
        "EmailJobAction",
      );
      return undefined;
    }
    return recipients.join(",");
  }

  private async resolveRecipients(
    context: JobPerformContext<JobDto>,
  ): Promise<string | undefined> {
    const recipients: string[] = [];
    if (this.toTemplate) {
      const templateTo = this.toTemplate(context);
      if (templateTo) recipients.push(templateTo);
    }
    if (this.toPolicyManagers) {
      try {
        const policyManagerTo =
          await this.resolvePolicyManagerRecipients(context);
        if (policyManagerTo) recipients.push(policyManagerTo);
      } catch (err) {
        Logger.error(
          `(Job ${context.job.id}) EmailJobAction: Unable to resolve policy manager recipients: ${err}`,
          "EmailJobAction",
        );
        if (!this.ignoreErrors) {
          throw err;
        }
      }
    }
    return recipients.length > 0 ? recipients.join(",") : undefined;
  }

  async perform(context: JobPerformContext<JobDto>) {
    Logger.log(
      `(Job ${context.job.id}) Performing EmailJobAction`,
      "EmailJobAction",
    );

    const to = await this.resolveRecipients(context);
    if (!to) return;

    let mail: ISendMailOptions;
    try {
      // Fill templates
      mail = {
        to,
        subject: this.subjectTemplate(context),
        html: this.bodyTemplate(context),
      };
      if (this.from) {
        mail.from = this.from;
      }
    } catch (err) {
      Logger.error(
        `(Job ${context.job.id}) EmailJobAction: Template error: ${err}`,
        "EmailJobAction",
      );
      if (!this.ignoreErrors) {
        throw err;
      }
      return;
    }

    try {
      // Send the email
      await this.mailService.sendMail(mail);
    } catch (err) {
      Logger.error(
        `(Job ${context.job.id}) EmailJobAction: Sending email failed: ${err}`,
        "EmailJobAction",
      );
      if (!this.ignoreErrors) {
        throw err;
      }
    }
  }
}
