import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { QueryableClass } from "../../common/schemas/queryable.schema";

export type InstrumentDocument = Instrument & Document;

@Schema({
  collection: "Instrument",
  minimize: false,
  timestamps: true,
  toJSON: {
    getters: true,
  },
})
export class Instrument extends QueryableClass {
  @ApiProperty({
    type: String,
    default: function genUUID(): string {
      return (process.env.PID_PREFIX ? process.env.PID_PREFIX : "") + uuidv4();
    },
    required: false,
    description: "PID of the instrument.",
  })
  @Prop({
    type: String,
    unique: true,
    required: false,
    default: function genUUID(): string {
      return (process.env.PID_PREFIX ? process.env.PID_PREFIX : "") + uuidv4();
    },
  })
  pid: string;

  @ApiHideProperty()
  @Prop({
    type: String,
  })
  _id: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "The unique name of the instrument. This name has to be unique within the scicat instance.",
  })
  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  uniqueName: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "The common name of the instrument. This name can be non unique as it is the name that users use to commonly refer to this instrument.",
  })
  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing custom metadata.",
  })
  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  customMetadata: Record<string, unknown>;
}

export const InstrumentSchema = SchemaFactory.createForClass(Instrument);

InstrumentSchema.index({ "$**": "text" });
