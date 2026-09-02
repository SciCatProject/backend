import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { OwnableClass } from "../schemas/ownable.schema";

export class BaseOutputDto extends OwnableClass {
  @ApiProperty()
  @Expose()
  _id: string;

  @ApiProperty()
  @Expose()
  id: string;

  @Expose()
  declare createdBy: string;

  @Expose()
  declare updatedBy: string;

  @Expose()
  declare createdAt: Date;

  @Expose()
  declare updatedAt: Date;

  @Expose()
  declare ownerGroup: string;

  @Expose()
  declare accessGroups: string[];

  @Expose()
  declare instrumentGroup?: string;

  @Expose()
  declare isPublished: boolean;
}
