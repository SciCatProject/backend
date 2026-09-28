import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";

export type MessageContentDocument = MessageContent & Document;

@Schema()
export class MessageContent {
  @Prop()
  body: string;

  @Prop()
  metadataPrefix?: string;

  @Prop()
  datasetPid?: string;

  @Prop(
    raw({
      thumbnail_url: { type: String },
    }),
  )
  info?: Record<string, string>;

  @Prop()
  msgtype: string;

  @Prop()
  url?: string;
}

export const MessageContentSchema =
  SchemaFactory.createForClass(MessageContent);
