import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { RuntimeConfigModule } from "src/config/runtime-config/runtime-config.module";

@Module({
  imports: [RuntimeConfigModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
