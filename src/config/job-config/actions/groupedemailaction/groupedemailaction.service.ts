import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  JobActionCreator,
  JobActionOptions,
  JobDto,
} from "../../jobconfig.interface";
import { isGroupedEmailJobActionOptions } from "./groupedemailaction.interface";
import { GroupedEmailJobAction } from "./groupedemailaction";
import { MailService } from "src/common/mail.service";

@Injectable()
export class GroupedEmailJobActionCreator implements JobActionCreator<JobDto> {
  constructor(
    private mailService: MailService,
    private moduleRef: ModuleRef,
  ) {}

  public create<Options extends JobActionOptions>(options: Options) {
    if (!isGroupedEmailJobActionOptions(options)) {
      throw new Error(
        `Invalid options for groupedEmail action: ${JSON.stringify(options)}`,
      );
    }
    return new GroupedEmailJobAction(this.mailService, this.moduleRef, options);
  }
}
