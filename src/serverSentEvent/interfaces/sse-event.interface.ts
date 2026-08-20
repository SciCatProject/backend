import { Subject } from "rxjs";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { MessageEvent } from "@nestjs/common";

export interface SseClient {
  user: JWTUser;
  subject: Subject<MessageEvent>;
}

/**
 * Event action names emitted over SSE. Only "created" is produced today
 * (insert operations); "updated"/"deleted" are reserved for future use.
 */
export type SseAction = "created" | "updated" | "deleted";

export interface HasAccessGroups {
  ownerGroup?: string;
  accessGroups?: string[];
}

export interface SseEvent<T extends HasAccessGroups = HasAccessGroups> {
  entity: string;
  action: SseAction;
  message: T;
}

export interface SseConnectionsReport {
  connections: number;
  users: Record<string, number>;
}
