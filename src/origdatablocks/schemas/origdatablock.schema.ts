import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";
import { DataFile, DataFileSchema } from "src/common/schemas/datafile.schema";

export type OrigDatablockDocument = OrigDatablock & Document;

@Schema({
  collection: "OrigDatablock",
  toJSON: {
    getters: true,
  },
  timestamps: true,
})
export class OrigDatablock extends OwnableClass {
  @ApiProperty({
    type: String,
    default: () => uuidv4(),
  })
  @Prop({
    type: String,
    //unique: true,
    required: true,
    default: () => uuidv4(),
  })
  _id: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "PID of the dataset to which the orig datablock belongs.",
  })
  @Prop({ type: String, ref: "Dataset", required: true })
  datasetId: string;

  @ApiProperty({
    type: Number,
    required: true,
    description:
      "Total size in bytes of all files contained in the dataFileList.",
  })
  @Prop({
    type: Number,
    required: true,
  })
  size: number;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Algorithm used for calculation of file checksums. Should be lowercase, e.g., sha2 or blake2b.",
  })
  @Prop({
    type: String,
    required: false,
  })
  chkAlg: string;

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(DataFile) },
    required: true,
    description: "Embedded schema definitions for each file.",
  })
  @Prop({
    type: [DataFileSchema],
    required: true,
  })
  dataFileList: DataFile[];
}

export const OrigDatablockSchema = SchemaFactory.createForClass(OrigDatablock);

OrigDatablockSchema.index({ "$**": "text" });
OrigDatablockSchema.index({ datasetId: 1 });
