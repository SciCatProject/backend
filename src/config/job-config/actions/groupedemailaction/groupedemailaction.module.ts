import { Module } from "@nestjs/common";
import { GroupedEmailJobActionCreator } from "./groupedemailaction.service";
import { CommonModule } from "src/common/common.module";

@Module({
  imports: [CommonModule],
  providers: [GroupedEmailJobActionCreator],
  exports: [GroupedEmailJobActionCreator],
})
export class GroupedEmailJobActionModule {}
