import { HttpService } from "@nestjs/axios";
import { INestApplication } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { AxiosResponse } from "@nestjs/terminus/dist/health-indicator/http/axios.interfaces";
import { Connection } from "mongoose";
import { of } from "rxjs";
import request from "supertest";
import { getToken } from "../LoginUtils";
import { TestData } from "../TestData";
import { createTestingApp, createTestingModuleFactory } from "./utlis";

describe.each([undefined, "", "https://api.test.datacite.org/dois"])(
  "Published data datacite test (url: %p)",
  (registerDoiUri) => {
    let app: INestApplication;
    let mongoConnection: Connection;
    let token: string;
    let httpService: HttpService;

    let doi: string;

    beforeAll(async () => {
      if (registerDoiUri) {
        process.env.REGISTER_DOI_URI = registerDoiUri;
      } else {
        delete process.env.REGISTER_DOI_URI;
      }
      const moduleFixture = await createTestingModuleFactory().compile();
      app = await createTestingApp(moduleFixture);
      mongoConnection =
        await app.get<Promise<Connection>>(getConnectionToken());
      httpService = moduleFixture.get<HttpService>(HttpService);
    });

    beforeAll(async () => {
      token = await getToken(app.getHttpServer(), {
        username: "adminIngestor",
        password: TestData.Accounts["adminIngestor"]["password"],
      });
    });

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/v4/PublishedData")
        .send(TestData.PublishedDataV4)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${token}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => (doi = encodeURIComponent(res.body["doi"])));
    });

    afterAll(async () => {
      if (mongoConnection.db) await mongoConnection.db.dropDatabase();
      await app.close();
    });

    it("Should register this new published data", async () => {
      if (registerDoiUri && registerDoiUri.trim().length > 0) {
        const mockAxiosResponse: AxiosResponse = {
          data: {},
          status: TestData.SuccessfulGetStatusCode,
          statusText: "OK",
          headers: {},
          config: {},
        };
        jest
          .spyOn(httpService, "request")
          .mockReturnValue(of(mockAxiosResponse));
      }
      await request(app.getHttpServer())
        .post("/api/v4/PublishedData/" + doi + "/register")
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${token}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/);
    });

    it("Should fetch this new published data", async () => {
      await request(app.getHttpServer())
        .get("/api/v4/PublishedData/" + doi)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${token}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          expect(res.body.status).toEqual("registered");
          expect(res.body.registeredTime).toBeDefined();
          expect(res.body.metadata.dates).toBeDefined();
          expect(Array.isArray(res.body.metadata.dates)).toBe(true);
          expect(res.body.metadata.dates.length).toBe(1);
          const issuedDate = res.body.metadata.dates.filter(
            (d: { dateType: string }) => d.dateType === "Issued",
          );
          expect(issuedDate.length).toBe(1);
          expect(issuedDate[0].date).toEqual(res.body.registeredTime);
        });
    });

    it("Should not be able to delete published data in registrated", async () => {
      const archiveManagerToken = await getToken(app.getHttpServer(), {
        username: "archiveManager",
        password: TestData.Accounts["archiveManager"]["password"],
      });
      await request(app.getHttpServer())
        .delete("/api/v4/PublishedData/" + doi)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${archiveManagerToken}` })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });

    it("Should amend this new registered published data", async () => {
      await request(app.getHttpServer())
        .post("/api/v4/PublishedData/" + doi + "/amend")
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${token}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/);
    });

    it("Should fetch this amended published data", async () => {
      await request(app.getHttpServer())
        .get("/api/v4/PublishedData/" + doi)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${token}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          expect(res.body.status).toEqual("amended");
        });
    });
  },
);
