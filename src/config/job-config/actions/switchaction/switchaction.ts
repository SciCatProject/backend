import {
  JobAction,
  JobActionCreator,
  JobActionOptions,
  JobDto,
  performActions,
  validateActions,
  JobValidateContext,
  JobPerformContext,
  JobTemplateContext,
} from "../../jobconfig.interface";
import { JSONPath } from "jsonpath-plus";
import Ajv, { ValidateFunction } from "ajv";
import {
  actionType,
  CaseOptions,
  SwitchJobActionOptions,
  SwitchPhase,
} from "./switchaction.interface";
import { ModuleRef } from "@nestjs/core";
import { JSONData } from "../actionutils";
import { makeHttpException } from "src/common/utils";
import { HttpStatus, Logger } from "@nestjs/common";

/**
 * A Case gets matched against some target property.
 *
 * This base Case matches everything and is intended as a default option.
 */
class Case<Dto extends JobDto> {
  public actions: JobAction<Dto>[];

  constructor(
    options: CaseOptions,
    creators: Record<string, JobActionCreator<Dto>>,
  ) {
    this.actions = Case.parseActions<Dto>(options.actions || [], creators);
  }

  private static parseActions<Dto extends JobDto>(
    options: JobActionOptions[],
    creators: Record<string, JobActionCreator<Dto>>,
  ) {
    return options.map((opt) => {
      if (!(opt.actionType in creators)) {
        throw new Error(`Unknown action type '${opt.actionType}'`);
      }
      return creators[opt.actionType].create(opt);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public matches(json: JSONData): boolean {
    // default Case matches everything
    return true;
  }
}

/**
 * Match a literal
 */
class MatchCase<Dto extends JobDto> extends Case<Dto> {
  private match: string | number | boolean | null;
  constructor(
    options: {
      match: string | number | boolean | null;
      actions: JobActionOptions[];
    },
    creators: Record<string, JobActionCreator<Dto>>,
  ) {
    super(options, creators);
    this.match = options.match;
  }

  public matches(target: JSONData) {
    return this.match == target;
  }
}

/**
 * Match a regex
 */
class RegexCase<Dto extends JobDto> extends Case<Dto> {
  private regex: RegExp;
  constructor(
    options: { regex: string; actions: JobActionOptions[] },
    creators: Record<string, JobActionCreator<Dto>>,
    private propertyName: string,
  ) {
    super(options, creators);
    this.regex = this.parseRegex(options.regex);
  }

  private parseRegex(str: string): RegExp {
    // Try to parse the string as a slash-delimited regex
    const match = str.match(/^\/(.*)\/([a-z]*)$/);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
    throw new Error(`Expected slash-delimited regex. Got '${str}'`);
  }

  public matches(target: JSONData) {
    if (typeof target !== "string") {
      throw makeHttpException(
        `Property ${this.propertyName} was expected to be a string. Got ${target}`,
      );
    }
    // regex match
    return this.regex.test(target);
  }
}

/**
 * Match against a JSON schema
 */
class SchemaCase<Dto extends JobDto> extends Case<Dto> {
  private schema: ValidateFunction;
  constructor(
    options: { schema: object; actions: JobActionOptions[] },
    creators: Record<string, JobActionCreator<Dto>>,
    ajv: Ajv,
  ) {
    super(options, creators);
    this.schema = ajv.compile(options.schema);
  }
  public matches(target: JSONData) {
    // Validate JSON schema
    return this.schema(target);
  }
}

/**
 * Switch between different actions based on a property in the job context.
 */
export class SwitchJobAction<Dto extends JobDto> implements JobAction<Dto> {
  private phase: SwitchPhase;
  private property: string;
  private cases: Promise<Case<Dto>[]>;

  getActionType(): string {
    return actionType;
  }

  constructor(
    protected moduleRef: ModuleRef,
    options: SwitchJobActionOptions,
    creators_token: symbol | string,
    ajv?: Ajv,
  ) {
    const ajvDefined =
      ajv ||
      new Ajv({
        strictSchema: false,
        strictTypes: false,
      });
    this.phase = options.phase;
    this.property = options.property;
    const creators = this.resolveActionCreators(creators_token);

    //const x: {a:string} = {a:"a", b:1};
    // Define an interface with an index signature
    this.cases = creators.then((creators) => {
      return options.cases.map((caseOptions: CaseOptions) => {
        if ("schema" in caseOptions) {
          return new SchemaCase<Dto>(caseOptions, creators, ajvDefined);
        } else if ("regex" in caseOptions) {
          return new RegexCase<Dto>(caseOptions, creators, this.property);
        } else if ("match" in caseOptions) {
          return new MatchCase<Dto>(caseOptions, creators);
        } else {
          return new Case<Dto>(caseOptions, creators);
        }
      });
    });
  }

  /**
   * Extract the property from the target object and get the list of corresponding actions
   * @param target
   * @returns
   */
  protected async resolveActions(
    context: JobTemplateContext,
  ): Promise<JobAction<Dto>[]> {
    // Apply the JSONPath to extract matching properties
    // We might have multiple results
    const results = JSONPath({
      path: this.property,
      json: context,
      wrap: true,
    }) as JSONData[];
    const resultSet = new Set<JSONData>(results);

    if (resultSet.size > 1) {
      throw makeHttpException(
        `Ambiguous value for '${this.property}' (${resultSet.size} distinct results).'`,
      );
    }
    const [result] = resultSet;
    // Find matching case
    for (const caseItem of await this.cases) {
      if (caseItem.matches(result)) {
        return caseItem.actions;
      }
    }
    // No matching cases
    return [];
  }

  protected async resolveActionCreators(
    token: string | symbol,
  ): Promise<Record<string, JobActionCreator<Dto>>> {
    const creators = await this.moduleRef.resolve(token, undefined, {
      strict: false,
    });

    if (creators === undefined || creators.length == 0) {
      // This shouldn't happen unless the NestJS dependency graph is messed up.
      // It is left here for debugging.
      const token_str = typeof token === "symbol" ? token.description : token;
      const msg = `Unable to resolve ${token_str}. This indicates an unexpected server state.`;
      Logger.error(msg);
      throw makeHttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return creators;
  }

  /**
   * Validate the current request
   * @param dto Job DTO
   */
  async validate(context: JobValidateContext<Dto>): Promise<void> {
    if (this.phase !== SwitchPhase.Validate && this.phase !== SwitchPhase.All) {
      return;
    }
    const actions = await this.resolveActions(context);
    return await validateActions(actions, context);
  }

  async perform(context: JobPerformContext<Dto>): Promise<void> {
    if (this.phase !== SwitchPhase.Perform && this.phase !== SwitchPhase.All) {
      return;
    }
    const actions = await this.resolveActions(context);
    return await performActions(actions, context);
  }
}
