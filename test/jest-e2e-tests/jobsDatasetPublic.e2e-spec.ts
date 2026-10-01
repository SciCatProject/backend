import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { createTestingApp, createTestingModuleFactory } from "./utlis";
import { TestData } from "../TestData";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { getToken } from "../LoginUtils";

describe("Jobs public groups test", () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let pid: string;

  class JobsConfigMock extends JobConfigService {
    get allJobConfigs() {
      const jobs = super.allJobConfigs;
      return { public_access: jobs["public_access"] };
    }
  }

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleFactory()
      .overrideProvider(JobConfigService)
      .useClass(JobsConfigMock)
      .compile();
    app = await createTestingApp(moduleFixture);
    mongoConnection = await app.get<Promise<Connection>>(getConnectionToken());
  });

  beforeAll(async () => {
    const token = await getToken(app.getHttpServer(), {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    const dataset = {
      ...TestData.RawCorrectMin,
      isPublished: true,
    };

    await request(app.getHttpServer())
      .post("/api/v3/datasets")
      .send(dataset)
      .auth(token, { type: "bearer" })
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        pid = res.body.pid;
      });
  });

  afterAll(async () => {
    if (mongoConnection.db) await mongoConnection.db.dropDatabase();
    await app.close();
  });

  it("Check if job can be submitted", async () => {
    const job = {
      type: "public_access",
      emailJobInitiator: "user5.1@your.site",
      datasetList: [{ pid: pid, files: [] }],
    };

    return request(app.getHttpServer())
      .post("/api/v3/jobs")
      .send(job)
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode);
  });
});
