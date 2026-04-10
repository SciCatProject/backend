import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
} from "class-validator";

export class DataFileDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Relative path of the file within the dataset folder.",
  })
  @IsString()
  readonly path: string;

  @ApiProperty({
    type: Number,
    required: true,
    description: "Uncompressed file size in bytes.",
  })
  @IsNumber()
  readonly size: number;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Time of file creation on disk, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @IsDateString()
  readonly time: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Checksum for the file, e.g. its sha-2 hashstring. The hash algorithm should be encoded in the (Orig)Datablock.",
  })
  @IsString()
  @IsOptional()
  readonly chk: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "User ID name as seen on filesystem.",
  })
  @IsString()
  @IsOptional()
  readonly uid: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Group ID name as seen on filesystem.",
  })
  @IsString()
  @IsOptional()
  readonly gid: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Posix permission bits.",
  })
  @IsString()
  @IsOptional()
  readonly perm: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "File type.",
  })
  @IsString()
  @IsOptional()
  readonly type: string;

  @ApiProperty({
    type: Object,
    required: false,
    description: "File metadata.",
  })
  @IsObject()
  @IsOptional()
  readonly metadata: Record<string, unknown>;
}
