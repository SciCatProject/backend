import { Injectable, PipeTransform } from "@nestjs/common";
import { createDeepSetter } from "src/common/utils/deep-mapper.util";
import { CreatePublishedDataDto } from "../dto/create-published-data.dto";
import { CreatePublishedDataV4Dto } from "../dto/create-published-data.v4.dto";
import { publishedDataV3toV4FieldMap } from "../dto/published-data.obsolete.dto";
import { PublishedDataStatus } from "../interfaces/published-data.interface";

const dtoV3toV4 = createDeepSetter<
  CreatePublishedDataDto,
  CreatePublishedDataV4Dto
>({
  ...publishedDataV3toV4FieldMap,
  status: (src: CreatePublishedDataDto): PublishedDataStatus =>
    src.status === "registered"
      ? PublishedDataStatus.REGISTERED
      : PublishedDataStatus.PRIVATE,
});

function mapV3BodyToV4(
  source: CreatePublishedDataDto,
): CreatePublishedDataV4Dto {
  const mapped = dtoV3toV4(source);
  const pidArray = (source as unknown as { pidArray?: unknown }).pidArray;

  if (typeof pidArray === "string") {
    return { ...mapped, datasetPids: [pidArray] };
  }

  if (pidArray === null) {
    return { ...mapped, datasetPids: [] };
  }

  return mapped;
}

@Injectable()
export class V3ToV4MigrationPipe<S, T> implements PipeTransform {
  constructor(private readonly mapper: (source: S) => T) {}

  transform(value: S): T {
    return this.mapper(value);
  }
}

export const V3_TO_V4_DTO_BODY_PIPE = new V3ToV4MigrationPipe(mapV3BodyToV4);
