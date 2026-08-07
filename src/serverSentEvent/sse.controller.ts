import {
  Controller,
  Sse,
  MessageEvent,
  UseGuards,
  Req,
  Get,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { Request } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import { SseService } from "./sse.service";

@ApiTags("events")
@Controller("events")
@ApiBearerAuth()
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse("stream")
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @ApiOperation({
    summary: "Subscribe to server-sent events.",
    description:
      "Opens a text/event-stream connection pushing events for documents the authenticated user is allowed to read.",
  })
  @ApiQuery({
    name: "token",
    required: false,
    description:
      "JWT access token. Alternative to the Authorization header for EventSource clients that cannot set request headers.",
  })
  stream(@Req() request: Request): Observable<MessageEvent> {
    const user = request.user as JWTUser;
    return this.sseService.getEvents(user);
  }

  @Get("connections")
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "runtimeconfig",
    (ability: AppAbility) =>
      ability.can(Action.RuntimeConfigUpdateEndpoint, RuntimeConfig), //TODO: define a correct policy for monitoring connections
  )
  @ApiOperation({
    summary: "List active SSE connections on this instance.",
  })
  connections() {
    return this.sseService.getAllConnections();
  }
}
