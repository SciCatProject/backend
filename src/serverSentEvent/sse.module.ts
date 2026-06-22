import { Global, Module } from "@nestjs/common";
import { SseService } from "./sse.service";
import { CaslModule } from "src/casl/casl.module";
import { SseController } from "./sse.controller";
import { SseListener } from "./sse.listener";

@Global()
@Module({
  imports: [CaslModule],
  controllers: [SseController],
  providers: [SseService, SseListener],
  exports: [SseService],
})
export class SseModule {}
