import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import addKeywords from "ajv-keywords";
import def from "ajv-keywords/dist/definitions/dynamicDefaults";
import Ajv2019 from "ajv/dist/2019";
import { isArray } from "lodash";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";

type ReadOnlyProposalsService = Pick<ProposalsService, "findOne">;
type ReadOnlyDatasetsService = Pick<DatasetsService, "findOne" | "findAll">;

@Injectable()
export class ValidatorService {
    private ajv: Ajv2019;
    private logger: Logger = new Logger(ValidatorService.name);
    // private validateFn: ValidateFunction
    private customDefinitions: any;

    constructor(
        private readonly configService: ConfigService,
        private readonly proposalsService: ProposalsService,
        private readonly datasetsService: DatasetsService,
    ) {
        this.ajv = new Ajv2019({
            useDefaults: true,
            allErrors: true,
            strict: false,
        });
        addFormats(this.ajv); // Enable validation with common formats
        addKeywords(this.ajv);

        const modulePath = this.configService.get<string>("ajvCustomDefinitions");
        if (modulePath && modulePath.length > 0) {
            this.logger.debug(`Loading custom ajv code at ${modulePath}`);
            try {
                /* eslint-disable @typescript-eslint/no-require-imports */
                this.customDefinitions = require(modulePath);

                if (isArray(this.customDefinitions.keywords)) {
                    for (const definition of this.customDefinitions.keywords) {
                        this.logger.log(`Adding ajv keyword: '${definition.keyword}'`);
                        this.ajv.addKeyword(definition);
                    }
                }
            } catch (error) {
                this.logger.error("Failed to load");
            }
        }
    }

    async validate(publishedData: CreatePublishedDataV4Dto) {
        await this.loadDynamicDefaultFunctions(publishedData);
        const config = this.configService.get<Record<string, unknown>>(
            "publishedDataConfig",
        );
        if (!config || !config?.metadataSchema) {
            throw new Error("Missing required 'publishedDataConfig' key");
        }
        const validateFn = this.ajv.compile(config.metadataSchema);

        try {
            await validateFn(publishedData.metadata || {});
            return true;
        } catch (err) {
            if (!(err instanceof Ajv.ValidationError)) throw err;
            return false;
        }
    }

    private async loadDynamicDefaultFunctions(publishedData: CreatePublishedDataV4Dto) {
        if (
            this.customDefinitions &&
            this.customDefinitions.dynamicDefaults instanceof Map
        ) {
            for (const [
                name,
                implementation,
            ] of this.customDefinitions.dynamicDefaults.entries()) {
                if (typeof implementation !== "function") {
                    this.logger.error(
                        `Dynamic defaults function ${name} should be of type 'function' not '${typeof implementation}'.`,
                    );
                    continue;
                }

                switch (implementation.constructor.name) {
                    case "Function":
                        def.DEFAULTS[name] = () => implementation;
                        break;
                    case "AsyncFunction":
                        /**
                         * Ajv cannot 'await' during validation. To get around this, we run the
                         * AsyncFunction *now* to perform any setup (like DB queries).
                         * This returns a synchronous "inner function" that contains the
                         * pre-calculated data, which Ajv can then call safely.
                         */
                        const syncFunc = await implementation({
                            publishedData: publishedData,
                            proposalService: this.proposalsService as ReadOnlyProposalsService,
                            datasetsService: this.datasetsService as ReadOnlyDatasetsService
                        }
                        );
                        def.DEFAULTS[name] = () => syncFunc;
                        break;
                }
            }
        }
    }
}
