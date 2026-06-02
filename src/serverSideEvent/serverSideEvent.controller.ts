import { Controller, Post, Sse, MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { EventsService } from "./serverSideEvent.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // SSE stream endpoint
  @Sse("stream")
  stream(): Observable<MessageEvent> {
    return this.eventsService
      .getEvents()
      .pipe(map((payload) => ({ data: payload })));
  }

  @Post("test")
  triggerTest() {
    this.eventsService.emit({
      type: "event.dataset.updated",
      message: "hello from server",
    });
    return { ok: true };
  }
}
