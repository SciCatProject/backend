import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { QueryableClass } from "src/common/schemas/queryable.schema";

export type RuntimeConfigDocument = RuntimeConfig & Document;

@Schema({
  collection: "RuntimeConfig",
  timestamps: true,
})
export class RuntimeConfig extends QueryableClass {
  @ApiProperty({
    type: String,
    description: "Unique config identifier (e.g. 'frontend', 'backend', etc.)",
  })
  @Prop({ type: String, unique: true, required: true, index: true })
  cid: string;

  @ApiProperty({
    type: Object,
    description: "Configuration data stored as JSON",
  })
  @Prop({ type: Object, required: true, default: {} })
  data: Record<string, unknown>;
}

export const RuntimeConfigSchema = SchemaFactory.createForClass(RuntimeConfig);
