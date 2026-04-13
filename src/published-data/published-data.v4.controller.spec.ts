import { HttpService } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataService } from "./published-data.service";
import { PublishedDataV4Controller } from "./published-data.v4.controller";
import { PublishedData } from "./schemas/published-data.schema";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}
class DatasetsControllerMock {}

class HttpServiceMock {}

class ProposalsServiceMock {}

class PublishedDataServiceMock {}

class CaslAbilityFactoryMock {}

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
});
