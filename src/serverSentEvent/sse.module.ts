import { Global, Module } from "@nestjs/common";
import { SseService } from "./sse.service";
import { CaslModule } from "src/casl/casl.module";
import { SseController } from "./sse.controller";
import { SseListener } from "./sse.listener";
import { AuthModule } from "src/auth/auth.module";

@Global()
@Module({
  imports: [CaslModule, AuthModule],
  controllers: [SseController],
  providers: [SseService, SseListener],
  exports: [SseService],
})
export class SseModule {}
