import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Type,
  mixin,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { EventsService } from "src/serverSideEvent/serverSideEvent.service";

export const EVENT_METHODS: Record<string, string> = {
  POST: "dataset.created",
  // PATCH: "dataset.updated",
  // PUT: "dataset.updated",
  // DELETE: "dataset.deleted",
};

export const EventEmitInterceptor = (
  eventType: string,
): Type<NestInterceptor> => {
  @Injectable()
  class MixinEventEmitInterceptor implements NestInterceptor {
    constructor(public readonly eventsService: EventsService) {}

    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      return next.handle().pipe(
        tap((responseData: OutputDatasetDto) => {
          // "POST", "PATCH", "PUT", "DELETE" are the methods that trigger events for
          // dataset creation, update and deletion. We can extend this list in the future if needed.
          if (eventType) {
            this.eventsService.emit({
              message: responseData,
              // TODO: should have pre-defined event types instead of passing as parameter,
              // to avoid typos and make it easier to maintain
              type: eventType,
            });
          }
        }),
      );
    }
  }

  return mixin(MixinEventEmitInterceptor);
};
