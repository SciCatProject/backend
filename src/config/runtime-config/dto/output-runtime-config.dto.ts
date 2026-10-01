import { IsString, IsObject, IsDateString } from "class-validator";

export class OutputRuntimeConfigDto {
  /**
   * Unique config identifier (e.g. 'frontendConfig', 'frontendTheme', etc.)
   */
  @IsString()
  cid: string;

  /**
   * Configuration content as a JSON object
   */
  @IsObject()
  data: Record<string, unknown>;

  /**
   * User or system that last updated the configuration
   */
  @IsString()
  updatedBy: string;

  /**
   * User or system that created the configuration
   */
  @IsString()
  createdBy: string;

  /**
   * Date/time when the configuration was created. ISO 8601 format.
   */
  @IsDateString()
  createdAt: Date;

  /**
   * Date/time when the configuration was last updated. ISO 8601 format.
   */
  @IsDateString()
  updatedAt: Date;
}
