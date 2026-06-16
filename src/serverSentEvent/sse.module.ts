import { Global, Module } from "@nestjs/common";
import { SseService } from "./sse.service";
import { CaslModule } from "src/casl/casl.module";
import { SseController } from "./sse.controller";

@Global()
@Module({
  imports: [CaslModule],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
