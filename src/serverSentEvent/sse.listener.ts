// src/serverSentEvent/sse.listener.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { ChangeStream, ChangeStreamDocument } from "mongodb";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { SseService } from "./sse.service";

import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { Collection } from "./interfaces/sse-registry.interface";

// Registry to define which collections and operations should be listened to,
// and how to transform the raw MongoDB documents into DTOs for SSE messages.
const REGISTRY: Partial<
  Record<Collection, { entity: string; dto: ClassConstructor<object> }>
> = {
  Dataset: { entity: "Dataset", dto: OutputDatasetDto },
};

// Map MongoDB operations to event action names. Only listed operations are processed.
const ACTION_BY_OPERATION: Record<string, string> = {
  insert: "created",
  // update: "updated",
  // replace: "updated",
  // delete: "deleted",
};

@Injectable()
export class SseListener implements OnModuleInit, OnModuleDestroy {
  private changeStream: ChangeStream;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly sseService: SseService,
  ) {}

  async onModuleInit() {
    const isReplicaSet = await this.isDbReplicaSet();

    console.log("isReplicaSet", isReplicaSet);
    if (!isReplicaSet) {
      Logger.debug(
        "MongoDB is not running as a replica set. SSE change streams are disabled.",
      );
      return;
    }

    this.sseService.sseEnabled = isReplicaSet;

    this.changeStream = this.connection.watch([
      {
        $match: {
          "ns.coll": { $in: Object.keys(REGISTRY) },
          operationType: { $in: Object.keys(ACTION_BY_OPERATION) },
        },
      },
    ]);

    this.changeStream.on("change", (change) => this.onStream(change));
    this.changeStream.on("error", (err) =>
      Logger.error(`SSE change stream is closed due to error: ${err}`),
    );
  }

  private onStream(change: ChangeStreamDocument) {
    if (!("ns" in change) || !("coll" in change.ns)) {
      return;
    }
    const config = REGISTRY[change.ns.coll as Collection];
    const action = ACTION_BY_OPERATION[change.operationType];

    if (!config || !action) return;

    const rawDoc = "fullDocument" in change ? change.fullDocument : null;

    if (!rawDoc) return;

    this.sseService.emit({
      message: plainToInstance(config.dto, rawDoc),
      action: action,
      entity: config.entity,
    });
  }

  private async isDbReplicaSet(): Promise<boolean> {
    try {
      const info = await this.connection.db?.admin().command({ hello: 1 });
      return Boolean(info?.setName);
    } catch {
      return false;
    }
  }

  onModuleDestroy() {
    return this.changeStream?.close();
  }
}
