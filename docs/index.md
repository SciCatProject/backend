# SciCat Backend

## Version: v4.x

## NestJS implementation

[![Test](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/test.yml/badge.svg)](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/test.yml)
[![Deploy](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/deploy.yml/badge.svg)](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/deploy.yml)
[![Generate and upload latest SDK artifacts](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/upload-sdk-artifact.yml/badge.svg?branch=master)](https://github.com/SciCatProject/scicat-backend-next/actions/workflows/upload-sdk-artifact.yml)
[![DeepScan grade](https://deepscan.io/api/teams/8394/projects/19251/branches/494247/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=8394&pid=19251&bid=494247)
[![Known Vulnerabilities](https://snyk.io/test/github/SciCatProject/scicat-backend-next/master/badge.svg?targetFile=package.json)](https://snyk.io/test/github/SciCatProject/scicat-backend-next/master?targetFile=package.json)

---

# IMPORTANT!!!!

**As of 2023/06/15, this repository holds the official version of SciCat backend**
This is the only version that is officially supported. It is commonly referred to as backend, BE, v4.x or a combination of them.

You can find the old backend (v3.x, loopback implementation) at (https://github.com/SciCatProject/backend).
The repo for backend v3.x is archived and read-only

If you have any questions, please feel free to contact any member of the development team,
or the SciCat team at ESS.

## Contributing

If you're planning to contribute to this project by adding new functionality, we encourage you to discuss it first in the Discussions tab. This helps ensure that your proposed changes align with the project's goals and prevents duplicate efforts. Here's how you can initiate a discussion:

1. Go to the [Discussions tab](https://github.com/SciCatProject/scicat-backend-next/discussions).
2. Start a new discussion thread outlining your proposed changes.
3. Wait for feedback and consensus before proceeding with creating a pull request.

Thank you for your interest in contributing to our project!

## Get started

1. `git clone https://github.com/SciCatProject/scicat-backend-next.git`
2. `npm install`
3. Add _.env_ file to project root folder. See [Environment variables](#environment-variables).
4. _Optional_ Add [functionalAccounts.json](#local-user-accounts) file to project root folder to create local users.
5. _Optional_ Add [loggers.json](#loggers-configuration) file to the root folder and configure multiple loggers.
6. _Optional_ Add [proposalTypes.json](#prpopsal-types-configuration) file to the root folder and configure the proposal types.
7. `npm run start:dev`
8. Go to http://localhost:3000/explorer to get an overview of available endpoints and database schemas.
9. To be able to run the e2e tests with the same setup as in the Github actions you will need to run `npm run  prepare:local` and after that run `npm run start:dev`. This will start all needed containers and copy some configuration to the right place.

## Develop in a container using the docker-compose.dev file

1. `git clone https://github.com/SciCatProject/scicat-backend-next.git`
2. docker-compose -f docker-compose.dev.yaml up -d
3. _Optional_ Mount [functionalAccounts.json](#local-user-accounts) file to a volume in the container to create local users.
4. _Optional_ Mount [loggers.json](#loggers-configuration) file to a volume in the container to configure multiple loggers.
5. _Optional_ Mount [proposalTypes.json](#prpopsal-types-configuration) file to a volume in the container to configure the proposal types.
6. _Optional_ change the container env variables
7. Attach to the container
8. `npm run start:dev`
9. Go to http://localhost:3000/explorer to get an overview of available endpoints and database schemas.

## Test the app

1. **Running the unit tests:** `npm run test`
2. **Running the e2e(api) tests:**

- First of all run `npm run prepare:local` to prepare the local environment for starting
- After that run `npm run test:api` which will start the backend locally and run both `jest` and `mocha` e2e(api) tests.
- [Optional] If you want to run only the mocha tests you will need to start the backend locally with `npm run start` and then use `npm run test:api:mocha`
- [Optional] If you want to run only the jest tests you can use `npm run test:api:jest`

## Configuration

There are multiple ways to configure your SciCat instance.

In order to configure a SciCat instance run on barebone OS, there are three options:

1. Edit directly the file `src/config/configuration.ts`
2. Create a `.env` file with your local value of the variables listed in the next session. Only the variables that are required by your installation should be defined. To create your `.env` file, you can copy and edit the sample `.env.example` provided with in code
3. Define in your environment all the necessary variables (list provided below), prior running SciCat.

If SciCat runs in a containeraized environment, like docker or kubernetes, you can run the release image and specify your configuration using one of the following two methods:

1. create `.env` and mount it directly in your container.
2. define the necessary environment variables directly in your container.

More information are provided in the official documentation.

### Local User Accounts

Providing a file called _functionalAccounts.json_ at the root of the project, locally or in the container, will
automatically create the specified accounts on startup. If this file is not provided, no local users will be created.

Follow the structure of [functionalAccounts.json.minimal.example](/functionalAccounts.json.minimal.example) to create
your own _functionalAccounts.json_ file.

### Loggers configuration

Providing a file called _loggers.json_ at the root of the project, locally or in the container, and create an external logger class in the `src/loggers/loggingProviders/`directory will automatically create specified one or multiple loggers instances.

The `loggers.json.example` file in the root directory showcases the example of configuration structure for the one or multiple loggers. `logger.service.ts` file contains the configuration handling process logic, and `src/loggers/loggingProviders/grayLogger.ts` includes actual usecase of grayLogger.

### Prpopsal types configuration

Providing a file called _proposalTypes.json_ at the root of the project, locally or in the container, will be automatically loaded into the application configuration service under property called `proposalTypes` and used for validation against proposal creation and update.

The `proposalTypes.json.example` file in the root directory showcases the example of configuration structure for proposal types.

## Environment variables

Valid environment variables for the .env file. See [.env.example](/.env.example) for examples value formats.
| Environment Variable | Type | Optional | Description | Default Value |
|---------------------------------------------|---------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| `ADMIN_GROUPS` | string | Yes | Comma-separated list of admin groups with admin permission assigned to the listed users. Example: "admin, ingestor". For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `CREATE_DATASET_GROUPS` | string | Yes | Comma-separated list of create dataset groups. Users belong to the listed groups can create dataset with/without PID. Example: "group1, group2". For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `CREATE_DATASET_WITH_PID_GROUPS` | string | Yes | Comma-separated list of create dataset with pid groups. Users belong to the listed groups can create dataset with PID. Example: "group1, group2". For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `DELETE_GROUPS` | string | Yes | Comma-separated list of delete groups. Users belong to the listed groups can delete any dataset, origDatablocks, datablocks, etc. For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `DATASET_CREATION_VALIDATION_ENABLED` | boolean | | Flag to enable/disable dataset validation to validate if requested new dataset is valid with given regular expression. Preconfigure **DATASET_CREATION_VALIDATION_REGEX** variable is required. | false |
| `DATASET_CREATION_VALIDATION_REGEX` | string | | Regular expression validation for new dataset request. | "" |
| `PROPOSAL_GROUPS` | string | Yes | Comma-separated list of proposal groups with permission to create any proposals. Example: "proposaladmin, proposalingestor". For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `SAMPLE_GROUPS` | string | Yes | Comma-separated list of sample groups with permission to create any samples. Example: "sampleadmin, sampleingestor". For more details check: [Scicat Documentation](https://scicatproject.github.io/documentation/Development/v4.x/backend/authorization.html) | |
| `ACCESS_GROUPS_GRAPHQL_ENABLED` | string | Yes | Flag to enable/disable the GraphQL service to get access groups. Requires configuration of `ACCESS_GROUP_SERVICE_TOKEN`, `ACCESS_GROUP_SERVICE_API_URL`, and `ACCESS_GROUP_SERVICE_HANDLER`. | true |
| `ACCESS_GROUPS_SERVICE_TOKEN` | string | Yes | Authentication token used if access groups are obtained from a third-party service. Not used by the vanilla installation, but only if the instance is customized to use an external service to provide user groups, like the ESS example. | |
| `ACCESS_GROUP_SERVICE_API_URL` | string | Yes | URL of the service providing the users' access groups. Not used by the vanilla installation, but only if the instance is customized to use an external service to provide user groups, like the ESS example. | |
| `ACCESS_GROUP_SERVICE_HANDLER` | string | Yes | Configuration property that points to the source of a module. This module provides a specific responseProcessor function for handling GraphQL responses and a query template for making GraphQL requests. | |
| `ACCESS_GROUPS_STATIC_ENABLED` | string | Yes | Flag to enable/disable automatic assignment of predefined access groups to all users. | true |
| `ACCESS_GROUPS_STATIC_VALUES` | string | Yes | Comma-separated list of access groups automatically assigned to all users. Example: "scicat, user". | |
| `ACCESS_GROUPS_OIDCPAYLOAD_ENABLED` | string | Yes | Flag to enable/disable fetching access groups directly from OIDC response. Requires specifying a field via `OIDC_ACCESS_GROUPS_PROPERTY` to extract access groups. | false |
| `DOI_PREFIX` | string | | The facility DOI prefix, with trailing slash. | |
| `EXPRESS_SESSION_SECRET` | string | No | Secret used to set up express session. Required if using OIDC authentication | |
| `HTTP_MAX_REDIRECTS` | number | Yes | Max redirects for HTTP requests. | 5 |
| `HTTP_TIMEOUT` | number | Yes | Timeout for HTTP requests in ms. | 5000 |
| `JWT_SECRET` | string | | The secret for your JWT token, used for authorization. | |
| `JWT_EXPIRES_IN` | number | Yes | How long, in seconds, the JWT token is valid. | 3600 |
| `LDAP_URL` | string | Yes | The URL to your LDAP server. | |
| `LDAP_BIND_DN` | string | Yes | Bind_DN for your LDAP server. | |
| `LDAP_BIND_CREDENTIALS` | string | Yes | Credentials for your LDAP server. | |
| `LDAP_SEARCH_BASE` | string | Yes | Search base for your LDAP server. | |
| `LDAP_SEARCH_FILTER` | string | Yes | Search filter for your LDAP server. | |
| `OIDC_ISSUER` | string | Yes | URL of the OIDC server providing the authentication service. Example: https://identity.esss.dk/realm/ess. | |
| `OIDC_CLIENT_ID` | string | Yes | Identity of the client used to obtain the user token. Example: scicat. | |
| `OIDC_CLIENT_SECRET` | string | Yes | Secret to provide to the OIDC service to obtain the user token. Example: Aa1JIw3kv3mQlGFWhRrE3gOdkH6xreAwro. | |
| `OIDC_CALLBACK_URL` | string | Yes | SciCat callback URL to redirect to after a successful login. Example: http://myscicat/api/v3/oidc/callback. | |
| `OIDC_SCOPE` | string | Yes | Space-separated list of info returned by the OIDC service. Example: "openid profile email". | |
| `OIDC_SUCCESS_URL` | string | Yes | SciCat Frontend auth-callback URL. Required to pass user credentials to SciCat Frontend after OIDC login. Example: https://myscicatfrontend/auth-callback. Must be `frontend-base-url/auth-callback` or `frontend-base-url/login` for the official SciCat frontend. | |
| `OIDC_RETURN_URL` | string | Yes | The path segment within the SciCat Frontend to redirect to, passed as query param in `OIDC_SUCCESS_URL` and handled by frontend. Example: /datasets. | |
| `OIDC_FRONTEND_CLIENTS` | string | Yes | Comma separated list of additional frontend OIDC clients for this backend. Example: scilog,maxiv. Their success and return URLs can be configured by setting `OIDC_${CLIENT}_SUCCESS_URL` (E.g. `OIDC_SCILOG_SUCCESS_URL`) and `OIDC_${CLIENT}_RETURN_URL` | |
| `OIDC_ACCESS_GROUPS` | string | Yes | Functionality is still unclear. | |
| `OIDC_ACCESS_GROUPS_PROPERTY` | string | Yes | Target field to get the access groups value from OIDC response. | |
| `OIDC_USERINFO_MAPPING_FIELD_USERNAME` | string | Yes | Comma-separated list of fields from the OIDC response to use as the user's profile username. Example: `OIDC_USERINFO_MAPPING_FIELD_USERNAME="iss, sub"`. | "preferred_username" \|\| "name" |
| `OIDC_USERINFO_MAPPING_FIELD_DISPLAYNAME` | string | Yes | Field from the OIDC response to use as the user's profile display name. Example: `OIDC_USERINFO_MAPPING_FIELD_DISPLAYNAME="preferred_username"`. | "name" |
| `OIDC_USERINFO_MAPPING_FIELD_EMAIL` | string | Yes | Field from the OIDC response to use as the user's profile email. | "email" |
| `OIDC_USERINFO_MAPPING_FIELD_FAMILYNAME` | string | Yes | Field from the OIDC response to use as the user's profile family name. | "family_name" |
| `OIDC_USERINFO_MAPPING_FIELD_ID` | string | Yes | Field from the OIDC response to use as the user's profile ID. | "sub" \|\| "user_id" |
| `OIDC_USERINFO_MAPPING_FIELD_THUMBNAILPHOTO`| string | Yes | Field from the OIDC response to use as the user's profile thumbnail photo. | "thumbnailPhoto" |
| `OIDC_USERINFO_MAPPING_FIELD_PROVIDER` | string | Yes | Field from the OIDC response to use as the user's profile provider. | "iss" |
| `OIDC_USERINFO_MAPPING_FIELD_GROUP` | string | Yes | Field from the OIDC response to use as the user's profile group. | "groups" |
| `OIDC_USERQUERY_OPERATOR` | string | Yes | Specifies the operator ("or" or "and") for UserModel.findOne queries, determining the logic used to match fields like "username" or "email". Example: `UserModel.findOne({$or: {"username":"testUser", "email":"test@test.com"}})`. | "or" |
| `OIDC_USERQUERY_FILTER` | string | Yes | Defines key-value pairs for UserModel.findOne queries, using a "key:value" format. Example: `OIDC_USERQUERY_FILTER="username:sub, email:email"`. | "username:username, email:email" |
| `LOGBOOK_ENABLED` | string | Yes | Flag to enable/disable the Logbook endpoints. Values "yes" or "no". | "no" |
| `LOGBOOK_BASE_URL` | string | Yes | The base URL to the Logbook API. Only required if Logbook is enabled. | |
| `METADATA_KEYS_RETURN_LIMIT` | number | Yes | The return limit for the `/Datasets/metadataKeys` endpoint. | |
| `METADATA_PARENT_INSTANCES_RETURN_LIMIT` | number | Yes | The return limit of Datasets to extract metadata keys from for the `/Datasets/metadataKeys` endpoint. | |
| `MONGODB_URI` | string | | The URI for your MongoDB instance. | |
| `OAI_PROVIDER_ROUTE` | string | Yes | URI to OAI provider, used for the `/publisheddata/:id/resync` endpoint. | |
| `PID_PREFIX` | string | | The facility PID prefix, with trailing slash. | |
| `PUBLIC_URL_PREFIX` | string | | The base URL to the facility Landing Page. | |
| `PORT` | number | Yes | The port on which you want to access the app. | 3000 |
| `RABBITMQ_ENABLED` | string | Yes | Flag to enable/disable RabbitMQ consumer. Values "yes" or "no". | "no" |
| `RABBITMQ_HOSTNAME` | string | Yes | The hostname of the RabbitMQ message broker. Only required if RabbitMQ is enabled. | |
| `RABBITMQ_USERNAME` | string | Yes | The username used to authenticate to the RabbitMQ message broker. Only required if RabbitMQ is enabled. | |
| `RABBITMQ_PASSWORD` | string | Yes | The password used to authenticate to the RabbitMQ message broker. Only required if RabbitMQ is enabled. | |
| `REGISTER_DOI_URI` | string | | URI to the organization that registers the facility's DOIs. | |
| `REGISTER_METADATA_URI` | string | | URI to the organization that registers the facility's published data metadata. | |
| `SITE` | string | | The name of your site. | |
| `EMAIL_TYPE` | string | Yes | The type of your email provider. Options are "smtp" or "ms365".  | "smtp" |
| `EMAIL_FROM` | string | Yes | Email address that emails should be sent from. | |
| `EMAIL_REPLYTO` | string | Yes | Email 'Reply-To' field. | |
| `SMTP_HOST` | string | Yes | Host of SMTP server. | |
| `SMTP_MESSAGE_FROM` | string | Yes | (Deprecated) Alternate spelling of EMAIL_FROM.| |
| `SMTP_PORT` | number | Yes | Port of SMTP server. | 587 |
| `SMTP_SECURE` | bool | Yes | Use encrypted SMTPS. | "no" |
| `MS365_TENANT_ID` | string | Yes | Tenant ID for sending emails over Microsoft Graph API. | |
| `MS365_CLIENT_ID` | string | Yes | Client ID for sending emails over Microsoft Graph API | |
| `MS365_CLIENT_SECRET` | string | Yes | Client Secret for sending emails over Microsoft Graph API | |
| `POLICY_PUBLICATION_SHIFT` | integer | Yes | Embargo period expressed in years. | 3 years |
| `POLICY_RETENTION_SHIFT` | integer | Yes | Retention period (how long the facility will hold on to data) expressed in years. | -1 (indefinitely) |
| `ELASTICSEARCH_ENABLED` | string | | Flag to enable/disable the Elasticsearch endpoints. Values "yes" or "no". | "no" |
| `ES_HOST` | string | | Host of Elasticsearch server instance. | |
| `ES_USERNAME` | string | Yes | Elasticsearch username. | "elastic" |
| `ES_PASSWORD` | string | | Elasticsearch password. | |
| `MONGODB_COLLECTION` | string | | Collection name to be mapped into specified Elasticsearch index. Used for data synchronization between MongoDB and Elasticsearch index. | |
| `ES_MAX_RESULT` | number | | Maximum records that can be indexed into Elasticsearch. | 10000 |
| `ES_FIELDS_LIMIT` | number | | The total number of fields in an index. | 1000 |
| `ES_REFRESH` | string | | If set to `wait_for`, Elasticsearch will wait till data is inserted into the specified index before returning a response. | false |
| `LOGGERS_CONFIG_FILE` | string | | The file name for loggers configuration, located in the project root directory. | "loggers.json" |
| `PROPOSAL_TYPES_FILE` | string | | The file name for proposal types configuration, located in the project root directory. | "proposalTypes.json" |
| `SWAGGER_PATH` | string | Yes | swaggerPath is the path where the swagger UI will be available. | "explorer"|
| `MAX_FILE_UPLOAD_SIZE` | string | Yes | Maximum allowed file upload size. | "16mb"|

## Migrating from the old SciCat Backend

Where the [current SciCat Backend](https://github.com/SciCatProject/backend) accepts id fields in the database named `pid`, `doi`, or similar, this implementation requires there to be an id field of the form `_id` on every document. It is therefore necessary to run a database migration script towards MongoDB instance from a place where you have access to it and can install `migrate-mongo` package.

All database [migration scripts](https://github.com/SciCatProject/scicat-backend-next/tree/master/migrations) located in the [migrations](/migrations/) folder. To start the migration use:

```sh
npm run migrate:db:up
```

For down migration use:

```sh
npm run migrate:db:down
```

For listing applied DB migrations:

```sh
npm run migrate:db:status
```

---

For the full documentation please go to the [SciCat home page](https://scicatproject.github.io/) and follow the [documentation link](https://scicatproject.github.io/documentation)

## Migration documentation and NestJs resources

Following are the post that I found useful working on the migration:

- Schema and DTOs: https://betterprogramming.pub/how-to-use-data-transfer-objects-dto-for-validation-in-nest-js-7ff95309f650
- Validation:
  - [Official documentation](https://docs.nestjs.com/techniques/validation)
  - [Custom validation with datasbase in NestJs](https://dev.to/avantar/custom-validation-with-database-in-nestjs-gao)
  - [Validating nested objects with class-validator in NestJs](https://dev.to/avantar/validating-nested-objects-with-class-validator-in-nestjs-1gn8)
  - [Validating numeric query parameters in NestJS](https://dev.to/avantar/validating-numeric-query-parameters-in-nestjs-gk9)
  - [Injecting request object to a custom validation class in NestJS](https://dev.to/avantar/injecting-request-object-to-a-custom-validation-class-in-nestjs-5dal)
- Swagger and OpenAPI:
  - https://docs.nestjs.com/openapi/introduction
  - https://docs.nestjs.com/openapi/types-and-parameters
  - https://docs.nestjs.com/openapi/decorators

## License

This project is licensed under the GPL License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

Scicat is developed at PSI, ESS and MAXIV with in-kind funding from ESS and from the European Union Framework Programme for Research and Innovation Horizon 2020, under grant agreement 676548, “BrightnESS”.
