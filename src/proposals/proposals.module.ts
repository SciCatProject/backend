import { BadRequestException, forwardRef, Module } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { ProposalsController } from "./proposals.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { ProposalClass, ProposalSchema } from "./schemas/proposal.schema";
import { CaslModule } from "src/casl/casl.module";
import { AttachmentsModule } from "src/attachments/attachments.module";
import { DatasetsModule } from "src/datasets/datasets.module";
import { ConfigService } from "@nestjs/config";
import {
  GenericHistory,
  GenericHistorySchema,
} from "src/common/schemas/generic-history.schema";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";

@Module({
  imports: [
    CaslModule,
    AttachmentsModule,
    forwardRef(() => DatasetsModule),
    MongooseModule.forFeature([
      {
        name: GenericHistory.name,
        schema: GenericHistorySchema,
      },
    ]),
    MongooseModule.forFeatureAsync([
      {
        name: ProposalClass.name,
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const proposalTypes = configService.get("proposalTypes") || "{}";
          const proposalTypesArray: string[] = Object.values(proposalTypes);
          const schema = ProposalSchema;

          schema.pre<ProposalClass>("save", function (next) {
            // if _id is empty or different than proposalId,
            // set _id to proposalId
            if (!this._id) {
              this._id = this.proposalId;
            }

            if (this.type && !proposalTypesArray.includes(this.type)) {
              throw new BadRequestException(
                `type must be one of the following values: ${proposalTypesArray.join(", ")}`,
              );
            }

            next();
          });

          // Apply history plugin once if schema name matches TRACKABLES config
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
  ],
  exports: [ProposalsService],
  controllers: [ProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
