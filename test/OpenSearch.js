"use strict";
const { faker } = require("@faker-js/faker");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
require("dotenv").config();

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  pid1 = null,
  pid2 = null;

const commonName = "common";

const datasetName1 = `XRD_Si02_Beam3_2024A_thetaScan_dSpacing3.14_run07 ${commonName}`;
const datasetName2 = `Neutron_CeO2_400K_P12bar_timeOfFlight_lambda1.8_seq42 ${commonName}`;

const datasetName1Tokens = [
  "XRD",
  "Si02",
  "Beam3",
  "2024A",
  "thetaScan",
  "dSpacing3.14",
  "run07",
];
const datasetName2Tokens = [
  "Neutron",
  "CeO2",
  "400K",
  "P12bar",
  "timeOfFlight",
  "lambda1.8",
  "seq42",
];

const randomToken1 =
  datasetName1Tokens[Math.floor(Math.random() * datasetName1Tokens.length)];
const randomToken2 =
  datasetName2Tokens[Math.floor(Math.random() * datasetName2Tokens.length)];

const isOSenabled = process.env.OPENSEARCH_ENABLED == "yes";

(isOSenabled ? describe : describe.skip)(
  "Opensearch: CRUD, filtering and search test case",
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

    it("0010: adds a new raw dataset -1 ", async () => {
      const dataset1 = {
        ...TestData.DatasetWithScientificMetadata,
        datasetName: datasetName1,
        isPublished: true,
      };

      return request(appUrl)
        .post("/api/v3/Datasets")
        .send(dataset1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          pid1 = encodeURIComponent(res.body["pid"]);
        });
    });

    it("0011: adds a new raw dataset -2 ", async () => {
      const dataset2 = {
        ...TestData.DatasetWithScientificMetadata,
        datasetName: datasetName2,
        isPublished: true,
      };

      return request(appUrl)
        .post("/api/v3/Datasets")
        .send(dataset2)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          pid2 = encodeURIComponent(res.body["pid"]);
        });
    });

    it("0020: finds the dataset1 by partial text search", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: randomToken1 }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName1);
          found.should.equal(true);
        });
    });

    it("0021: finds the dataset2 by partial text search", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: randomToken2 }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName2);
          found.should.equal(true);
        });
    });

    it("0022: finds the dataset1 by full text search", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: datasetName1 }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName2);
          found.should.equal(true);
        });
    });

    it("0023: finds the dataset2 by full text search", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: datasetName2 }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName2);
          found.should.equal(true);
        });
    });

    it("0024: finds both datasets by shared common text", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: commonName }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const foundDataset1 = res.body.some(
            (d) => d.datasetName === datasetName1,
          );
          const foundDataset2 = res.body.some(
            (d) => d.datasetName === datasetName2,
          );
          foundDataset1.should.equal(true);
          foundDataset2.should.equal(true);
        });
    });

    it("0025: should finds both datasets by shared common text", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: commonName }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const foundDataset1 = res.body.some(
            (d) => d.datasetName === datasetName1,
          );
          const foundDataset2 = res.body.some(
            (d) => d.datasetName === datasetName2,
          );
          foundDataset1.should.equal(true);
          foundDataset2.should.equal(true);
        });
    });

    it("0026: returns no datasets for irrelevant search text", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: "shouldnotmatchanything" }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          res.body.length.should.equal(0);
        });
    });

    it("0034: should delete dataset1", async () => {
      return request(appUrl)
        .delete("/api/v3/datasets/" + pid1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0035: should delete dataset2", async () => {
      return request(appUrl)
        .delete("/api/v3/datasets/" + pid2)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/);
    });
  },
);
