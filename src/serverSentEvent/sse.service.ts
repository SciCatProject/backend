import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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
  // Below typical proxy idle timeouts (60s); writes also surface closed sockets the proxy never reported.
  private static readonly HEARTBEAT_INTERVAL_MS = 20_000;
  private readonly clients = new Map<string, SseClient>();
  private heartbeatTimer?: NodeJS.Timeout;
  private accessGroups?: AccessGroupsType;
  public sseEnabled = false;

  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  enable(): void {
    this.sseEnabled = true;
    this.heartbeatTimer ??= setInterval(
      () => this.sendHeartbeat(),
      SseService.HEARTBEAT_INTERVAL_MS,
    ).unref();
  }
  getEvents(user: JWTUser): Observable<MessageEvent> {
    this.checkEnabled();

    // Rejecting at the limit would lock users out while a proxy still holds closed streams, so drop the oldest instead.
    while (
      this.getCurrentUserConnectionsCount(user) >=
      SseService.MAX_CONNECTIONS_PER_USER_PER_INSTANCE
    ) {
      this.evictOldestConnection(user);
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
    clearInterval(this.heartbeatTimer);
    for (const { subject } of this.clients.values()) {
      subject.complete();
    }
    this.clients.clear();
  }

  private sendHeartbeat(): void {
    // Named event: onmessage only fires for unnamed events, so existing clients never run code for it.
    const message: MessageEvent = { type: "heartbeat", data: "" };
    for (const { subject } of this.clients.values()) {
      subject.next(message);
    }
  }

  private evictOldestConnection(user: JWTUser): void {
    for (const [connectionId, client] of this.clients) {
      if (client.user._id === user._id) {
        this.clients.delete(connectionId);
        client.subject.complete();
        return;
      }
    }
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
