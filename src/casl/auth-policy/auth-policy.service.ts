import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import { AuthPolicy } from "./auth-policy.interface";
import { validateAuthPolicy } from "./auth-policy.schema";

/**
 * Loads and validates an optional `auth-policy.json` file at application
 * startup.  The file path is resolved from the `authPolicyFile` configuration
 * key (environment variable `AUTH_POLICY_FILE`).  When no file is configured
 * or the file does not exist the service returns `null` for `getPolicy()`.
 *
 * Validation uses the pre-compiled Ajv validator from `auth-policy.schema.ts`
 * (the same AJV library already used by `JobConfigService`).
 */
@Injectable()
export class AuthPolicyService {
  private readonly logger = new Logger(AuthPolicyService.name);
  private readonly policy: AuthPolicy | null;

  constructor(private readonly configService: ConfigService) {
    const filePath =
      this.configService.get<string>("authPolicyFile") ?? "auth-policy.json";
    this.policy = this.loadPolicy(filePath);
  }

  /**
   * Returns the parsed and validated auth policy, or `null` if no policy
   * file was found / configured.
   */
  getPolicy(): AuthPolicy | null {
    return this.policy;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private loadPolicy(filePath: string): AuthPolicy | null {
    if (!filePath || !fs.existsSync(filePath)) {
      this.logger.log(
        `Auth policy file "${filePath}" not found – running without JSON auth policy.`,
      );
      return null;
    }

    this.logger.log(`Loading auth policy from "${filePath}"`);

    const raw = fs.readFileSync(filePath, "utf8");
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Failed to parse auth policy file "${filePath}": ${(err as Error).message}`,
      );
    }

    if (!validateAuthPolicy(parsed)) {
      throw new Error(
        `Invalid auth policy in "${filePath}": ` +
          JSON.stringify(validateAuthPolicy.errors, null, 2),
      );
    }

    this.logger.log(
      `Auth policy v${parsed.version} loaded successfully from "${filePath}"`,
    );
    return parsed;
  }
}
