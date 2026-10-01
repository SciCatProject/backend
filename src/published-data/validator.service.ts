import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import addFormats from "ajv-formats";
import addKeywords from "ajv-keywords";
import def, {
  DynamicDefaultFunc,
} from "ajv-keywords/dist/definitions/dynamicDefaults";
import Ajv2019, { Schema } from "ajv/dist/2019";
import { isArray, isEmpty, isMap, isNil } from "lodash";
import { AttachmentsService } from "src/attachments/attachments.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import {
  PartialUpdatePublishedDataV4Dto,
  UpdatePublishedDataV4Dto,
} from "./dto/update-published-data.v4.dto";
import { PublishedDataConfigDto } from "./dto/published-data-config.dto";

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

@Injectable()
export class ValidatorService {
  private ajv: Ajv2019;
  private config: PublishedDataConfigDto;
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
      }

      if (isMap(externalModule.dynamicDefaults)) {
        this.dynamicDefaults = new Map([
          ...this.dynamicDefaults,
          ...externalModule.dynamicDefaults,
        ]);
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
    if (isNil(this.config.metadataSchema)) {
      return null;
    }

    await this.loadDynamicDefaultFunctions(publishedData);

    const validateFn = this.ajv.compile(this.config.metadataSchema as Schema);
    validateFn(publishedData.metadata);
    return validateFn.errors;
  }

  private loadExternalModule(path: string) {
    Logger.debug(`Loading custom ajv code at ${path}`);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const externalModule = require(path);

    return externalModule;
  }

  private async loadDynamicDefaultFunctions(
    publishedData:
      | CreatePublishedDataV4Dto
      | UpdatePublishedDataV4Dto
      | PartialUpdatePublishedDataV4Dto,
  ) {
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
            const syncFunc = await implementation({
              publishedData: publishedData,
              proposalService: this
                .proposalsService as ReadOnlyProposalsService,
              datasetsService: this.datasetsService as ReadOnlyDatasetsService,
              attachmentsService: this
                .attachmentsService as ReadOnlyAttachmentsService,
            });
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
