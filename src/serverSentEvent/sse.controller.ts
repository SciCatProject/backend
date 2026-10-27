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
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { EndpointGuard } from "src/casl/guards/endpoint.guard";
import { EndpointAccess } from "src/casl/decorators/endpoint-access.decorator";
import { AppAbility } from "src/casl/types/casl-subjects";
import { Action } from "src/casl/types/action.enum";
import { accessCheck } from "src/casl/utils/access-check.util";
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
  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("sse", (ability: AppAbility) =>
      ability.can(Action.Read, SseClass),
    ),
  )
  @ApiOperation({
    summary: "Subscribe to server-sent events.",
    description:
      "Opens a event-stream connection pushing events for documents the authenticated user is allowed to read. Authenticate with a ticket from POST /events/ticket.",
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
  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("sse", (ability: AppAbility) =>
      ability.can(Action.AccessAny, SseClass),
    ),
  )
  @ApiOperation({
    summary: "List active SSE connections on this instance.",
  })
  connections() {
    return this.sseService.getAllConnections();
  }

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("sse", (ability: AppAbility) =>
      ability.can(Action.Read, SseClass),
    ),
  )
  @Post("ticket")
  async createTicket(@Req() request: Request): Promise<{ ticket: string }> {
    return {
      ticket: this.authService.createSseTicket(request.user as JWTUser),
    };
  }
}
