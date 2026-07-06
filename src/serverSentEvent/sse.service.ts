import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Subject, Observable, finalize } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import {
  SseClient,
  HasAccessGroups,
  SseEvent,
  SseConnectionsReport,
} from "./interfaces/sse-event.interface";

@Injectable()
export class SseService {
  private static readonly MAX_CONNECTIONS_PER_USER_PER_INSTANCE = 5;
  private readonly clients = new Map<string, SseClient>();
  private accessGroups?: AccessGroupsType;
  public sseEnabled = false;

  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  enable(): void {
    this.sseEnabled = true;
  }
  getEvents(user: JWTUser): Observable<MessageEvent> {
    this.checkEnabled();

    if (
      this.getCurrentUserConnectionsCount(user) >=
      SseService.MAX_CONNECTIONS_PER_USER_PER_INSTANCE
    ) {
      throw new ForbiddenException(
        `Maximum number of ${SseService.MAX_CONNECTIONS_PER_USER_PER_INSTANCE} open connections reached for user: ${user.username}`,
      );
    }

    const subject = new Subject<MessageEvent>();
    const connectionId = `${user._id}-${randomUUID()}`;
    this.clients.set(connectionId, {
      user,
      subject,
    });
    return subject.asObservable().pipe(
      finalize(() => {
        this.clients.delete(connectionId);
      }),
    );
  }

  emit<T extends HasAccessGroups>(event: SseEvent<T>): void {
    const message: MessageEvent = {
      data: { type: `${event.entity}.${event.action}`, data: event.message },
    };

    for (const { user, subject } of this.clients.values()) {
      if (this.canUserAccess(user, event.message)) {
        console.log(this.canUserAccess(user, event.message));
        subject.next(message);
      }
    }
  }

  getAllConnections(): SseConnectionsReport {
    this.checkEnabled();

    const users: Record<string, number> = {};
    for (const { user } of this.clients.values()) {
      users[user.username] = (users[user.username] ?? 0) + 1;
    }

    return { connections: this.clients.size, users };
  }

  onModuleDestroy(): void {
    for (const { subject } of this.clients.values()) {
      subject.complete();
    }
    this.clients.clear();
  }

  private checkEnabled(): void {
    if (!this.sseEnabled) {
      throw new ServiceUnavailableException("SSE is not enabled.");
    }
  }

  private getCurrentUserConnectionsCount(user: JWTUser): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.user._id === user._id) count++;
    }
    return count;
  }

  private canUserAccess(user: JWTUser, document: HasAccessGroups): boolean {
    return this.canAccessByGroups(
      user.currentGroups,
      document,
      this.accessGroups?.admin,
    );
  }

  private canAccessByGroups(
    userGroups: readonly string[] = [],
    document: HasAccessGroups,
    adminGroups: readonly string[] = [],
  ): boolean {
    const isOwner =
      !!document.ownerGroup && userGroups.includes(document.ownerGroup);
    const hasAccessGroup = (document.accessGroups ?? []).some((group) =>
      userGroups.includes(group),
    );
    const isAdmin = userGroups.some((group) => adminGroups.includes(group));

    return isOwner || hasAccessGroup || isAdmin;
  }
}
