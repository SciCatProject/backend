/**
 * Send emails in response to job events
 * This is intended as an example of the JobAction interface
 *
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
import { actionType, EmailJobActionOptions } from "./emailaction.interface";
import { MailService } from "src/common/services/mail.service";

/**
 * Send an email following a job
 */
export class EmailJobAction implements JobAction<JobDto> {
  private toTemplate: TemplateJob;
  private from?: string = undefined;
  private subjectTemplate: TemplateJob;
  private bodyTemplate: TemplateJob;
  private ignoreErrors = false;

  getActionType(): string {
    return actionType;
  }

  constructor(
    private mailService: MailService,
    options: EmailJobActionOptions,
  ) {
    Logger.log("EmailJobAction parameters are valid.", "EmailJobAction");

    if (options["from"]) {
      this.from = options.from as string;
    }
    this.toTemplate = compileJobTemplate(options.to);
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

  async perform(context: JobPerformContext<JobDto>) {
    Logger.log(
      `(Job ${context.job.id}) Performing EmailJobAction`,
      "EmailJobAction",
    );

    let mail: ISendMailOptions;
    try {
      // Fill templates
      mail = {
        to: this.toTemplate(context),
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
