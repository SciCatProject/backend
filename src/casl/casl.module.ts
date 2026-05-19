import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { AuthPolicyService } from "./auth-policy/auth-policy.service";
import { AuthPolicyTranslator } from "./auth-policy/auth-policy.translator";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, AuthPolicyService, AuthPolicyTranslator],
  exports: [CaslAbilityFactory, AuthPolicyService, AuthPolicyTranslator],
})
export class CaslModule {}
