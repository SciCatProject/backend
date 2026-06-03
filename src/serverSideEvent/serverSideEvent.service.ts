import { Injectable } from "@nestjs/common";
import { Subject, Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";

@Injectable()
export class EventsService {
  private clients = new Map<JWTUser, { subject: Subject<MessageEvent> }>();

  getEvents(user: JWTUser): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.clients.set(user, {
      subject,
    });
    return subject.asObservable();
  }

  emit(event: {
    ownerGroup: string;
    accessGroups: string[];
    message: string;
    type: string;
  }) {
    for (const [user, { subject }] of this.clients) {
      const userGroups = user.currentGroups ?? [];

      const canSee =
        userGroups.includes(event.ownerGroup) ||
        event.accessGroups.some((g) => userGroups.includes(g)) ||
        userGroups.includes("admin");
      if (canSee) {
        subject.next({ type: event.type, data: event.message });
      }
    }
  }
}
