// dataset-changed.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Controller, Delete, Patch, Post, Sse, UseInterceptors } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class DatasetChangedInterceptor implements NestInterceptor {
  constructor(private readonly sseService: SseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => this.sseService.emit()),
    );
  }
}

// sse.service.ts
@Injectable()
export class SseService {
  private subject = new Subject<MessageEvent>();

  emit() {
    this.subject.next({ data: "dataset.changed" });
  }

  getEvents(): Observable<MessageEvent> {
    return this.subject.asObservable();
  }
}
// datasets.controller.ts
@Controller("datasets")
export class DatasetsController {

  @Sse("events")
  datasetEvents(): Observable<MessageEvent> {
    return this.sseService.getEvents();
  }

  @UseInterceptors(DatasetChangedInterceptor)
  @Post()
  async create(...) { ... }

  @UseInterceptors(DatasetChangedInterceptor)
  @Patch(":id")
  async update(...) { ... }

  @UseInterceptors(DatasetChangedInterceptor)
  @Delete(":id")
  async remove(...) { ... }
}
// frontend
const eventSource = new EventSource("/api/v3/datasets/events");

eventSource.onmessage = () => {
  this.store.dispatch(fetchDatasets());
};