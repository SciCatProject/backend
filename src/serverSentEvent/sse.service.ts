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

export interface HasAccessGroups {
  ownerGroup?: string;
  accessGroups?: string[];
}

@Injectable()
export class SseService {
  private readonly MAX_CONNECTIONS_PER_USER_PER_INSTANCE = 5;
  private clients = new Map<
    string,
    { user: JWTUser; subject: Subject<MessageEvent> }
  >();
  private accessGroups;
  public sseEnabled = false;

  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }

  getEvents(user: JWTUser): Observable<MessageEvent> {
    if (!this.sseEnabled) {
      throw new ServiceUnavailableException("SSE are not enabled.");
    }
    const userConnectionCount = [...this.clients.values()].filter(
      (c) => c.user._id === user._id,
    ).length;

    if (userConnectionCount >= this.MAX_CONNECTIONS_PER_USER_PER_INSTANCE) {
      throw new ForbiddenException(
        `Maximum number of ${this.MAX_CONNECTIONS_PER_USER_PER_INSTANCE} open connections reached`,
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

  emit(event: { message: HasAccessGroups; action: string; entity: string }) {
    for (const [, { user, subject }] of this.clients) {
      const userGroups = user.currentGroups ?? [];
      const instanceOwnerGroup = event.message.ownerGroup ?? "";
      const instanceAccessGroups = event.message.accessGroups ?? [];

      // TODO: this logic is duplicated from CaslAbilityFactory, consider centralizing it
      // after the refacor of CaslAbilityFactory is done
      const canAccess =
        userGroups.includes(instanceOwnerGroup) ||
        instanceAccessGroups.some((g) => userGroups.includes(g)) ||
        userGroups.some((g) => this.accessGroups?.admin?.includes(g));

      if (canAccess) {
        subject.next({
          type: `${event.entity}.${event.action}`,
          data: event.message,
        });
      }
    }
  }

  getAllConnections() {
    if (!this.sseEnabled) {
      throw new ServiceUnavailableException("SSE are not enabled.");
    }
    const counts = new Map<string, number>();

    for (const { user } of this.clients.values()) {
      counts.set(user.username, (counts.get(user.username) ?? 0) + 1);
    }
    return {
      connections: this.clients.size,
      users: Object.fromEntries(counts),
    };
  }
}
