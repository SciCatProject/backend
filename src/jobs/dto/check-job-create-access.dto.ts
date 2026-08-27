import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

@ApiTags("jobs")
export class CheckJobCreateAccessDto {
  /**
   * Valid job type as defined in configuration, to check dataset eligibility for.
   */
  @IsString()
  readonly type: string;

  /**
   * Dataset pids to check eligibility for.
   */
  @IsArray()
  @IsString({ each: true })
  readonly datasetIds: string[];
}

@ApiTags("jobs")
export class CheckJobCreateAccessResponseDto {
  /**
   * Subset of the requested dataset pids that the current user is currently
   * authorized to include when creating a job of the given type.
   */
  readonly eligibleDatasetIds: string[];
}
