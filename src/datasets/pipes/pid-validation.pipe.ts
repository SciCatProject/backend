import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { ConfigService } from "@nestjs/config";
import { CreateDatasetDto } from "../dto/create-dataset.dto";

@Injectable()
export class PidValidationPipe implements PipeTransform<
  CreateDatasetDto,
  CreateDatasetDto
> {
  constructor(private configService: ConfigService) {
    this.datasetCreationValidationEnabled = this.configService.get<boolean>(
      "datasetCreationValidationEnabled",
    );
    this.datasetCreationValidationRegex = this.configService.get<string>(
      "datasetCreationValidationRegex",
    );
  }

  private datasetCreationValidationEnabled;
  private datasetCreationValidationRegex;

  transform(dataset: CreateDatasetDto): CreateDatasetDto {
    if (
      this.datasetCreationValidationEnabled &&
      this.datasetCreationValidationRegex &&
      dataset.pid
    ) {
      const re = new RegExp(this.datasetCreationValidationRegex);
      if (!re.test(dataset.pid)) {
        throw new BadRequestException(
          "PID is not following required standards",
        );
      }
    }

    return dataset;
  }
}
