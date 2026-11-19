import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { throwError } from "rxjs";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataStatus } from "./interfaces/published-data.interface";
import { PublishedDataService } from "./published-data.service";
import { PublishedDataV4Controller } from "./published-data.v4.controller";
import { PublishedData } from "./schemas/published-data.schema";
import { ValidatorService } from "./validator.service";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}
class DatasetsControllerMock {
  findByIdAndUpdate = jest.fn().mockResolvedValue({});
}

class HttpServiceMock {
  request = jest.fn();
}

class ProposalsServiceMock {}

class PublishedDataServiceMock {
  findOne = jest.fn();
  update = jest.fn();
}

class CaslAbilityFactoryMock {
  publishedDataAccess = jest.fn().mockReturnValue({ cannot: () => false });
}

class ValidatorServiceMock {
  validate = jest.fn().mockResolvedValue(undefined);
}

const defaultConfig: Record<string, unknown> = {
  publicURLprefix: "https://doi.ess.eu/detail/",
};
let config: Record<string, unknown> = { ...defaultConfig };

class ConfigServiceMock {
  get(key: string) {
    return config[key];
  }
}

describe("PublishedDataController", () => {
  let controller: PublishedDataV4Controller;
  let httpService: HttpServiceMock;
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
    config = { ...defaultConfig };
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
    httpService = module.get(HttpService);
    publishedDataService = module.get(PublishedDataService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("should throw and log an error if neither 'landingPage' nor public URL prefix is set", () => {
    config.publicURLprefix = undefined;
    const loggerSpy = jest.spyOn(Logger, "error").mockImplementation();

    expect(() => controller.doiRegistrationJSON(defaultUrl)).toThrow(
      HttpException,
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "neither metadata.landingPage nor PUBLIC_URL_PREFIX is set",
      ),
      expect.any(String),
    );
  });

  describe("register", () => {
    const request = { headers: {}, user: {} } as unknown as Request;
    const toRegister = () => ({
      ...defaultUrl,
      datasetPids: ["pid1"],
      status: PublishedDataStatus.PUBLIC,
    });

    beforeEach(() => {
      config.registerDoiUri = "https://api.datacite.test/dois";
      config.doiUsername = "user";
      config.doiPassword = "pass";
    });

    it("should log the DataCite error and throw FAILED_DEPENDENCY", async () => {
      publishedDataService.findOne.mockResolvedValue(toRegister());
      httpService.request.mockReturnValue(
        throwError(() => ({
          message: "Request failed with status code 422",
          response: {
            status: 422,
            data: {
              errors: [{ source: "url", title: "Can't be blank" }],
            },
            headers: {},
          },
          config: {},
        })),
      );
      const loggerSpy = jest.spyOn(Logger, "error").mockImplementation();
      jest.spyOn(Logger, "verbose").mockImplementation();

      const promise = controller.register(request, defaultUrl.doi);

      await expect(promise).rejects.toThrow(HttpException);
      await promise.catch((err: HttpException) => {
        expect(err.getStatus()).toBe(HttpStatus.FAILED_DEPENDENCY);
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          JSON.stringify({
            errors: [{ source: "url", title: "Can't be blank" }],
          }),
        ),
        "PublishedDataController.register",
      );
      expect(publishedDataService.update).not.toHaveBeenCalled();
    });
  });
});
