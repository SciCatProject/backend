import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";
import { OwnableDto } from "../../common/dto/ownable.dto";

export class UpdateSampleDto extends OwnableDto {
  /**
   * The owner of the sample.
   */
  @IsString()
  @IsOptional()
  readonly owner?: string;

  /**
   * A description of the sample.
   */
  @IsString()
  @IsOptional()
  readonly description?: string;

  /**
   * The type of the sample.
   */
  @IsString()
  @IsOptional()
  readonly type?: string;

  /**
   * The proposal ID associated with the sample.
   */
  @IsString()
  @IsOptional()
  readonly proposalId?: string;

  /**
   * The Id of the parent sample if this is a derived sample.
   */
  @IsString()
  @IsOptional()
  readonly parentSampleId?: string;

  /**
   * JSON object containing the sample characteristics metadata.
   */
  @IsObject()
  @IsOptional()
  readonly sampleCharacteristics?: Record<string, unknown> = {};

  /**
   * Flag is true when data are made publicly available.
   */
  @IsBoolean()
  @IsOptional()
  readonly isPublished?: boolean = false;
}

export class PartialUpdateSampleDto extends PartialType(UpdateSampleDto) {}
