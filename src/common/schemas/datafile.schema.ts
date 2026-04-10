import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type DataFileDocument = DataFile & Document;

@Schema()
export class DataFile {
  @ApiProperty({
    type: String,
    required: true,
    description: "Relative path of the file within the dataset folder.",
  })
  @Prop({
    type: String,
    required: true,
  })
  path: string;

  @ApiProperty({
    type: Number,
    required: true,
    description: "Uncompressed file size in bytes.",
  })
  @Prop({
    type: Number,
    required: true,
  })
  size: number;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Time of file creation on disk, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @Prop({
    type: Date,
    required: true,
  })
  time: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Checksum for the file, e.g. its sha-2 hashstring. The hash algorithm should be encoded in the (Orig)Datablock.",
  })
  @Prop({
    type: String,
    required: false,
  })
  chk: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "User ID name as seen on filesystem.",
  })
  @Prop({
    type: String,
    required: false,
  })
  uid: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Group ID name as seen on filesystem.",
  })
  @Prop({
    type: String,
    required: false,
  })
  gid: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Posix permission bits.",
  })
  @Prop({
    type: String,
    required: false,
  })
  perm: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "The type of the datafile.",
  })
  @Prop({
    type: String,
    required: false,
  })
  type?: string;

  @ApiProperty({
    type: Object,
    required: false,
    description: "File metadata.",
  })
  @Prop({
    type: Object,
    required: false,
  })
  metadata?: Record<string, unknown>;
}

export const DataFileSchema = SchemaFactory.createForClass(DataFile);
