import { Module } from "@nestjs/common";
import { DatasetPolicyEmailJobActionCreator } from "./datasetpolicyemailaction.service";
import { CommonModule } from "src/common/common.module";

@Module({
  imports: [CommonModule],
  providers: [DatasetPolicyEmailJobActionCreator],
  exports: [DatasetPolicyEmailJobActionCreator],
})
export class DatasetPolicyEmailJobActionModule {}
