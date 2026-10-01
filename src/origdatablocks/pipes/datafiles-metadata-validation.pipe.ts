import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import {
  BadRequestException,
  InternalServerErrorException,
  PipeTransform,
  Injectable,
} from "@nestjs/common";
import { CreateOrigDatablockDto } from "../dto/create-origdatablock.dto";
import {
  UpdateOrigDatablockDto,
  PartialUpdateOrigDatablockDto,
} from "../dto/update-origdatablock.dto";
import { CreateDatasetOrigDatablockDto } from "../dto/create-dataset-origdatablock";

import { ConfigService } from "@nestjs/config";

type OrigdatablockDto =
  | CreateOrigDatablockDto
  | UpdateOrigDatablockDto
  | PartialUpdateOrigDatablockDto
  | CreateDatasetOrigDatablockDto;

@Injectable()
export class DatafilesMetadataValidationPipe implements PipeTransform<
  OrigdatablockDto,
  OrigdatablockDto
> {
  constructor(private readonly configService: ConfigService) {}

  transform(origdatablockDto: OrigdatablockDto): OrigdatablockDto {
    const jsonDto = JSON.parse(JSON.stringify(origdatablockDto));
    const datafiles = origdatablockDto.dataFileList;
    const schema = this.configService.get<Record<string, unknown>>(
      "datafilesMetadataSchema",
    ) || { type: "object", additionalProperties: false };

    if (!datafiles) {
      return jsonDto;
    }

    const ajv = new Ajv({
      allErrors: true,
      strict: false,
    });
    addFormats(ajv);
    const validateMetadata = this.compileSchema(ajv, schema);

    for (const datafile of datafiles) {
      const jsonMetadata = JSON.parse(JSON.stringify(datafile.metadata ?? {}));
      const valid = validateMetadata(jsonMetadata);
      if (!valid) {
        const validationErrors = ajv.errorsText(validateMetadata.errors, {
          dataVar: "metadata",
          separator: "; ",
        });
        throw new BadRequestException(
          `Datafile metadata is not following the configured schema: ${validationErrors}`,
        );
      }
    }
    return jsonDto;
  }

  private compileSchema(
    ajv: Ajv,
    schema: Record<string, unknown>,
  ): ValidateFunction {
    try {
      return ajv.compile(schema);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      throw new InternalServerErrorException(
        `Datafile metadata schema file could not be compiled: ${message}`,
      );
    }
  }
}
