import { Module } from "@nestjs/common";
import { ConditionalModule } from "@nestjs/config";
import { LogJobActionCreator } from "./logaction/logaction.service";
import { LogJobActionModule } from "./logaction/logaction.module";
import { EmailJobActionCreator } from "./emailaction/emailaction.service";
import { EmailJobActionModule } from "./emailaction/emailaction.module";
import { actionType as logActionType } from "./logaction/logaction.interface";
import { actionType as emailActionType } from "./emailaction/emailaction.interface";
import { ValidateJobActionModule } from "./validateaction/validateaction.module";
import { actionType as validateActionType } from "./validateaction/validateaction.interface";
import {
  ValidateCreateJobActionCreator,
  ValidateJobActionCreator,
} from "./validateaction/validateaction.service";
import { URLJobActionModule } from "./urlaction/urlaction.module";
import { URLJobActionCreator } from "./urlaction/urlaction.service";
import { actionType as urlActionType } from "./urlaction/urlaction.interface";
import { RabbitMQJobActionModule } from "./rabbitmqaction/rabbitmqaction.module";
import { actionType as rabbitmqActionType } from "./rabbitmqaction/rabbitmqaction.interface";
import { RabbitMQJobActionCreator } from "./rabbitmqaction/rabbitmqaction.service";
import {
  CREATE_JOB_ACTION_CREATORS,
  UPDATE_JOB_ACTION_CREATORS,
} from "../jobconfig.interface";
import { SwitchJobActionModule } from "./switchaction/switchaction.module";
import {
  SwitchCreateJobActionCreator,
  SwitchUpdateJobActionCreator,
} from "./switchaction/switchaction.service";
import { actionType as switchActionType } from "./switchaction/switchaction.interface";
import { ErrorJobActionModule } from "./erroraction/erroraction.module";
import { ErrorJobActionCreator } from "./erroraction/erroraction.service";
import { actionType as errorActionType } from "./erroraction/erroraction.interface";
import { GroupedEmailJobActionModule } from "./groupedemailaction/groupedemailaction.module";
import { GroupedEmailJobActionCreator } from "./groupedemailaction/groupedemailaction.service";
import { actionType as groupedEmailActionType } from "./groupedemailaction/groupedemailaction.interface";

/**
 * Provide a list of built-in job action creators.
 *
 * CREATE_JOB_ACTION_CREATORS and UPDATE_JOB_ACTION_CREATORS can be extended (eg by a
 * plugin) with additional creators.
 */
@Module({
  imports: [
    EmailJobActionModule,
    LogJobActionModule,
    ValidateJobActionModule,
    URLJobActionModule,
    ConditionalModule.registerWhen(
      RabbitMQJobActionModule,
      (env: NodeJS.ProcessEnv) => env.RABBITMQ_ENABLED === "yes",
    ),
    SwitchJobActionModule,
    ErrorJobActionModule,
    GroupedEmailJobActionModule,
  ],
  providers: [
    {
      provide: CREATE_JOB_ACTION_CREATORS,
      useFactory: (
        logJobActionCreator,
        emailJobActionCreator,
        validateCreateJobActionCreator,
        urlJobActionCreator,
        rabbitMQJobActionCreator: RabbitMQJobActionCreator | null,
        switchCreateJobActionCreator,
        errorJobActionCreator,
        groupedEmailJobActionCreator,
      ) => {
        return {
          [logActionType]: logJobActionCreator,
          [emailActionType]: emailJobActionCreator,
          [validateActionType]: validateCreateJobActionCreator,
          [urlActionType]: urlJobActionCreator,
          [rabbitmqActionType]: rabbitMQJobActionCreator,
          [switchActionType]: switchCreateJobActionCreator,
          [errorActionType]: errorJobActionCreator,
          [groupedEmailActionType]: groupedEmailJobActionCreator,
        };
      },
      inject: [
        LogJobActionCreator,
        EmailJobActionCreator,
        ValidateCreateJobActionCreator,
        URLJobActionCreator,
        { token: RabbitMQJobActionCreator, optional: true },
        SwitchCreateJobActionCreator,
        ErrorJobActionCreator,
        GroupedEmailJobActionCreator,
      ],
    },
    {
      provide: UPDATE_JOB_ACTION_CREATORS,
      useFactory: (
        logJobActionCreator,
        emailJobActionCreator,
        validateJobActionCreator,
        urlJobActionCreator,
        rabbitMQJobActionCreator: RabbitMQJobActionCreator | null,
        switchUpdateJobActionCreator,
        errorJobActionCreator,
        groupedEmailJobActionCreator,
      ) => {
        return {
          [logActionType]: logJobActionCreator,
          [emailActionType]: emailJobActionCreator,
          [validateActionType]: validateJobActionCreator,
          [urlActionType]: urlJobActionCreator,
          [rabbitmqActionType]: rabbitMQJobActionCreator,
          [switchActionType]: switchUpdateJobActionCreator,
          [errorActionType]: errorJobActionCreator,
          [groupedEmailActionType]: groupedEmailJobActionCreator,
        };
      },
      inject: [
        LogJobActionCreator,
        EmailJobActionCreator,
        ValidateJobActionCreator,
        URLJobActionCreator,
        { token: RabbitMQJobActionCreator, optional: true },
        SwitchUpdateJobActionCreator,
        ErrorJobActionCreator,
        GroupedEmailJobActionCreator,
      ],
    },
  ],
  exports: [CREATE_JOB_ACTION_CREATORS, UPDATE_JOB_ACTION_CREATORS],
})
export class CoreJobActionCreators {}
