import { Global, Module } from "@nestjs/common";
import { EventsController } from "./serverSideEvent.controller";
import { EventsService } from "./serverSideEvent.service";
import { CaslModule } from "src/casl/casl.module";

@Global()
@Module({
  imports: [CaslModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
