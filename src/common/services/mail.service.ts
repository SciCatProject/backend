import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";
import { isAxiosError } from "@nestjs/terminus/dist/utils";
import { SentMessageInfo } from "nodemailer";

/**
 * Service for sending emails using nodemailer.
 *
 * Use this rather than MailerService directly to allow configuration in AppModule
 */
@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(options: ISendMailOptions): Promise<SentMessageInfo> {
    try {
      Logger.log("Sending email to: " + options.to, "Utils.sendMail");
      await this.mailerService.sendMail(options);
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response) {
          Logger.error(`Error sending email. Got ${error.response.status}.`);
          Logger.error(
            `Error response data: ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          Logger.error(`Error sending email. No response received.`);
        } else {
          Logger.error(
            "Error sending email. Unable to set up request: " + error.message,
          );
        }
      } else {
        Logger.error(
          `Failed sending email to: ${options.to}`,
          "MailService.sendMail",
        );
        Logger.error(error, "MailService.sendMail");
      }
    }
  }

  async sendTemplateEmail(doi: string, userEmail: string): Promise<void> {
    const templateName = "doi-registered"; // hdb
    const registerDoiUri = process.env.REGISTER_DOI_URI;
    try {
      const mailOptions: ISendMailOptions = {
        to: userEmail,
        subject: `DOI registration confirmed: ${doi}.`,
        template: templateName,
        context: {
          registerDoiUri: registerDoiUri,
          doi: doi
        },
      };

      if (!mailOptions.template) {
        throw new Error("INTERNAL ERROR: template property is missing!");
      }

      Logger.debug(`mailOptions: ${JSON.stringify(mailOptions)}`);
      await this.sendMail(mailOptions);
      Logger.log(`DOI registration email sent to ${userEmail}.`);
    } catch (error) {
      Logger.error(`Failed to send email: ${JSON.stringify(error)}`);
    }
  }
}
