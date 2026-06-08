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
      const method = context.switchToHttp().getRequest().method;

      return next.handle().pipe(
        tap((responseData: OutputDatasetDto) => {
          if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
            this.eventsService.emit({
              message: responseData,
              type: eventType,
            });
          }
        }),
      );
    }
  }

  return mixin(MixinEventEmitInterceptor);
};
