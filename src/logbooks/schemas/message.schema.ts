import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { MessageContent, MessageContentSchema } from "./message-content.schema";

export type MessageDocument = Message & Document;

@Schema()
export class Message {
  @Prop({ type: MessageContentSchema })
  content: MessageContent;

  @Prop()
  event_id: string;

  @Prop()
  origin_server_ts: number;

  @Prop()
  sender: string;

  @Prop()
  senderName?: string;

  @Prop()
  datasetPid?: string;

  @Prop()
  type: string;

  @Prop(
    raw({
      age: { type: Number },
    }),
  )
  unsigned: Record<string, number>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
