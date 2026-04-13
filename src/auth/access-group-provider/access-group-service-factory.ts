import { ConfigService } from "@nestjs/config";
import { AccessGroupFromStaticValuesService } from "./access-group-from-static-values.service";
import { AccessGroupService } from "./access-group.service";
import { AccessGroupFromGraphQLApiService } from "./access-group-from-graphql-api-call.service";
import { AccessGroupFromPayloadService } from "./access-group-from-payload.service";
import { HttpService } from "@nestjs/axios";
import { AccessGroupFromMultipleProvidersService } from "./access-group-from-multiple-providers.service";
import { Logger } from "@nestjs/common";
/*
 * this is the default function which provides an empty array as groups
 */
export const accessGroupServiceFactory = {
  provide: AccessGroupService,
  useFactory: (configService: ConfigService) => {
    Logger.debug("Service factory starting", "accessGroupServiceFactory");
    const accessGroupsStaticConfig = configService.get(
      "accessGroupsStaticConfig",
    );
    const accessGroupsGraphQlConfig = configService.get(
      "accessGroupsGraphQlConfig",
    );
    const accessGroupsOIDCPayloadConfig = configService.get(
      "accessGroupsOIDCPayloadConfig",
    );

    const accessGroupServices: AccessGroupService[] = [];
    if (accessGroupsStaticConfig?.enabled == true) {
      Logger.log(
        JSON.stringify(accessGroupsStaticConfig),
        "loading static processor",
      );
      accessGroupServices.push(
        new AccessGroupFromStaticValuesService(accessGroupsStaticConfig.value),
      );
    }
    if (accessGroupsOIDCPayloadConfig?.enabled == true) {
      Logger.log(
        JSON.stringify(accessGroupsOIDCPayloadConfig),
        "loading oidc processor",
      );
      accessGroupServices.push(
        new AccessGroupFromPayloadService(configService),
      );
    }

    if (accessGroupsGraphQlConfig?.enabled == true) {
      Logger.log(
        JSON.stringify(accessGroupsGraphQlConfig),
        "loading graphql processor",
      );

      import(accessGroupsGraphQlConfig.responseProcessorSrc).then(
        (rpModule) => {
          const gh = rpModule.graphHandler;
          const responseProcessor: (
            response: Record<string, unknown>,
          ) => string[] = gh.responseProcessor;
          const graphqlTemplateQuery: string = gh.graphqlTemplateQuery;
          accessGroupServices.push(
            new AccessGroupFromGraphQLApiService(
              graphqlTemplateQuery,
              accessGroupsGraphQlConfig.apiUrl,
              {
                Authorization: `Bearer ${accessGroupsGraphQlConfig.token}`,
              },
              responseProcessor,
              new HttpService(),
            ),
          );
        },
      );
    }

    return new AccessGroupFromMultipleProvidersService(accessGroupServices);
  },
  inject: [ConfigService],
};
