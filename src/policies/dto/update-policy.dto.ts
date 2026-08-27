import { OwnableDto } from "../../common/dto/ownable.dto";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { PartialType } from "@nestjs/swagger";

export class UpdatePolicyDto extends OwnableDto {
  @IsArray()
  @IsOptional()
  readonly manager: string[];

  @IsArray()
  @IsOptional()
  readonly dataDeleteEmails: string[];

  @IsString()
  @IsOptional()
  readonly tapeRedundancy: string;

  @IsBoolean()
  @IsOptional()
  readonly autoArchive: boolean;

  @IsNumber()
  @IsOptional()
  readonly autoArchiveDelay: number;

  @IsBoolean()
  @IsOptional()
  readonly archiveEmailNotification: boolean;

  @IsArray()
  @IsOptional()
  readonly archiveEmailsToBeNotified: string[];

  @IsBoolean()
  @IsOptional()
  readonly retrieveEmailNotification: boolean;

  @IsArray()
  @IsOptional()
  readonly retrieveEmailsToBeNotified: string[];

  @IsNumber()
  @IsOptional()
  readonly embargoPeriod: number;
}

export class PartialUpdatePolicyDto extends PartialType(UpdatePolicyDto) {}
