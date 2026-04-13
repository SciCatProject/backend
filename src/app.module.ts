import { Module, NestModule } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RequestContextModule } from "./common/modules/request-context.module";
import { DatasetsModule } from "./datasets/datasets.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ConditionalModule, ConfigModule, ConfigService } from "@nestjs/config";
import { CaslModule } from "./casl/casl.module";
import configuration from "./config/configuration";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AttachmentsModule } from "./attachments/attachments.module";
import { OrigDatablocksModule } from "./origdatablocks/origdatablocks.module";
import { DatablocksModule } from "./datablocks/datablocks.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { SamplesModule } from "./samples/samples.module";
import { PublishedDataModule } from "./published-data/published-data.module";
import { LogbooksModule } from "./logbooks/logbooks.module";
import { PoliciesModule } from "./policies/policies.module";
import { InitialDatasetsModule } from "./initial-datasets/initial-datasets.module";
import { JobsModule } from "./jobs/jobs.module";
import { InstrumentsModule } from "./instruments/instruments.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { join } from "path";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { handlebarsHelpers } from "./common/handlebars-helpers";
import { CommonModule } from "./common/common.module";
import { RabbitMQModule } from "./common/rabbitmq/rabbitmq.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";
import { LoggerModule } from "./loggers/logger.module";
import { JobConfigModule } from "./config/job-config/jobconfig.module";
import { CoreJobActionCreators } from "./config/job-config/actions/corejobactioncreators.module";
import { HttpModule, HttpService } from "@nestjs/axios";
import { MSGraphMailTransport } from "./common/graph-mail";
import { TransportType } from "@nestjs-modules/mailer/dist/interfaces/mailer-options.interface";
import { MetricsModule } from "./metrics/metrics.module";
import {
  GenericHistory,
  GenericHistorySchema,
} from "./common/schemas/generic-history.schema";
import { HistoryModule } from "./history/history.module";
import { MaskSensitiveDataInterceptorModule } from "./common/interceptors/mask-sensitive-data.interceptor";
import { RuntimeConfigModule } from "./config/runtime-config/runtime-config.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      cache: true,
    }),
    RuntimeConfigModule,
    AuthModule,
    CaslModule,
    AttachmentsModule,
    CommonModule,
    // NOTE: `ConditionalModule.registerWhen` directly uses `process.env` as it does not support
    // dependency injection for `ConfigService`. This approach ensures compatibility while
    // leveraging environment variables for conditional module loading.
    ConditionalModule.registerWhen(
      MetricsModule,
      (env: NodeJS.ProcessEnv) => env.METRICS_ENABLED === "yes",
    ),
    CoreJobActionCreators,
    JobConfigModule,
    LoggerModule,
    DatablocksModule,
    DatasetsModule,
    InitialDatasetsModule,
    InstrumentsModule,
    JobsModule,
    LogbooksModule,
    EventEmitterModule.forRoot(),
    ConditionalModule.registerWhen(
      RabbitMQModule,
      (env: NodeJS.ProcessEnv) => env.RABBITMQ_ENABLED === "yes",
    ),
    MailerModule.forRootAsync({
      imports: [ConfigModule, HttpModule],
      useFactory: async (
        configService: ConfigService,
        httpService: HttpService,
      ) => {
        let transport: TransportType;
        const transportType = configService
          .get<string>("email.type")
          ?.toLowerCase();
        if (transportType === "smtp") {
          transport = {
            host: configService.get<string>("email.smtp.host"),
            port: configService.get<number>("email.smtp.port"),
            secure: configService.get<string>("email.smtp.secure") === "yes",
          };
        } else if (transportType === "ms365") {
          const tenantId = configService.get<string>("email.ms365.tenantId"),
            clientId = configService.get<string>("email.ms365.clientId"),
            clientSecret = configService.get<string>(
              "email.ms365.clientSecret",
            );
          if (tenantId === undefined) {
            throw new Error("Missing MS365_TENANT_ID");
          }
          if (clientId === undefined) {
            throw new Error("Missing MS365_CLIENT_ID");
          }
          if (clientSecret === undefined) {
            throw new Error("Missing MS365_CLIENT_SECRET");
          }
          transport = new MSGraphMailTransport(httpService, {
            tenantId,
            clientId,
            clientSecret,
          });
        } else {
          throw new Error(
            `Invalid EMAIL_TYPE: ${transportType}. Expect on of "smtp" or "ms365"`,
          );
        }

        return {
          transport: transport,
          defaults: {
            from: configService.get<string>("email.from"),
            replyTo: configService.get<string>("email.replyTo"),
          },
          template: {
            dir: join(__dirname, "./common/email-templates"),
            adapter: new HandlebarsAdapter(handlebarsHelpers),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService, HttpService],
    }),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("mongodbUri"),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      {
        name: GenericHistory.name,
        schema: GenericHistorySchema,
      },
    ]),
    OrigDatablocksModule,
    PoliciesModule,
    ProposalsModule,
    PublishedDataModule,
    SamplesModule,
    UsersModule,
    AdminModule,
    HealthModule,
    RequestContextModule,
    HistoryModule,
    ConditionalModule.registerWhen(
      MaskSensitiveDataInterceptorModule,
      (env: NodeJS.ProcessEnv) => env.MASK_PERSONAL_INFO === "yes",
    ),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (ref) => new JwtAuthGuard(ref),
      inject: [Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure() {
    // If you need this middleware for when METRICS_ENABLED is not "yes", you could
    // add conditional logic here, but it's cleaner to handle that in the metrics module itself
    // Please see `MetricsModule` for the middleware registration (metrics.module.ts)
    // where it is conditionally applied based on the environment variable.
    // Example: consumer.apply(AccessTrackingMiddleware).forRoutes("*");
  }
}
