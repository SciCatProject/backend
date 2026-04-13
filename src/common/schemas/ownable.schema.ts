import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { QueryableClass } from "./queryable.schema";

export class OwnableClass extends QueryableClass {
  @ApiProperty({
    type: String,
    description:
      "Defines the group which owns the data, and therefore has unrestricted access to this data. Usually a pgroup like p12151",
  })
  @Prop({
    type: String,
    index: true,
  })
  ownerGroup: string;

  @ApiProperty({
    type: [String],
    description:
      "Optional additional groups which have read access to the data. Users which are members in one of the groups listed here are allowed to access this data. The special group 'public' makes data available to all users.",
  })
  @Prop({
    type: [String],
    index: true,
  })
  accessGroups: string[] = [];

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Optional additional groups which have read and write access to the data. Users which are members in one of the groups listed here are allowed to access this data.",
  })
  @Prop({
    type: String,
    required: false,
  })
  instrumentGroup?: string;

  @ApiProperty({
    type: Boolean,
    required: true,
    default: false,
    description: "Flag is true when data are made publicly available.",
  })
  @Prop({ type: Boolean, required: true, default: false })
  isPublished: boolean;
}
