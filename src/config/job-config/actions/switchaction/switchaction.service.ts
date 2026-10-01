import { Injectable } from "@nestjs/common";
import {
  CREATE_JOB_ACTION_CREATORS,
  JobActionCreator,
  JobActionOptions,
  UPDATE_JOB_ACTION_CREATORS,
} from "../../jobconfig.interface";
import { SwitchJobAction } from "./switchaction";
import { isSwitchJobActionOptions } from "./switchaction.interface";
import { CreateJobDto } from "src/jobs/dto/create-job.dto";
import { ModuleRef } from "@nestjs/core";
import { UpdateJobDto } from "src/jobs/dto/update-job.dto";

@Injectable()
export class SwitchUpdateJobActionCreator implements JobActionCreator<UpdateJobDto> {
  constructor(private moduleRef: ModuleRef) {}

  public create<Options extends JobActionOptions>(options: Options) {
    if (!isSwitchJobActionOptions(options)) {
      throw new Error(
        `Invalid options for switch action: ${JSON.stringify(options)}`,
      );
    }
    return new SwitchJobAction<UpdateJobDto>(
      this.moduleRef,
      options,
      UPDATE_JOB_ACTION_CREATORS,
    );
  }
}

@Injectable()
export class SwitchCreateJobActionCreator implements JobActionCreator<CreateJobDto> {
  constructor(private moduleRef: ModuleRef) {}

  public create<Options extends JobActionOptions>(options: Options) {
    if (!isSwitchJobActionOptions(options)) {
      throw new Error(
        `Invalid options for switch action: ${JSON.stringify(options)}`,
      );
    }
    return new SwitchJobAction<CreateJobDto>(
      this.moduleRef,
      options,
      CREATE_JOB_ACTION_CREATORS,
    );
  }
}
