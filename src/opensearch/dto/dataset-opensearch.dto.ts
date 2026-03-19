import { OmitType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";

import { DATASET_OPENSEARCH_FIELDS } from "src/opensearch/utils/dataset-opensearch.utils";

export class DatasetOpenSearchDto extends OmitType(
  OutputDatasetDto,
  DATASET_OPENSEARCH_FIELDS,
) {
  @Expose() pid: string;
  @Expose() description?: string;
  @Expose() datasetName: string;
  @Expose() isPublished?: boolean;
  @Expose() ownerGroup: string;
  @Expose() accessGroups: string[];
}
