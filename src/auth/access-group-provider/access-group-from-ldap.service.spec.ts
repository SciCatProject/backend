import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupFromLdapService } from "./access-group-from-ldap.service";

describe("AccessGroupFromLdapService", () => {
  let service: AccessGroupFromLdapService;

  const mockConfigService = {
    get: () => "access_group_property",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromLdapService, ConfigService],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    service = module.get<AccessGroupFromLdapService>(
      AccessGroupFromLdapService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const userPayload = {
      userId: "test_user",
      accessGroupProperty: "_groups",
      payload: {
        _groups: [
          {
            dn: "cn=test_group,cn=groups,cn=accounts,dc=example,dc=com",
            cn: "testgroup",
          },
          {
            dn: "cn=example_group,cn=groups,cn=accounts,dc=example,dc=com",
            cn: "examplegroup",
          },
        ],
      },
    };
    const expected = ["testgroup", "examplegroup"];
    const actual = await service.getAccessGroups(userPayload as UserPayload);
    expect(actual).toEqual(expected);
  });
});
