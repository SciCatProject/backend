import { ConfigModule } from "@nestjs/config";
import { LogJobAction } from "./actions/logaction/logaction";
import { JobConfigService } from "./jobconfig.service";
import { Test } from "@nestjs/testing";
import { actionType as logActionType } from "./actions/logaction/logaction.interface";
import { actionType as validateActionType } from "./actions/validateaction/validateaction.interface";
import { actionType as urlActionType } from "./actions/urlaction/urlaction.interface";
import { actionType as rabbitmqActionType } from "./actions/rabbitmqaction/rabbitmqaction.interface";
import { actionType as emailActionType } from "./actions/emailaction/emailaction.interface";
import {
  CREATE_JOB_ACTION_CREATORS,
  UPDATE_JOB_ACTION_CREATORS,
} from "./jobconfig.interface";

const actionCreatorMock = {
  create: jest.fn(() => new LogJobAction({ actionType: "log" })),
};
const creatorsMock = {
  [logActionType]: actionCreatorMock,
  [validateActionType]: actionCreatorMock,
  [urlActionType]: actionCreatorMock,
  [rabbitmqActionType]: actionCreatorMock,
  [emailActionType]: actionCreatorMock,
};
const creatorProviders = [
  {
    provide: CREATE_JOB_ACTION_CREATORS,
    useValue: creatorsMock,
  },
  {
    provide: UPDATE_JOB_ACTION_CREATORS,
    useValue: creatorsMock,
  },
];

describe("Job configuration", () => {
  const path = "test/config/jobconfig.yaml";

  it("JobConfigService should be loaded from yaml", async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => ({ jobConfigurationFile: path })],
        }),
      ],
      providers: [...creatorProviders, JobConfigService],
    }).compile();

    const jobConfigService = module.get<JobConfigService>(JobConfigService);
    const jobConfigs = jobConfigService.allJobConfigs;

    expect("all_access" in jobConfigs);
    const jobConfig = jobConfigService.get("all_access");
    expect(jobConfig.create.actions.length).toBe(1);
    const action = jobConfig.create.actions[0];
    expect(action instanceof LogJobAction);
    expect(action.getActionType()).toBe("log");

    expect("validate" in jobConfigs);
  });
});
