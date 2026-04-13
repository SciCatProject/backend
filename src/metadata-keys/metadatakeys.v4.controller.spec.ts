// metadatakeys.v4.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { accessibleBy } from "@casl/mongoose";

import { MetadataKeysV4Controller } from "./metadatakeys.v4.controller";
import { MetadataKeysService } from "./metadatakeys.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { MetadataKeyClass } from "./schemas/metadatakey.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";

jest.mock("@casl/mongoose", () => ({
  accessibleBy: jest.fn(),
}));

class CaslAbilityFactoryMock {
  metadataKeyInstanceAccess = jest.fn();
}

class MetadataKeysServiceMock {
  findAll = jest.fn();
}

describe("MetadataKeysV4Controller", () => {
  let controller: MetadataKeysV4Controller;
  let metadatakeysService: MetadataKeysServiceMock;
  let caslAbilityFactory: CaslAbilityFactoryMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetadataKeysV4Controller],
      providers: [
        { provide: MetadataKeysService, useClass: MetadataKeysServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get(MetadataKeysV4Controller);
    metadatakeysService = module.get(MetadataKeysService);
    caslAbilityFactory = module.get(CaslAbilityFactory);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("findAll parses filter, builds accessFilter, and calls service.findAll with parsed filter and accessFilter", async () => {
    const request = { user: { username: "u1" } } as unknown as Request;
    const user = request.user as JWTUser;
    const filterString = `{
          "where": { "sourceId": "testId", "sourceType": "dataset" },
          "limits": {
            "limit": 10,
            "skip": 0,
            "sort": {
              "createdAt": "asc"
            }
          }
        }`;
    const parsedFilter = JSON.parse(filterString);

    const abilities = {};
    caslAbilityFactory.metadataKeyInstanceAccess.mockReturnValue(abilities);

    const accessFilter = { isPublished: true };

    const ofType = jest.fn().mockReturnValue(accessFilter);

    const accessibleByReturn = {
      ofType,
    };
    (accessibleBy as unknown as jest.Mock).mockReturnValue(accessibleByReturn);

    const expected = [{ key: "k1", humanReadableName: "Test K1" }] as unknown[];
    metadatakeysService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(request, filterString);

    expect(caslAbilityFactory.metadataKeyInstanceAccess).toHaveBeenCalledWith(
      user,
    );

    expect(accessibleBy).toHaveBeenCalledWith(
      abilities,
      Action.MetadataKeysReadInstance,
    );
    expect(ofType).toHaveBeenCalledWith(MetadataKeyClass);

    expect(metadatakeysService.findAll).toHaveBeenCalledWith(
      parsedFilter,
      accessFilter,
    );

    expect(result).toEqual(expected);
  });

  it('findAll uses "{}" when filter is missing', async () => {
    const request = { user: { username: "u1" } } as unknown as Request;

    const abilities = {};
    caslAbilityFactory.metadataKeyInstanceAccess.mockReturnValue(abilities);

    const accessFilter = { isPublished: true };
    const accessibleByReturn = {
      ofType: () => accessFilter,
    };
    (accessibleBy as unknown as jest.Mock).mockReturnValue(accessibleByReturn);

    const expected: unknown[] = [];
    metadatakeysService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(
      request,
      undefined as unknown as string,
    );

    expect(metadatakeysService.findAll).toHaveBeenCalledWith({}, accessFilter);
    expect(result).toEqual(expected);
  });
});
