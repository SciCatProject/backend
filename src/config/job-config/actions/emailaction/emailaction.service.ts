import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  JobActionCreator,
  JobActionOptions,
  JobDto,
} from "../../jobconfig.interface";
import { isEmailJobActionOptions } from "./emailaction.interface";
import { EmailJobAction } from "./emailaction";
import { MailService } from "src/common/mail.service";

@Injectable()
export class EmailJobActionCreator implements JobActionCreator<JobDto> {
  constructor(
    private mailService: MailService,
    private moduleRef: ModuleRef,
  ) {}

  public create<Options extends JobActionOptions>(options: Options) {
    if (!isEmailJobActionOptions(options)) {
      throw new Error(
        `Invalid options for email action: ${JSON.stringify(options)}`,
      );
    }
    return new EmailJobAction(this.mailService, this.moduleRef, options);
  }
}
