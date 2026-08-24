import {
  Controller,
  Sse,
  MessageEvent,
  UseGuards,
  Req,
  Get,
  Post,
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
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { SseService } from "./sse.service";
import { AuthService } from "src/auth/auth.service";
import { SseClass } from "./interfaces/sse-event.interface";

@ApiTags("events")
@Controller("events")
@ApiBearerAuth()
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly authService: AuthService,
  ) {}

  @Sse("stream")
  @UseGuards(PoliciesGuard)
  @CheckPolicies("sse", (ability: AppAbility) =>
    ability.can(Action.SseRead, SseClass),
  )
  @ApiOperation({
    summary: "Subscribe to server-sent events.",
    description:
      "Opens a text/event-stream connection pushing events for documents the authenticated user is allowed to read. Authenticate with a ticket from POST /events/ticket.",
  })
  @ApiQuery({
    name: "ticket",
    required: false,
    description:
      "Short-lived ticket from POST /events/ticket. Expires after 60 seconds and is only accepted on this route.",
  })
  stream(@Req() request: Request): Observable<MessageEvent> {
    const user = request.user as JWTUser;
    return this.sseService.getEvents(user);
  }

  @Get("connections")
  @UseGuards(PoliciesGuard)
  @CheckPolicies("sse", (ability: AppAbility) =>
    ability.can(Action.AccessAny, SseClass),
  )
  @ApiOperation({
    summary: "List active SSE connections on this instance.",
  })
  connections() {
    return this.sseService.getAllConnections();
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("sse", (ability: AppAbility) =>
    ability.can(Action.SseRead, SseClass),
  )
  @Post("ticket")
  async createTicket(@Req() request: Request): Promise<{ ticket: string }> {
    return {
      ticket: this.authService.createSseTicket(request.user as JWTUser),
    };
  }
}
