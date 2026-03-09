"use strict";
const { faker } = require("@faker-js/faker");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
require("dotenv").config();

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  pid = null;

const isESenabled = process.env.ELASTICSEARCH_ENABLED == "yes";

(isESenabled ? describe : describe.skip)(
  "ElastiSearch: CRUD, filtering and search test case",
  () => {
    before(async () => {
      db.collection("Dataset").deleteMany({});

      accessTokenAdminIngestor = await utils.getToken(appUrl, {
        username: "adminIngestor",
        password: TestData.Accounts["adminIngestor"]["password"],
      });

      accessTokenArchiveManager = await utils.getToken(appUrl, {
        username: "archiveManager",
        password: TestData.Accounts["archiveManager"]["password"],
      });
    });

    it("0010: adds a new raw dataset", async () => {
      return request(appUrl)
        .post("/api/v3/Datasets")
        .send(TestData.ScientificMetadataForElasticSearch)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("scientificMetadata")
            .which.is.an("object")
            .that.has.all.keys(
              scientificMetadataFieldName.keyValue,
              scientificMetadataFieldName.unitAndValue,
              scientificMetadataFieldName.number,
              scientificMetadataFieldName.string,
            );
          pid = encodeURIComponent(res.body["pid"]);
        });
    });

    it("0034: should delete this raw dataset", async () => {
      return request(appUrl)
        .delete("/api/v3/datasets/" + pid)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/);
    });
  },
);
