import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllExceptionsFilter, ScicatLogger } from "./loggers/logger.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as bodyParser from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const apiVersion = configService.get<string>("versions.api");
  const swaggerPath = `${configService.get<string>("swaggerPath")}`;

  const scicatLogger = app.get<ScicatLogger>(ScicatLogger);

  app.useLogger(scicatLogger);

  app.useGlobalFilters(new AllExceptionsFilter(scicatLogger));

  app.enableCors();

  app.setGlobalPrefix("api");

  // NOTE: This is a workaround to enable versioning for individual routes
  // Version decorator can be used to specify the version for a route
  // Read more on https://docs.nestjs.com/techniques/versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  const config = new DocumentBuilder()
    .setTitle("SciCat backend API")
    .setDescription("This is the API for the SciCat Backend")
    .setVersion(`api/v${apiVersion}`)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      docExpansion: "none",
    },
  };

  SwaggerModule.setup(swaggerPath, app, document, swaggerOptions);

  app.useGlobalPipes(
    /**
     * Reference: https://docs.nestjs.com/techniques/validation#auto-validation
     */
    new ValidationPipe({
      // Make sure that there's no unexpected data
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,

      /**
       * Detailed error messages since this is 4xx
       */
      disableErrorMessages: false,
      validationError: {
        /**
         * WARNING: Avoid exposing the values in the error output (could leak sensitive information)
         */
        value: false,
      },

      /**
       * Transform the JSON into a class instance when possible.
       * Depends on the type of the data on the controllers
       */
      transform: true,
    }),
  );

  const fileUploadLimitInMb = configService.get<number>(
    "maxFileUploadSizeInMb",
  );

  app.use(
    bodyParser.json({
      type: ["application/json", "application/merge-patch+json"],
      limit: fileUploadLimitInMb,
    }),
  );
  app.useBodyParser("urlencoded", {
    limit: fileUploadLimitInMb,
    extended: true,
  });

  const port = configService.get<number>("port") ?? 3000;
  Logger.log("Scicat Backend listening on port: " + port, "Main");

  await app.listen(port);
}
bootstrap().catch((error) => {
  Logger.error("Failed to bootstrap the application", error, "Main");
  process.exit(1);
});
