import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import addFormats from "ajv-formats";
import addKeywords from "ajv-keywords";
import def, {
  DynamicDefaultFunc,
} from "ajv-keywords/dist/definitions/dynamicDefaults";
import Ajv2019, { AsyncSchema, ValidationError } from "ajv/dist/2019";
import { isArray, isEmpty, isMap, isNil } from "lodash";
import { AttachmentsService } from "src/attachments/attachments.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import { PublishedDataConfigDto } from "./dto/published-data-config.dto";
import {
  PartialUpdatePublishedDataV4Dto,
  UpdatePublishedDataV4Dto,
} from "./dto/update-published-data.v4.dto";

export type ReadOnlyProposalsService = Pick<
  ProposalsService,
  "findOne" | "findAll" | "count"
>;
export type ReadOnlyDatasetsService = Pick<
  DatasetsService,
  "findOne" | "findAll" | "count"
>;
export type ReadOnlyAttachmentsService = Pick<
  AttachmentsService,
  "findOne" | "findAll" | "count"
>;

export type ValidationContext = {
  publishedData:
    | CreatePublishedDataV4Dto
    | UpdatePublishedDataV4Dto
    | PartialUpdatePublishedDataV4Dto;
  proposalService: ReadOnlyProposalsService;
  datasetsService: ReadOnlyDatasetsService;
  attachmentsService: ReadOnlyAttachmentsService;
};

@Injectable()
export class ValidatorService {
  private ajv: Ajv2019;
  private config: PublishedDataConfigDto;
  private metadataSchema: AsyncSchema | undefined;
  private dynamicDefaults: Map<string, DynamicDefaultFunc> = new Map([
    ["currentYear", () => () => new Date().getFullYear()],
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly proposalsService: ProposalsService,
    private readonly datasetsService: DatasetsService,
    private readonly attachmentsService: AttachmentsService,
  ) {
    this.ajv = new Ajv2019({
      useDefaults: "empty",
      allErrors: true,
      strict: false,
      passContext: true,
    });
    addFormats(this.ajv);
    addKeywords(this.ajv);

    this.config = this.configService.get<PublishedDataConfigDto>(
      "publishedDataConfig",
      { metadataSchema: {}, uiSchema: {} },
    );

    if (isNil(this.config.metadataSchema)) {
      return;
    }

    this.metadataSchema = {
      ...this.config.metadataSchema,
      $async: true,
    };

    const modulePath = this.configService.get<string>("ajvCustomDefinitions");
    if (isEmpty(modulePath)) {
      return;
    }

    try {
      const externalModule = this.loadExternalModule(modulePath!);

      if (isArray(externalModule.keywords)) {
        for (const definition of externalModule.keywords) {
          Logger.log(`Adding ajv keyword: '${definition.keyword}'`);
          this.ajv.addKeyword(definition);
        }
      } else if (!isNil(externalModule.keywords)) {
        Logger.error(
          `Ignoring keywords exported by '${modulePath}': expected an array, got '${typeof externalModule.keywords}'.`,
        );
      }

      if (isMap(externalModule.dynamicDefaults)) {
        this.dynamicDefaults = new Map([
          ...this.dynamicDefaults,
          ...externalModule.dynamicDefaults,
        ]);
      } else if (!isNil(externalModule.dynamicDefaults)) {
        Logger.error(
          `Ignoring dynamicDefaults exported by '${modulePath}': expected a Map, got '${typeof externalModule.dynamicDefaults}'.`,
        );
      }
    } catch (error) {
      Logger.error(`Failed to load module at '${modulePath}'`, error);
      throw error;
    }
  }

  async validate(
    publishedData:
      | CreatePublishedDataV4Dto
      | UpdatePublishedDataV4Dto
      | PartialUpdatePublishedDataV4Dto,
  ) {
    if (isNil(this.metadataSchema)) {
      return null;
    }

    const context: ValidationContext = {
      publishedData,
      proposalService: this.proposalsService,
      datasetsService: this.datasetsService,
      attachmentsService: this.attachmentsService,
    };

    await this.loadDynamicDefaultFunctions(context);

    const validateFn = this.ajv.compile(this.metadataSchema);
    try {
      await validateFn.call(context, publishedData.metadata);
      return null;
    } catch (err) {
      if (err instanceof ValidationError) {
        return err.errors;
      }
      throw err;
    }
  }

  private loadExternalModule(path: string) {
    Logger.debug(`Loading custom ajv code at ${path}`);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const externalModule = require(path);

    return externalModule;
  }

  private async loadDynamicDefaultFunctions(context: ValidationContext) {
    for (const [name, implementation] of this.dynamicDefaults.entries()) {
      if (typeof implementation !== "function") {
        Logger.error(
          `Ignoring dynamic defaults function ${name} should be of type 'function' not '${typeof implementation}'.`,
        );
        continue;
      }
      switch (implementation.constructor.name) {
        case "Function":
          def.DEFAULTS[name] = implementation;
          break;
        case "AsyncFunction":
          /**
           * Ajv cannot 'await' during validation. To get around this, we run the
           * AsyncFunction now to perform any setup (like DB queries).
           */
          try {
            const syncFunc = await implementation(context);
            def.DEFAULTS[name] = () => syncFunc;
          } catch (err) {
            throw new Error(
              `Executing dynamicDefaults function '${name}' failed with the following error:`,
              { cause: err },
            );
          }
          break;
      }
    }
  }
}
