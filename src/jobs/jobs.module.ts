import { Module } from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";
import { JobsV4Controller } from "./jobs.v4.controller";
import { JobsControllerUtils } from "./jobs.controller.utils";
import { MongooseModule } from "@nestjs/mongoose";
import { JobClass, JobSchema } from "./schemas/job.schema";
import { DatasetsModule } from "src/datasets/datasets.module";
import { PoliciesModule } from "src/policies/policies.module";
import { OrigDatablocksModule } from "src/origdatablocks/origdatablocks.module";
import { UsersModule } from "src/users/users.module";
import { JobConfigService } from "../config/job-config/jobconfig.service";
import { CoreJobActionCreators } from "../config/job-config/actions/corejobactioncreators.module";
import { EmailJobActionCreator } from "src/config/job-config/actions/emailaction/emailaction.service";
import { CommonModule } from "src/common/common.module";
import { CaslModule } from "src/casl/casl.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  controllers: [JobsController, JobsV4Controller],
  imports: [
    CommonModule,
    CoreJobActionCreators,
    DatasetsModule,
    UsersModule,
    CaslModule,
    MongooseModule.forFeatureAsync([
      {
        name: JobClass.name,
        // schema: JobSchema,
        useFactory: () => {
          const schema = JobSchema;

          schema.pre<JobClass>("save", function (next) {
            // if _id is empty or different than job id,
            // set _id to job id
            if (!this._id) {
              this._id = this.id;
            }
            next();
          });
          return schema;
        },
      },
    ]),
    PoliciesModule,
    OrigDatablocksModule,
    ConfigModule,
  ],
  providers: [
    JobsControllerUtils,
    JobsService,
    JobConfigService,
    EmailJobActionCreator,
  ],
})
export class JobsModule {}
