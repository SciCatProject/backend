import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional } from "class-validator";

export class SearchDto {
  @ApiProperty({
    type: String,
    required: false,
    default: "",
    description: "text query",
  })
  readonly text: string;

  @ApiProperty({
    type: Array,
    required: false,
    default: [],
    description: "ownerGroup",
  })
  @IsOptional()
  readonly ownerGroup: [];

  @ApiProperty({
    type: Array,
    required: false,
    default: [],
    description: "creationLocation",
  })
  @IsOptional()
  readonly creationLocation: [];

  @ApiProperty({
    type: Array,
    required: false,
    default: [],
    description: "type",
  })
  @IsOptional()
  readonly type: [];

  @ApiProperty({
    type: Array,
    required: false,
    default: [],
    description: "keywords",
  })
  @IsOptional()
  readonly keywords: [];

  @ApiProperty({
    type: Boolean,
    required: false,
    default: false,
    description: "isPublished",
  })
  @IsOptional()
  readonly isPublished: boolean;

  @ApiProperty({
    type: Array,
    items: {
      type: "object",
      properties: {
        lhs: { type: "string" },
        relation: { type: "string" },
        rhs: {
          type: "number",
          description: "This can be either a number or a string",
        },
        unit: { type: "string" },
      },
    },
    required: false,
    default: [
      {
        lhs: "",
        relation: "",
        rhs: 0,
        unit: "",
      },
    ],
    description: "scientificMetadata condition",
  })
  @IsOptional()
  @IsArray()
  readonly scientific: Array<{
    lhs: string;
    relation: string;
    rhs: number | string;
    unit: string;
  }>;
}
