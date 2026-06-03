import { Controller, Sse, MessageEvent, UseGuards, Req } from "@nestjs/common";
import { Observable } from "rxjs";

import { Request } from "express";
import { map } from "rxjs/operators";
import { EventsService } from "./serverSideEvent.service";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";

@Controller("events")
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // SSE stream endpoint
  @Sse("stream")
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  stream(@Req() request: Request): Observable<MessageEvent> {
    const user = request.user as JWTUser;
    return this.eventsService
      .getEvents(user)
      .pipe(map((payload) => ({ data: payload })));
  }
}
