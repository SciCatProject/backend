import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import addFormats from "ajv-formats";
import addKeywords from "ajv-keywords";
import def, {
  DynamicDefaultFunc,
} from "ajv-keywords/dist/definitions/dynamicDefaults";
import Ajv2019, { KeywordDefinition, Schema } from "ajv/dist/2019";
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

export type ValidationContext = {
  publishedData:
    | CreatePublishedDataV4Dto
    | UpdatePublishedDataV4Dto
    | PartialUpdatePublishedDataV4Dto;
  proposalService: ReadOnlyProposalsService;
  datasetsService: ReadOnlyDatasetsService;
  attachmentsService: ReadOnlyAttachmentsService;
};

type Keyword = { keyword: string; validate: unknown };

@Injectable()
export class ValidatorService {
  private ajv: Ajv2019;
  private config: PublishedDataConfigDto;
  private keywords: Keyword[] = [];
  private dynamicDefaults: Map<string, DynamicDefaultFunc> = new Map([
    ["currentYear", () => () => new Date().getFullYear()],
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly proposalsService: ProposalsService,
    private readonly datasetsService: DatasetsService,
    private readonly attachmentsService: AttachmentsService,
  ) {
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
        this.keywords = externalModule.keywords;
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

    this.ajv = new Ajv2019({
      useDefaults: "empty",
      allErrors: true,
      strict: false,
    });
    addFormats(this.ajv);
    addKeywords(this.ajv);
    const context = {
      publishedData,
      proposalService: this.proposalsService as ReadOnlyProposalsService,
      datasetsService: this.datasetsService as ReadOnlyDatasetsService,
      attachmentsService: this.attachmentsService as ReadOnlyAttachmentsService,
    };
    await this.loadDynamicDefaults(context);
    await this.loadKeywords(context);

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

  private async loadDynamicDefaults(context: ValidationContext) {
    for (const [name, implementation] of this.dynamicDefaults.entries()) {
      const resolved = await this.resolveDynamicDefault(
        name,
        implementation,
        context,
      );
      if (!resolved) continue;
      def.DEFAULTS[name] = resolved;
    }
  }

  private async loadKeywords(context: ValidationContext) {
    for (const keywordDefinition of this.keywords) {
      const resolved = await this.resolveKeyword(keywordDefinition, context);
      if (!resolved) continue;
      this.ajv.addKeyword(resolved as KeywordDefinition);
    }
  }

  private async resolveDynamicDefault(
    name: string,
    implementation: unknown,
    context: unknown,
  ): Promise<DynamicDefaultFunc | null> {
    if (typeof implementation !== "function") {
      Logger.error(
        `Ignoring dynamicDefaults function '${name}' should be of type 'function' not '${typeof implementation}'.`,
      );
      return null;
    }

    if (implementation.constructor.name === "AsyncFunction") {
      try {
        const syncFunc = await implementation(context);
        return () => syncFunc;
      } catch (err) {
        throw new Error(
          `Executing dynamicDefaults function '${name}' failed with the following error:`,
          { cause: err },
        );
      }
    }
    return implementation as DynamicDefaultFunc;
  }

  private async resolveKeyword(
    keywordDefinition: Keyword,
    context: unknown,
  ): Promise<Keyword | null> {
    const { keyword, validate } = keywordDefinition;

    if (typeof validate !== "function") {
      Logger.error(
        `Ignoring keyword '${keyword}' validate should be of type 'function' not '${typeof validate}'.`,
      );
      return null;
    }

    if (validate.constructor.name === "AsyncFunction") {
      try {
        const resolvedValidate = await validate(context);
        const normalized: Keyword = {
          ...keywordDefinition,
          validate: resolvedValidate,
        };
        return normalized;
      } catch (err) {
        throw new Error(
          `Executing keyword '${keyword}' failed with the following error:`,
          { cause: err },
        );
      }
    }

    return keywordDefinition;
  }
}
