import { PickType } from "@nestjs/swagger";

import { UpdateDatasetDto } from "src/datasets/dto/update-dataset.dto";
import { DATASET_OPENSEARCH_FIELDS } from "src/opensearch/utils/dataset-opensearch.utils";

export class DatasetOpenSearchDto extends PickType(
  UpdateDatasetDto,
  DATASET_OPENSEARCH_FIELDS,
) {}
