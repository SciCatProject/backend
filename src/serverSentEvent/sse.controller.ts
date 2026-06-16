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
import { map } from "rxjs/operators";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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
  stream(@Req() request: Request): Observable<MessageEvent> {
    const user = request.user as JWTUser;
    return this.sseService
      .getEvents(user)
      .pipe(map((payload) => ({ data: payload })));
  }

  @Get("connections")
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "runtimeconfig",
    (ability: AppAbility) =>
      ability.can(Action.RuntimeConfigUpdateEndpoint, RuntimeConfig), //TODO: define a correct policy for monitoring connections
  )
  connections() {
    return this.sseService.getAllConnections();
  }
}
