import { ConfigService } from "@nestjs/config";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import configuration from "src/config/configuration";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Action } from "./action.enum";
import { CaslAbilityFactory } from "./casl-ability.factory";

describe("CaslAbilityFactory", () => {
  it("should be defined", () => {
    expect(new CaslAbilityFactory(new ConfigService())).toBeDefined();
  });

  describe("DatasetLifecycleUpdate permission", () => {
    const buildFactory = (updateDatasetLifecycle: unknown) =>
      new CaslAbilityFactory(
        {
          get: (key: string) =>
            key === "accessGroups"
              ? {
                  admin: [],
                  delete: [],
                  createDataset: [],
                  createDatasetWithPid: [],
                  createDatasetPrivileged: [],
                  updateDatasetLifecycle,
                }
              : undefined,
        } as unknown as ConfigService,
        { allJobConfigs: {} } as unknown as JobConfigService,
      );

    const userInSubstringGroup: JWTUser = {
      _id: "uid",
      username: "user",
      email: "user@example.com",
      currentGroups: ["lifecycle"],
    };

    const userInExactGroup: JWTUser = {
      ...userInSubstringGroup,
      currentGroups: ["lifecycle-managers"],
    };

    it("parses UPDATE_DATASET_LIFECYCLE_GROUPS into an array so group checks use exact matching", () => {
      process.env.UPDATE_DATASET_LIFECYCLE_GROUPS = "lifecycle-managers";
      const { accessGroups } = configuration();
      delete process.env.UPDATE_DATASET_LIFECYCLE_GROUPS;

      const factory = buildFactory(accessGroups?.updateDatasetLifecycle);
      const ability = factory.endpointAccess("datasets", userInSubstringGroup);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
    });

    it("grants DatasetLifecycleUpdate to a user in an exactly matching group", () => {
      const factory = buildFactory(["lifecycle-managers"]);
      const ability = factory.endpointAccess("datasets", userInExactGroup);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
    });

    it("denies DatasetLifecycleUpdate to a user whose group does not match any configured group", () => {
      const factory = buildFactory(["lifecycle-managers"]);
      const ability = factory.endpointAccess("datasets", userInSubstringGroup);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
    });
  });
});
