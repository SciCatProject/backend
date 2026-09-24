import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  JobActionCreator,
  JobActionOptions,
  JobDto,
} from "../../jobconfig.interface";
import { isDatasetPolicyEmailJobActionOptions } from "./datasetpolicyemailaction.interface";
import { DatasetPolicyEmailJobAction } from "./datasetpolicyemailaction";
import { MailService } from "src/common/mail.service";

@Injectable()
export class DatasetPolicyEmailJobActionCreator implements JobActionCreator<JobDto> {
  constructor(
    private mailService: MailService,
    private moduleRef: ModuleRef,
  ) {}

  public create<Options extends JobActionOptions>(options: Options) {
    if (!isDatasetPolicyEmailJobActionOptions(options)) {
      throw new Error(
        `Invalid options for datasetPolicyEmail action: ${JSON.stringify(options)}`,
      );
    }
    return new DatasetPolicyEmailJobAction(
      this.mailService,
      this.moduleRef,
      options,
    );
  }
}
