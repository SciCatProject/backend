import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { OidcAuthGuard } from "src/auth/guards/oidc.guard";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import {
  ConfigServiceDbMock,
  createTestingApp,
  createTestingModuleFactory,
} from "./utlis";
import { TestData } from "../TestData";
import { MongoClient } from "mongodb";

["mongo", "memory"].forEach((store) => {
  describe(`OIDC test ${store}`, () => {
    let app: INestApplication;
    let mongoConnection: Connection;
    let mongoClient: MongoClient;

    class ConfigServiceMock extends ConfigServiceDbMock {
      get(key: string) {
        if (key === "expressSession.store") return store;
        return super.get(key);
      }
    }

    beforeAll(async () => {
      const moduleFixture = await createTestingModuleFactory(ConfigServiceMock)
        .overrideGuard(OidcAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

      app = await createTestingApp(moduleFixture);
      mongoConnection =
        await app.get<Promise<Connection>>(getConnectionToken());

      mongoClient = new MongoClient("mongodb://localhost:27017");
      await mongoClient.connect();
    });

    afterAll(async () => {
      await mongoClient.close();
    });

    afterEach(async () => {
      await mongoConnection.db!.dropDatabase();
    });

    it("Check session is created in DB", async function () {
      await request(app.getHttpServer())
        .get("/api/v3/auth/oidc")
        .set("Accept", "text/html")
        .expect(TestData.SuccessfulGetStatusCode);

      const sessions = mongoConnection.db!.collection("sessions");
      const session = await sessions.findOne();
      if (store === "mongo") expect(session).not.toBe(null);
      else expect(session).toBe(null);
    });
  });
});
