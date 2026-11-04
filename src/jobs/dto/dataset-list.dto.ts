import { Expose } from "class-transformer";
import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class DatasetListDto {
  /**
   * The value for the pid key defines the dataset ID.
   */
  @IsString()
  @IsNotEmpty()
  @Expose()
  readonly pid: string;

  /**
   * The value for the files key is an array of file names. This array is either an empty array, implying that all files within the dataset are selected, or an explicit list of dataset-relative file paths, which should be selected.
   */
  @IsArray()
  @IsString({ each: true })
  @Expose()
  readonly files: string[];
}

export const uniquePids = (datasetList: Pick<DatasetListDto, "pid">[]) => [
  ...new Set(datasetList.map(({ pid }) => pid)),
];
