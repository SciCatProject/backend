import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { DataFile, DataFileSchema } from "src/common/schemas/datafile.schema";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";

export type DatablockDocument = Datablock & Document;

@Schema({
  collection: "Datablock",
  toJSON: {
    getters: true,
  },
  timestamps: true,
})
export class Datablock extends OwnableClass {
  @ApiProperty({
    type: String,
    default: () => uuidv4(),
  })
  @Prop({
    type: String,
    required: true,
    default: () => uuidv4(),
  })
  _id: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "PID of the dataset to which the datablock belongs.",
  })
  @Prop({ type: String, ref: "Dataset", required: true })
  datasetId: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Unique identifier given by the archive system to the stored datablock. This id is used when data is retrieved back.",
  })
  @Prop({
    type: String,
    required: true,
    unique: true,
    sparse: true,
  })
  archiveId: string;

  @ApiProperty({
    type: Number,
    required: true,
    description:
      "Total size in bytes of all files in the datablock when on accessible.",
  })
  @Prop({
    type: Number,
    required: true,
  })
  size: number;

  @ApiProperty({
    type: Number,
    required: true,
    description:
      "Total size in bytes of all files in the datablock when on archived.",
  })
  @Prop({
    type: Number,
    required: true,
  })
  packedSize: number;

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
    type: String,
    required: true,
    description:
      "Version string defining the format of how data is packed and stored in archive.",
  })
  @Prop({
    type: String,
    required: true,
  })
  version: string;

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(DataFile) },
    required: true,
    description: "Embedded schema definition for each file.",
  })
  @Prop({
    type: [DataFileSchema],
    required: true,
  })
  dataFileList: DataFile[];
}

export const DatablockSchema = SchemaFactory.createForClass(Datablock);

DatablockSchema.index({ datasetId: 1 });
