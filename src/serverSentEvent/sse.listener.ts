import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { ChangeStream, ChangeStreamDocument } from "mongodb";
import { plainToInstance } from "class-transformer";
import { SseService } from "./sse.service";

import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import {
  SseRegistry,
  WatchableCollection,
} from "./interfaces/sse-registry.interface";
import { SseAction } from "./interfaces/sse-event.interface";

const REGISTRY: SseRegistry = {
  Dataset: { entity: "Dataset", dto: OutputDatasetDto },
};

const ACTION_BY_OPERATION: Record<string, SseAction> = {
  insert: "created",
};

@Injectable()
export class SseListener implements OnModuleInit, OnModuleDestroy {
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly BASE_RECONNECT_DELAY_MS = 2000;
  private changeStream: ChangeStream | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly sseService: SseService,
  ) {}

  async onModuleInit() {
    if (!(await this.isDbReplicaSet())) {
      Logger.debug(
        "MongoDB is not running as a replica set. SSE change streams are disabled.",
      );
      return;
    }

    this.sseService.enable();
    this.startChangeStream();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.changeStream?.close();
    this.changeStream = null;
  }

  private startChangeStream() {
    if (this.changeStream || this.isShuttingDown) {
      return;
    }

    this.changeStream = this.connection.watch([
      {
        $match: {
          "ns.coll": { $in: Object.keys(REGISTRY) },
          operationType: { $in: Object.keys(ACTION_BY_OPERATION) },
        },
      },
    ]);

    this.changeStream.on("change", (change) => this.onChange(change));
    this.changeStream.on("error", (err) => this.onStreamError(err));

    this.reconnectAttempts = 0;
    Logger.log("SSE change stream started");
  }

  private onChange(change: ChangeStreamDocument): void {
    if (!("ns" in change) || !("coll" in change.ns)) {
      return;
    }
    const registryEntry = REGISTRY[change.ns.coll as WatchableCollection];
    const action = ACTION_BY_OPERATION[change.operationType];
    const rawDoc = "fullDocument" in change ? change.fullDocument : null;
    if (!registryEntry || !action || !rawDoc) {
      return;
    }

    this.sseService.emit({
      entity: registryEntry.entity,
      action,
      message: plainToInstance(registryEntry.dto, rawDoc),
    });
  }
  private async onStreamError(error: unknown): Promise<void> {
    Logger.error(`SSE change stream closed due to error: ${error}`);

    try {
      await this.changeStream?.close();
    } catch (closeError) {
      Logger.error(
        `Failed to close SSE change stream after error: ${closeError}`,
      );
    } finally {
      this.changeStream = null;
    }

    if (this.isShuttingDown) {
      return;
    }

    if (this.reconnectAttempts >= SseListener.MAX_RECONNECT_ATTEMPTS) {
      Logger.error(
        `Max reconnect attempts (${SseListener.MAX_RECONNECT_ATTEMPTS}) reached. SSE change stream will not restart automatically.`,
      );
      return;
    }

    this.reconnectAttempts += 1;
    const delay =
      SseListener.BASE_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempts - 1);
    Logger.warn(
      `Restarting SSE change stream in ${delay}ms (attempt ${this.reconnectAttempts}/${SseListener.MAX_RECONNECT_ATTEMPTS})`,
    );
    this.reconnectTimer = setTimeout(() => this.startChangeStream(), delay);
  }

  private async isDbReplicaSet(): Promise<boolean> {
    try {
      const info = await this.connection.db?.admin().command({ hello: 1 });
      return Boolean(info?.setName);
    } catch {
      return false;
    }
  }
}
