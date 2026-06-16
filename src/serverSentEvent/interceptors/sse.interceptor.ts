import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Type,
  mixin,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { HasAccessGroups, SseService } from "src/serverSentEvent/sse.service";

export const EVENT_METHODS: Record<string, string> = {
  DATASET_CREATED: "dataset.created",
  // PROPOSAL_CREATED: "proposal.created",
  // SAMPLE_CREATED: "sample.created",
  // INSTRUMENT_CREATED: "instrument.created",
} as const;

export type SseEventType = (typeof EVENT_METHODS)[keyof typeof EVENT_METHODS];

export const SseInterceptor = (
  eventType: SseEventType,
): Type<NestInterceptor> => {
  @Injectable()
  class MixinSseInterceptor implements NestInterceptor {
    constructor(public readonly sseService: SseService) {}

    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      return next.handle().pipe(
        tap((responseData: HasAccessGroups) => {
          this.sseService.emit({
            message: responseData,
            type: eventType,
          });
        }),
      );
    }
  }

  return mixin(MixinSseInterceptor);
};
