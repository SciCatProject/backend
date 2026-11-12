import { HttpService } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";
import { ProposalsService } from "src/proposals/proposals.service";
import { Request } from "express";
import { PublishedDataService } from "./published-data.service";
import { PublishedDataV4Controller } from "./published-data.v4.controller";
import { PublishedDataStatus } from "./interfaces/published-data.interface";
import { PublishedData } from "./schemas/published-data.schema";
import { ValidatorService } from "./validator.service";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}
class DatasetsControllerMock {
  findByIdAndUpdate = jest.fn();
}

class HttpServiceMock {}

class ProposalsServiceMock {}

class PublishedDataServiceMock {
  findOne = jest.fn();
  update = jest.fn();
}

class CaslAbilityFactoryMock {
  publishedDataAccess = () => ({ can: () => true, cannot: () => false });
}

class ValidatorServiceMock {
  // mimics ajv useDefaults filling in missing metadata
  validate = jest.fn(async (publishedData: PublishedData) => {
    publishedData.metadata!.publicationYear ??= 2026;
    return null;
  });
}

class ConfigServiceMock {
  get(key: string) {
    const config = {
      publicURLprefix: "https://doi.ess.eu/detail/",
    } as Record<string, unknown>;

    return config[key];
  }
}

describe("PublishedDataController", () => {
  let controller: PublishedDataV4Controller;
  let publishedDataService: PublishedDataServiceMock;
  const defaultUrl: PublishedData = {
    doi: "10.9999/7d01b382-3198-48f8-af43-8aaa13be388a",
    _id: "",
    pid: "",
    title: "",
    abstract: "",
    datasetPids: [],
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
    publishedDataService = module.get(PublishedDataService);
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

  it("should not double-prefix https:// when 'landingPage' already includes a protocol", () => {
    expect(
      controller.doiRegistrationJSON(customLandingPageWithProtocol),
    ).toHaveProperty(
      "data.attributes.url",
      `${customLandingPageWithProtocol.metadata!.landingPage}${encodeURIComponent(customLandingPageWithProtocol.doi)}`,
    );
  });

  describe("persisting metadata filled in by validation", () => {
    const request = {
      user: { username: "admin" },
      headers: {},
    } as unknown as Request;

    beforeEach(() => {
      publishedDataService.findOne.mockResolvedValue({
        ...defaultUrl,
        status: PublishedDataStatus.PRIVATE,
        metadata: { title: "no year" },
      });
    });

    it("should persist validated metadata on publish", async () => {
      await controller.publish(request, defaultUrl.doi);

      expect(publishedDataService.update).toHaveBeenCalledWith(
        { doi: defaultUrl.doi },
        {
          status: PublishedDataStatus.PUBLIC,
          metadata: { title: "no year", publicationYear: 2026 },
        },
      );
    });

    it("should persist validated metadata on register", async () => {
      await controller.register(request, defaultUrl.doi);

      expect(publishedDataService.update).toHaveBeenCalledWith(
        { doi: defaultUrl.doi },
        expect.objectContaining({
          status: PublishedDataStatus.REGISTERED,
          metadata: { title: "no year", publicationYear: 2026 },
        }),
      );
    });
  });
});
