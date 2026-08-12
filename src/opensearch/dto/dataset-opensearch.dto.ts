import { PickType } from "@nestjs/swagger";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";

import { DATASET_OPENSEARCH_FIELDS } from "src/opensearch/utils/dataset-opensearch.utils";

export class DatasetOpenSearchDto extends PickType(
  OutputDatasetDto,
  DATASET_OPENSEARCH_FIELDS,
) {}
