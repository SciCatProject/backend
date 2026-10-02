import { PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { OwnableDto } from "../../common/dto/ownable.dto";
import { Type } from "class-transformer";
import { CreateMeasurementPeriodDto } from "./create-measurement-period.dto";

export class UpdateProposalV4Dto extends OwnableDto {
  @IsEmail()
  readonly email: string;

  @IsOptional()
  @IsString()
  readonly firstname?: string;

  @IsOptional()
  @IsString()
  readonly lastname?: string;

  @IsString()
  readonly title: string;

  @IsOptional()
  @IsString()
  readonly abstract?: string;

  @IsOptional()
  @IsDateString()
  readonly startTime?: Date;

  @IsOptional()
  @IsDateString()
  readonly endTime?: Date;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMeasurementPeriodDto)
  readonly MeasurementPeriodList?: CreateMeasurementPeriodDto[] = [];

  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  readonly parentProposalId: string | null = null;

  @IsOptional()
  @IsString()
  readonly type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly instrumentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly keywords?: string[];

  @IsOptional()
  @IsEmail()
  readonly pi_email?: string;

  @IsOptional()
  @IsString()
  readonly pi_firstname?: string;

  @IsOptional()
  @IsString()
  readonly pi_lastname?: string;

  @IsBoolean()
  @IsOptional()
  readonly isPublished?: boolean;
}

export class PartialUpdateProposalV4Dto extends PartialType(
  UpdateProposalV4Dto,
) {}
