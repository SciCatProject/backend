import { Global, Module } from "@nestjs/common";
import { EventsController } from "./serverSideEvent.controller";
import { EventsService } from "./serverSideEvent.service";

@Global()
@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
