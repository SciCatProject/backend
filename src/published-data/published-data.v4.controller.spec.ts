import { HttpService } from "@nestjs/axios";
import { BadRequestException } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { of } from "rxjs";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataService } from "./published-data.service";
import { PublishedDataV4Controller } from "./published-data.v4.controller";
import { PublishedData } from "./schemas/published-data.schema";
import { ValidatorService } from "./validator.service";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}
class DatasetsControllerMock {
  findByIdAndUpdate = jest.fn();
}

class HttpServiceMock {
  request = jest.fn();
}

class ProposalsServiceMock {}

class PublishedDataServiceMock {
  findOne = jest.fn();
  validateUpdate = jest.fn();
  update = jest.fn();
}

class CaslAbilityFactoryMock {
  publishedDataAccess = jest.fn().mockReturnValue({
    cannot: () => false,
  });
}

class ValidatorServiceMock {
  validate = jest.fn();
}

class ConfigServiceMock {
  get(key: string) {
    const config = {
      publicURLprefix: "https://doi.ess.eu/detail/",
      registerDoiUri: "https://doi.example/register",
    } as Record<string, unknown>;

    return config[key];
  }
}

describe("PublishedDataController", () => {
  let controller: PublishedDataV4Controller;
  const defaultUrl: PublishedData = {
    doi: "10.9999/7d01b382-3198-48f8-af43-8aaa13be388a",
    _id: "",
    pid: "",
    title: "",
    abstract: "",
    datasetPids: [],
    proposalIds: [],
    sampleIds: [],
    instrumentIds: [],
    createdBy: "",
    updatedBy: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const customLandingPage: PublishedData = {
    ...defaultUrl,
    metadata: { landingPage: "custom-landingpage/" },
  };
  const customLandingPageWithProtocol: PublishedData = {
    ...defaultUrl,
    metadata: { landingPage: "https://custom-landingpage/" },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublishedDataV4Controller],
      imports: [ConfigModule],
      providers: [
        { provide: AttachmentsService, useClass: AttachmentsServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: DatasetsV4Controller, useClass: DatasetsControllerMock },
        { provide: HttpService, useClass: HttpServiceMock },
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: PublishedDataService, useClass: PublishedDataServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
        { provide: ConfigService, useClass: ConfigServiceMock },
        { provide: ValidatorService, useClass: ValidatorServiceMock },
      ],
    }).compile();

    controller = await module.resolve<PublishedDataV4Controller>(
      PublishedDataV4Controller,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should default to public URL prefix if no 'landingPage' property is defined in the metadata", () => {
    expect(controller.doiRegistrationJSON(defaultUrl)).toHaveProperty(
      "data.attributes.url",
      `${new ConfigServiceMock().get("publicURLprefix")}${encodeURIComponent(defaultUrl.doi)}`,
    );
  });

  it("should use the 'landingPage' property if defined in the metadata", () => {
    expect(controller.doiRegistrationJSON(customLandingPage)).toHaveProperty(
      "data.attributes.url",
      `https://${customLandingPage.metadata!.landingPage}${encodeURIComponent(customLandingPage.doi)}`,
    );
  });

  it("preflights legacy registration before contacting the DOI provider", async () => {
    const legacyPublishedData = {
      ...defaultUrl,
      datasetPids: [],
      proposalIds: [],
      sampleIds: [],
      instrumentIds: [],
      status: "private" as const,
    } as PublishedData;
    const publishedDataService = (
      controller as unknown as {
        publishedDataService: PublishedDataServiceMock;
      }
    ).publishedDataService;
    const validatorService = (
      controller as unknown as { validatorService: ValidatorServiceMock }
    ).validatorService;
    const httpService = (
      controller as unknown as { httpService: HttpServiceMock }
    ).httpService;
    const request = {
      user: { username: "test-user" },
      headers: {},
    } as unknown as Request;

    publishedDataService.findOne.mockResolvedValue(legacyPublishedData);
    publishedDataService.update.mockResolvedValue(legacyPublishedData);
    validatorService.validate.mockResolvedValue(null);
    httpService.request.mockReturnValue(of({ data: {} }));

    await expect(
      controller.register(request, legacyPublishedData.doi),
    ).resolves.toEqual(legacyPublishedData);

    expect(publishedDataService.validateUpdate).toHaveBeenCalled();
    expect(httpService.request).toHaveBeenCalled();
    expect(
      publishedDataService.validateUpdate.mock.invocationCallOrder[0],
    ).toBeLessThan(httpService.request.mock.invocationCallOrder[0]);
  });

  it("does not contact the DOI provider when preflight validation fails", async () => {
    const publishedDataService = (
      controller as unknown as {
        publishedDataService: PublishedDataServiceMock;
      }
    ).publishedDataService;
    const validatorService = (
      controller as unknown as { validatorService: ValidatorServiceMock }
    ).validatorService;
    const httpService = (
      controller as unknown as { httpService: HttpServiceMock }
    ).httpService;
    const request = {
      user: { username: "test-user" },
      headers: {},
    } as unknown as Request;

    publishedDataService.findOne.mockResolvedValue(defaultUrl);
    validatorService.validate.mockResolvedValue(null);
    publishedDataService.validateUpdate.mockImplementation(() => {
      throw new BadRequestException({ code: "NO_RESOURCE_IDS_PROVIDED" });
    });

    await expect(
      controller.register(request, defaultUrl.doi),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(httpService.request).not.toHaveBeenCalled();
  });

  it("should not double-prefix https:// when 'landingPage' already includes a protocol", () => {
    expect(
      controller.doiRegistrationJSON(customLandingPageWithProtocol),
    ).toHaveProperty(
      "data.attributes.url",
      `${customLandingPageWithProtocol.metadata!.landingPage}${encodeURIComponent(customLandingPageWithProtocol.doi)}`,
    );
  });
});
