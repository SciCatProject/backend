import { firstValueFrom } from "rxjs";
import { Validator } from "jsonschema";
import { Request } from "express";
import { REQUEST } from "@nestjs/core";
import { HttpService } from "@nestjs/axios";
import { PipeTransform, Inject, Injectable, Logger } from "@nestjs/common";
import { CreateDatasetDto } from "../dto/create-dataset.dto";
import { CreateDerivedDatasetObsoleteDto } from "../dto/create-derived-dataset-obsolete.dto";
import { CreateRawDatasetObsoleteDto } from "../dto/create-raw-dataset-obsolete.dto";
import {
  UpdateDatasetDto,
  PartialUpdateDatasetDto,
} from "../dto/update-dataset.dto";
import { DatasetsService } from "../datasets.service";
import {
  PartialUpdateRawDatasetObsoleteDto,
  UpdateRawDatasetObsoleteDto,
} from "../dto/update-raw-dataset-obsolete.dto";
import {
  PartialUpdateDerivedDatasetObsoleteDto,
  UpdateDerivedDatasetObsoleteDto,
} from "../dto/update-derived-dataset-obsolete.dto";

type DatasetDto =
  | CreateDatasetDto
  | CreateDerivedDatasetObsoleteDto
  | CreateRawDatasetObsoleteDto
  | UpdateDatasetDto
  | UpdateDerivedDatasetObsoleteDto
  | UpdateRawDatasetObsoleteDto
  | PartialUpdateDatasetDto
  | PartialUpdateDerivedDatasetObsoleteDto
  | PartialUpdateRawDatasetObsoleteDto;

type ValidatedDto = DatasetDto & { scientificMetadataValid?: boolean };

@Injectable()
export class ScientificMetadataValidationPipe implements PipeTransform<
  DatasetDto,
  Promise<ValidatedDto>
> {
  constructor(
    private readonly httpService: HttpService,
    private readonly datasetsService: DatasetsService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async transform(datasetDto: DatasetDto): Promise<ValidatedDto> {
    const updatedDto = JSON.parse(JSON.stringify(datasetDto));

    if (this.request.method === "PATCH") {
      try {
        const pid = this.request.params?.pid;
        const currentDataset = await this.datasetsService.findOne({
          where: { pid },
        });

        updatedDto.scientificMetadata =
          updatedDto.scientificMetadata ?? currentDataset?.scientificMetadata;
        updatedDto.scientificMetadataSchema =
          updatedDto.scientificMetadataSchema ??
          currentDataset?.scientificMetadataSchema;
      } catch (error) {
        Logger.log(
          `Failed to fetch existing dataset: ${error instanceof Error ? error.message : error}`,
          "ScientificMetadataValidationPipe",
        );
      }
    }

    if (updatedDto.scientificMetadata && updatedDto.scientificMetadataSchema) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<Record<string, unknown>>(
            updatedDto.scientificMetadataSchema,
            { validateStatus: () => true },
          ),
        );
        // Check HTTP status
        if (response.status !== 200) {
          Logger.log(
            `
              Schema fetch failed with status ${response.status}:
              ${response.statusText}
            `,
            "ScientificMetadataValidationPipe",
          );
          return {
            ...updatedDto,
            scientificMetadataValid: false,
          };
        }
        const schema = response.data;
        // Check if response is an object
        if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
          Logger.log(
            "Fetched schema is not a valid JSON object.",
            "ScientificMetadataValidationPipe",
          );
          return {
            ...updatedDto,
            scientificMetadataValid: false,
          };
        }

        const validator = new Validator();
        const validationResult = validator.validate(
          updatedDto.scientificMetadata,
          schema,
        );
        // Append dataset dto with validation result
        return {
          ...updatedDto,
          scientificMetadataValid: validationResult.errors.length === 0,
        };
      } catch (error) {
        Logger.log(
          error instanceof Error ? `${error.message}` : `${error}`,
          "ScientificMetadataValidationPipe",
        );
        return {
          ...updatedDto,
          scientificMetadataValid: false,
        };
      }
    }

    return updatedDto;
  }
}
