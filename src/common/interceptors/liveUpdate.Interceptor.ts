import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { EventsService } from "src/serverSideEvent/serverSideEvent.service";

@Injectable()
export class DatasetEventsInterceptor implements NestInterceptor {
  constructor(private readonly eventsService: EventsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    return next.handle().pipe(
      tap((responseData: OutputDatasetDto) => {
        if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
          this.eventsService.emit({
            ownerGroup: responseData?.ownerGroup,
            accessGroups: responseData?.accessGroups ?? [],
            message: "dataset.updated",
            type: "dataset.updated",
          });
        }
      }),
    );
  }
}
