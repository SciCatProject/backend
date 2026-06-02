import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

@Injectable()
export class EventsService {
  private eventSubject = new Subject<{ type: string; message: string }>();

  emit({ type, message }: { type: string; message: string }) {
    this.eventSubject.next({ type, message });
  }

  getEvents() {
    return this.eventSubject.asObservable();
  }
}
