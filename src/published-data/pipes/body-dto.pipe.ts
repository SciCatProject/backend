import { V3ToV4MigrationPipe } from "src/common/pipes/v3-to-v4-migration.pipe";
import { CreatePublishedDataDto } from "../dto/create-published-data.dto";
import { CreatePublishedDataV4Dto } from "../dto/create-published-data.v4.dto";
import { publishedDataV3toV4FieldMap } from "../dto/published-data.obsolete.dto";
import { PublishedDataStatus } from "../interfaces/published-data.interface";

export const V3_TO_V4_DTO_BODY_PIPE = new V3ToV4MigrationPipe<
  CreatePublishedDataDto,
  CreatePublishedDataV4Dto
>({
  ...publishedDataV3toV4FieldMap,
  status: (src: CreatePublishedDataDto): PublishedDataStatus =>
    src.status === "registered"
      ? PublishedDataStatus.REGISTERED
      : PublishedDataStatus.PRIVATE,
});
