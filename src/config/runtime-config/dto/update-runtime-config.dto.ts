import { IsObject } from "class-validator";

export class UpdateRuntimeConfigDto {
  /**
   * Configuration content as a JSON object
   */
  @IsObject()
  data: Record<string, unknown>;
}
