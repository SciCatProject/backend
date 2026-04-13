"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  derivedDatasetMinPid = null,
  rawDatasetWithMetadataPid = null,
  datasetScientificPid = null,
  derivedDatasetPidByUser = null;

describe("2500: Datasets v4 tests", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Proposal").deleteMany({});
    db.collection("Instrument").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  async function deleteDataset(item) {
    const response = await request(appUrl)
      .delete("/api/v4/datasets/" + encodeURIComponent(item.pid))
      .auth(accessTokenArchiveManager, { type: "bearer" })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  async function processArray(array) {
    for (const item of array) {
      await deleteDataset(item);
    }
  }

  describe("Datasets validation tests", () => {
    it("0100: should not be able to validate dataset if not logged in", async () => {
      return request(appUrl)
        .post("/api/v4/datasets/isValid")
        .send(TestData.DerivedCorrectMinV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0101: check if minimal derived dataset is valid", async () => {
      return request(appUrl)
        .post("/api/v4/datasets/isValid")
        .send(TestData.DerivedCorrectMinV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0102: check if minimal raw dataset is valid", async () => {
      return request(appUrl)
        .post("/api/v4/datasets/isValid")
        .send(TestData.RawCorrectMinV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0103: check if custom dataset is valid", async () => {
      return request(appUrl)
        .post("/api/v4/datasets/isValid")
        .send(TestData.CustomDatasetCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0104: check if invalid derived dataset is valid", async () => {
      return request(appUrl)
        .post("/api/v4/datasets/isValid")
        .send(TestData.DerivedWrongV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });
  });

  describe("Datasets creation tests", () => {
    it("0110: should not be able to create dataset if not logged in", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.DerivedCorrectMinV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0111: adds a new minimal derived dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.DerivedCorrectMinV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("derived");
          res.body.should.have.property("pid").and.be.a("string");
          derivedDatasetMinPid = res.body.pid;
        });
    });

    it("0112: adds a new minimal raw dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.RawCorrectMinV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.be.string(TestData.RawCorrectMinV4.owner);
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
        });
    });

    it("0113: adds a new minimal custom dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.CustomDatasetCorrectMin)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("custom");
          res.body.should.have.property("pid").and.be.a("string");
        });
    });

    it("0114: adds a new derived dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.DerivedCorrectV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("derived");
          res.body.should.have.property("pid").and.be.a("string");
        });
    });

    it("0115: adds a new raw dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.RawCorrectV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
        });
    });

    it("0116: adds a new custom dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.CustomDatasetCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.equal(TestData.CustomDatasetCorrect.owner);
          res.body.should.have.property("type").and.equal("custom");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have.property("proposalIds").and.be.a("array");
          res.body.should.have.property("sampleIds").and.be.a("array");
          res.body.should.have.property("instrumentIds").and.be.a("array");
        });
    });

    it("0120: should be able to add new derived dataset with explicit pid", async () => {
      const derivedDatasetWithExplicitPID = {
        ...TestData.DerivedCorrectV4,
        pid: TestData.PidPrefix + "/" + uuidv4(),
      };
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(derivedDatasetWithExplicitPID)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.equal(derivedDatasetWithExplicitPID.owner);
          res.body.should.have.property("type").and.equal("derived");
          res.body.should.have
            .property("pid")
            .and.equal(derivedDatasetWithExplicitPID.pid);
        });
    });

    it("0121: should not be able to add new derived dataset with user that is not in create dataset list", async () => {
      const derivedDatasetWithExplicitPID = {
        ...TestData.DerivedCorrectV4,
        pid: TestData.PidPrefix + "/" + uuidv4(),
      };

      return request(appUrl)
        .post("/api/v4/datasets")
        .send(derivedDatasetWithExplicitPID)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.CreationForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0122: should not be able to add new derived dataset with group that is not part of allowed groups", async () => {
      const derivedDatasetWithExplicitPID = {
        ...TestData.DerivedCorrectV4,
        pid: TestData.PidPrefix + "/" + uuidv4(),
        ownerGroup: "group1",
      };
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(derivedDatasetWithExplicitPID)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.CreationForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0123: should not be able to add new derived dataset with correct group but explicit PID that does not pass validation", async () => {
      const derivedDatasetWithExplicitPID = {
        ...TestData.DerivedCorrectV4,
        ownerGroup: "group2",
        pid: "strange-pid",
      };
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(derivedDatasetWithExplicitPID)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0124: should be able to add new derived dataset with group that is part of allowed groups and correct explicit PID", async () => {
      const derivedDatasetWithExplicitPID = {
        ...TestData.DerivedCorrectV4,
        ownerGroup: "group2",
        pid: TestData.PidPrefix + "/" + uuidv4(),
      };
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(derivedDatasetWithExplicitPID)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("derived");
          res.body.should.have
            .property("pid")
            .and.equal(derivedDatasetWithExplicitPID.pid);
          derivedDatasetPidByUser = res.body.pid;
        });
    });

    it("0125: tries to add an incomplete derived dataset", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.DerivedWrongV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0126: adds a new dataset with scientificMetadata", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(TestData.ScientificMetadataForElasticSearchV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have
            .property("scientificMetadata")
            .and.be.a("object");
          rawDatasetWithMetadataPid = res.body.pid;
        });
    });

    it("0127: should be able to add a new dataset with non-empty datasetLifecycle", async () => {
      const newDataset = {
        ...TestData.ScientificMetadataForElasticSearchV4,
        datasetlifecycle: {
          archivable: false,
          retrievable: true,
          publishable: true,
        },
      };
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(newDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("owner").and.be.a("string");
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have
            .property("scientificMetadata")
            .and.be.a("object");
          rawDatasetWithMetadataPid = res.body.pid;
        });
    });

    it("0128: should increment numberOfDatasets in linked proposals when creating a new dataset", async () => {
      const proposalRes = await request(appUrl)
        .post("/api/v3/proposals")
        .send(TestData.ProposalCorrectMin)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      const proposalId = proposalRes.body.proposalId;

      const dataset = {
        ...TestData.DerivedCorrectMinV4,
        proposalIds: [proposalId],
      };
      await request(appUrl)
        .post("/api/v4/datasets")
        .send(dataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" });

      const proposal = await request(appUrl)
        .get(`/api/v3/proposals/${encodeURIComponent(proposalId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      proposal.body.should.have.property("numberOfDatasets").and.equal(1);
    });

    it("0129: should decrement numberOfDatasets in linked proposals when deleting a dataset", async () => {
      const proposalBody = {
        ...TestData.ProposalCorrectMin,
        proposalId: "test0129",
      };
      const proposalRes = await request(appUrl)
        .post("/api/v3/proposals")
        .send(proposalBody)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      const proposalId = proposalRes.body.proposalId;
      const dataset = {
        ...TestData.DerivedCorrectMinV4,
        proposalIds: [proposalId],
      };
      const datasetRes = await request(appUrl)
        .post("/api/v4/datasets")
        .send(dataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" });

      let proposal = await request(appUrl)
        .get(`/api/v3/proposals/${encodeURIComponent(proposalId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" });

      proposal.body.should.have.property("numberOfDatasets").and.equal(1);

      await request(appUrl)
        .delete(`/api/v4/datasets/${encodeURIComponent(datasetRes.body.pid)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);

      proposal = await request(appUrl)
        .get(`/api/v3/proposals/${encodeURIComponent(proposalId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      proposal.body.should.have.property("numberOfDatasets").and.equal(0);
    });

    it("0130: should not increment or decrement numberOfDatasets when proposalIds is empty or undefined", async () => {
      const proposalBody = {
        ...TestData.ProposalCorrectMin,
        proposalId: "test0130",
      };
      const proposalRes = await request(appUrl)
        .post("/api/v3/proposals")
        .send(proposalBody)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      const proposalId = proposalRes.body.proposalId;
      
      const dataset = {
        ...TestData.DerivedCorrectMinV4,
        proposalIds: [proposalId],
      };
      await request(appUrl)
        .post("/api/v4/datasets")
        .send(dataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" });

      const proposalBefore = await request(appUrl)
        .get(`/api/v3/proposals/${encodeURIComponent(proposalId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      const initialCount = proposalBefore.body.numberOfDatasets || 0;

      const res1 = await request(appUrl)
        .post("/api/v4/datasets")
        .send({ ...TestData.DerivedCorrectMinV4, proposalIds: [] })
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      
      const res2 = await request(appUrl)
        .post("/api/v4/datasets")
        .send({ ...TestData.DerivedCorrectMinV4 })
        .auth(accessTokenAdminIngestor, { type: "bearer" });

      await request(appUrl)
        .delete(`/api/v4/datasets/${encodeURIComponent(res1.body.pid)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" });
      await request(appUrl)
        .delete(`/api/v4/datasets/${encodeURIComponent(res2.body.pid)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" });

      const proposalAfter = await request(appUrl)
        .get(`/api/v3/proposals/${encodeURIComponent(proposalId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" });
      console.log("DEBUG numberOfDatasets: ", proposalAfter.body.numberOfDatasets);
      console.log("DEBUG initialCount: ", initialCount);
      proposalAfter.body.should.have.property("numberOfDatasets").and.equal(initialCount);
    });
  });

  describe("Datasets v4 findAll tests", () => {
    it("0200: should not be able to fetch datasets if not logged in", async () => {
      const filter = {
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      return request(appUrl)
        .get("/api/v4/datasets")
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0201: should fetch several datasets using limits sort filter", async () => {
      const filter = {
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      await request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(2);
          const [firstDatast, secondDataset] = res.body;

          firstDatast.datasetName.should.satisfy(
            () => firstDatast.datasetName <= secondDataset.datasetName,
          );
        });

      filter.limits.limit = 3;
      filter.limits.sort.datasetName = "desc";

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(3);
          const [firstDatast, secondDataset, thirdDataset] = res.body;

          firstDatast.datasetName.should.satisfy(
            () =>
              firstDatast.datasetName >= secondDataset.datasetName &&
              firstDatast.datasetName >= thirdDataset.datasetName &&
              secondDataset.datasetName >= thirdDataset.datasetName,
          );
        });
    });

    it("0202: should fetch different dataset if skip is used in limits filter", async () => {
      let responseBody;
      const filter = {
        limits: {
          limit: 1,
          skip: 0,
          sort: {
            datasetName: "asc",
            pid: "asc",
          },
        },
      };

      await request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(1);

          responseBody = res.body;
        });

      filter.limits.skip = 1;

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(1);

          JSON.stringify(responseBody).should.not.be.equal(
            JSON.stringify(res.body),
          );
        });
    });

    it("0203: should fetch specific dataset fields only if fields is provided in the filter", async () => {
      const filter = {
        fields: ["datasetName", "pid"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("datasetName");
          firstDataset.should.have.property("pid");
          firstDataset.should.not.have.property("description");
        });
    });

    it("0204: should fetch dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["instruments", "proposals"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;
          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.should.have.property("proposals");
          firstDataset.should.not.have.property("datablocks");
        });
    });

    it("0205: should fetch all datasets with related items when requested with all relations", async () => {
      const filter = {
        include: ["all"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.should.have.property("proposals");
          firstDataset.should.have.property("datablocks");
          firstDataset.should.have.property("attachments");
          firstDataset.should.have.property("origdatablocks");
          firstDataset.should.have.property("samples");
        });
    });

    it("0206: should be able to fetch the datasets providing where filter", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");

          res.body.forEach((dataset) => {
            dataset.datasetName.should.match(/Dataset/i);
          });
        });
    });

    it("0207: should be able to fetch the datasets providing all allowed filters together", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
        include: ["all"],
        fields: ["datasetName", "pid"],
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(2);

          res.body.forEach((dataset) => {
            dataset.should.have.property("datasetName");
            dataset.should.have.property("pid");
            dataset.should.not.have.property("description");
            dataset.should.have.property("instruments");
            dataset.should.have.property("proposals");
            dataset.should.have.property("datablocks");
            dataset.should.have.property("attachments");
            dataset.should.have.property("origdatablocks");
            dataset.should.have.property("samples");

            dataset.datasetName.should.match(/Dataset/i);
          });
        });
    });

    it("0208: should not be able to provide filters that are not allowed", async () => {
      const filter = {
        customField: { datasetName: "test" },
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0209: should return informative error on malfored json is passed in filter", async () => {
      const filter = {
        limits: {
          limit: 1,
        },
      };
      const malformedJson = JSON.stringify(filter).replace("}", "},");

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: malformedJson })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("message")
            .and.be.equal(
              "Invalid JSON in filter: Expected double-quoted property name in JSON at position 22 (line 1 column 23)",
            );
        });
    });

    it("0210: should fetch dataset relation fields if provided in the filter as obj", async () => {
      const filter = {
        include: [{ relation: "instruments" }, { relation: "proposals" }],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.should.have.property("proposals");
          firstDataset.should.not.have.property("datablocks");
        });
    });

    it("0211: should fetch dataset relation fields if provided in the filter as obj and add scopes", async () => {
      const filter = {
        where: { pid: derivedDatasetMinPid },
        include: [{
          relation: "instruments",
          scope: {
            where:
              { uniqueName: TestData.InstrumentCorrect1.uniqueName }, fields: ["uniqueName"]
          }
        }],
      };

      const instrument1 = await request(appUrl)
        .post("/api/v3/Instruments")
        .send(TestData.InstrumentCorrect1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)

      const instrument2 = await request(appUrl)
        .post("/api/v3/Instruments")
        .send(TestData.InstrumentCorrect2)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)

      await request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send({ instrumentIds: [instrument1.body.id, instrument2.body.id] })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/);

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments").eql([{
            _id: instrument1.body.id,
            uniqueName: TestData.InstrumentCorrect1.uniqueName
          }]
          );
          firstDataset.should.not.have.property("datablocks");
        });
    });

    it("0212: should fetch specific dataset fields excluding fields provided in field", async () => {
      const filter = {
        fields: {datasetName: 0, contactEmail: 1},
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.not.have.property("datasetName");
          firstDataset.should.have.property("contactEmail");
        });
    });
  });

  describe("Datasets v4 findOne tests", () => {
    it("0300: should not be able to fetch dataset if not logged in", async () => {
      const filter = {
        limits: {
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      return request(appUrl)
        .get("/api/v4/datasets/findOne")
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0301: should fetch different dataset if skip is used in limits filter", async () => {
      let responseBody;
      const filter = {
        limits: {
          skip: 0,
          sort: {
            datasetName: "asc",
            createdAt: "asc",
          },
        },
      };

      await request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          responseBody = res.body;
        });

      filter.limits.skip = 1;

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          JSON.stringify(responseBody).should.not.be.equal(
            JSON.stringify(res.body),
          );
        });
    });

    it("0302: should fetch specific dataset fields only if fields is provided in the filter", async () => {
      const filter = {
        fields: ["datasetName", "pid"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("datasetName");
          res.body.should.have.property("pid");
          res.body.should.not.have.property("description");
        });
    });

    it("0303: should fetch specific dataset fields only if fields is provided in the filter with relationships", async () => {
      const filter = {
        include: ["instruments", "proposals"],
        fields: ["datasetName"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("datasetName");

          res.body.should.not.have.property("description");
          res.body.should.not.have.property("pid");

          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.not.have.property("datablocks");
        });
    });

    it("0304: should fetch dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["instruments", "proposals"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.not.have.property("datablocks");
        });
    });

    it("0305: should fetch all dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["all"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.have.property("datablocks");
          res.body.should.have.property("attachments");
          res.body.should.have.property("origdatablocks");
          res.body.should.have.property("samples");
        });
    });

    it("0306: should be able to fetch the dataset providing where filter", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.datasetName.should.match(/Dataset/i);
        });
    });

    it("0307: should be able to fetch a dataset providing all allowed filters together", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
        include: ["all"],
        fields: ["datasetName", "pid"],
        limits: {
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("datasetName");
          res.body.should.have.property("pid");
          res.body.should.not.have.property("description");

          res.body.should.have.property("pid");
          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.have.property("datablocks");
          res.body.should.have.property("attachments");
          res.body.should.have.property("origdatablocks");
          res.body.should.have.property("samples");

          res.body.datasetName.should.match(/Dataset/i);
        });
    });

    it("0308: should not be able to provide filters that are not allowed", async () => {
      const filter = {
        customField: { datasetName: "test" },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0309: should throw BadRequest when subfields within the embedded documents are used in the fields projection", async () => {
      const filter = {
        include: ["all"],
        fields: [
          "datasetName",
          "attachments.thumbnail",
          "attachments.relationships.targetType",
          "origdatablocks.dataFileList.path",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.match(/Invalid \$project :: caused by :: Path collision at origdatablocks/);
        });
    });
  });

  describe("Datasets v4 count tests", () => {
    it("0400: should not be able to fetch datasets count if not logged in", async () => {
      const filter = {
        limits: {
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      return request(appUrl)
        .get("/api/v4/datasets/count")
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0401: should be able to fetch the datasets count providing where filter", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/count`)
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
          res.body.count.should.be.greaterThan(0);
        });
    });
  });

  describe("Datasets v4 findById tests", () => {
    it("0500: should not be able to fetch dataset by id if not logged in", () => {
      return request(appUrl)
        .get(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0501: should fetch dataset by id", () => {
      return request(appUrl)
        .get(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.pid.should.be.eq(derivedDatasetMinPid);
        });
    });

    it("0502: should fetch dataset relation fields if provided in the filter", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}?include=instruments&include=proposals`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.not.have.property("datablocks");
        });
    });

    it("0503: should fetch all dataset relation fields if provided in the filter", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}?include=all`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("instruments");
          res.body.should.have.property("proposals");
          res.body.should.have.property("datablocks");
          res.body.should.have.property("attachments");
          res.body.should.have.property("origdatablocks");
          res.body.should.have.property("samples");
        });
    });

    it("0504: should fetch dataset's lifecycle by id", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("archivable").and.equal(true);
          res.body.should.have.property("retrievable").and.equal(false);
          res.body.should.have.property("publishable").and.equal(false);
          res.body.should.have
            .property("retrieveIntegrityCheck")
            .and.equal(false);
        });
    });
  });

  describe("Datasets v4 update tests", () => {
    it("0600: should not be able to update dataset if not logged in", () => {
      const updatedDataset = {
        ...TestData.DerivedCorrectMinV4,
        datasetName: "Updated dataset name",
      };

      return request(appUrl)
        .put(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send(updatedDataset)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0601: should be able to update dataset", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, ...updatedDataset } = {
        ...TestData.DerivedCorrectMinV4,
        datasetName: "Updated dataset name",
      };

      return request(appUrl)
        .put(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("datasetName");
          res.body.datasetName.should.be.eq(updatedDataset.datasetName);
        });
    });

    it("0602: should not be able to partially update dataset if not logged in", () => {
      const updatedDataset = {
        datasetName: "Updated dataset name",
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send(updatedDataset)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0603: should be able to partially update dataset", () => {
      const updatedDataset = {
        datasetName: "Updated dataset name",
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("pid");
          res.body.should.have.property("datasetName");
          res.body.datasetName.should.be.eq(updatedDataset.datasetName);
        });
    });

    it("0604: should be able to partially update dataset's scientific metadata field", () => {
      const updatedDataset = {
        datasetlifecycle: { storageLocation: "new location" },
        scientificMetadata: {
          with_unit_and_value_si: {
            value: 600,
            unit: "mg",
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("pid");
          res.body.should.have.property("datasetName");
          res.body.scientificMetadata.with_unit_and_value_si.should.deep.eq({
            value: 600,
            unit: "mg",
            valueSI: 0.0006,
            unitSI: "kg",
          });
          res.body.scientificMetadata.with_number.should.deep.eq({
            value: 111,
            unit: "",
          });
          res.body.datasetlifecycle.should.have
            .property("storageLocation")
            .and.equal("new location");
        });
    });

    it("0605: should be able to partially update dataset's scientific metadata field and update SI values", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            value: -2,
            unit: "km",
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("pid");
          res.body.scientificMetadata.with_unit_and_value_si.should.deep.eq({
            value: -2,
            unit: "km",
            valueSI: -2000,
            unitSI: "m",
          });
        });
    });

    it("0606: should be able to partially update dataset's scientific metadata field and set some to null, SI units recreated", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            value: -2,
            unit: "cm",
            valueSI: null,
            unitSI: null,
          },
          with_number: null,
        },
        datasetName: "Updated dataset with scientific metadata",
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("pid");
          res.body.should.have
            .property("datasetName")
            .and.equal("Updated dataset with scientific metadata");
          res.body.scientificMetadata.with_unit_and_value_si.should.deep.eq({
            value: -2,
            unit: "cm",
            valueSI: -0.02,
            unitSI: "m",
          });
          res.body.scientificMetadata.should.not.have.property("with_number");
        });
    });

    it("0607 should not be able to partially update dataset's scientific metadata field when only value is passed, unit missing in request body", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            value: -2,
          },
          with_number: null,
        },
        datasetName: "Updated dataset with scientific metadata",
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(
              `Original dataset ${rawDatasetWithMetadataPid} contains both value and unit in scientificMetadata.with_unit_and_value_si. Please provide both when updating.`,
            );
        });
    });

    it("0608 should not partially update dataset's scientific metadata field when only unit is passed, value missing in request body", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            unit: "m",
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(
              `Original dataset ${rawDatasetWithMetadataPid} contains both value and unit in scientificMetadata.with_unit_and_value_si. Please provide both when updating.`,
            );
        });
    });

    it("0609 should not partially update dataset's scientific metadata field when only value and valueSI are passed, unit missing in request body", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            value: 32,
            valueSI: 320,
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(
              `Original dataset ${rawDatasetWithMetadataPid} contains both value and unit in scientificMetadata.with_unit_and_value_si. Please provide both when updating.`,
            );
        });
    });

    it("0610: should not be able to partially update dataset's scientific metadata field to specify only units, even if it was an empty string before", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_string: {
            unit: "cm",
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(
              `Original dataset ${rawDatasetWithMetadataPid} contains both value and unit in scientificMetadata.with_string. Please provide both when updating.`,
            );
        });
    });

    it("0611: should partially update dataset's scientific metadata, if initial object has only property `value`", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_no_unit: {
            value: 444,
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.scientificMetadata.should.have
            .property("with_no_unit")
            .and.be.deep.eq(updatedDataset.scientificMetadata.with_no_unit);
        });
    });

    it("0612: should partially update dataset's scientific metadata, if initial object has both properties `value` and `unit` but `unit` is explicitly undefined", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_undefined_unit: {
            value: 555,
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.scientificMetadata.with_undefined_unit.should.have
            .property("value")
            .and.be.eq(555);
          res.body.scientificMetadata.with_undefined_unit.should.not.have.property(
            "unit",
          );
        });
    });

    it("0613: should partially update dataset's scientific metadata. When value, unit, valueSI and unitSI are passed, interceptor should overwrite the valueSI and unitSI", () => {
      const updatedDataset = {
        scientificMetadata: {
          with_unit_and_value_si: {
            value: 22,
            unit: "cm",
            valueSI: 555,
            unitSI: "cmcm",
          },
        },
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(rawDatasetWithMetadataPid)}`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.scientificMetadata.with_unit_and_value_si.should.deep.eq({
            value: 22,
            unit: "cm",
            valueSI: 0.22,
            unitSI: "m",
          });
        });
    });

    it("0614: should not be able to update dataset when it's trying to update dataset lifecycle as user of UPDATE_DATASET_LIFECYCLE_GROUPS", () => {
      const updatedDataset = {
        datasetlifecycle: {
          retrievable: true,
        },
        datasetName: "Updated dataset name",
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0615: should be able to update dataset when it's trying to update dataset lifecycle as owner of the dataset", () => {
      const updatedDataset = {
        datasetlifecycle: {
          retrievable: true,
        },
        datasetName: "New dataset name",
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetPidByUser)}`,
        )
        .send(updatedDataset)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("datasetName")
            .and.equal("New dataset name");
          res.body.datasetlifecycle.should.have
            .property("retrievable")
            .and.equal(true);
        });
    });

    it("0615: should not be able to update lifecycle of dataset when it's not providing any body", () => {
      const updatedDataset = {};

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(`dataset lifecycle DTO must not be empty`);
        });
    });

    it("0616: should not be able to update lifecycle of dataset when dataset is not found", () => {
      const updatedDataset = {
        retrievable: true,
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/fakePid/datasetlifecycle`)
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("message")
            .and.equal(`dataset with pid fakePid not found`);
        });
    });

    it("0617: should  be able to update lifecycle of dataset as user from UPDATE_DATASET_LIFECYCLE_GROUPS", () => {
      const updatedDataset = {
        archivable: true,
        retrievable: true,
        publishable: true,
        dateOfDiskPurging: "2017-01-12T00:00:00.000Z",
        archiveRetentionTime: "2015-02-10T00:00:00.000Z",
        dateOfPublishing: "2003-02-12T00:00:00.000Z",
        publishedOn: "2020-09-12T07:00:00.000Z",
        isOnCentralDisk: true,
        archiveStatusMessage: "dataset archived",
        retrieveStatusMessage: "dataset retrieved",
        retrieveIntegrityCheck: true,
        retrieveReturnMessage: { message: "not ok", code: 400 },
        storageLocation: "new location",
      };
      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.be.deep.include(updatedDataset);
          res.body.should.have
            .property("storageLocation")
            .and.equal("new location");
        });
    });

    it("0618: should  be able to update lifecycle of dataset, changes from previous update should persist", () => {
      const updatedDataset = {
        retrievable: false,
      };
      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("archivable").and.equal(true);
          res.body.should.have.property("retrievable").and.equal(false);
          res.body.should.have.property("publishable").and.equal(true);
          res.body.should.have
            .property("retrieveIntegrityCheck")
            .and.equal(true);
        });
    });

    it("0619: should  be able to update lifecycle of dataset, changes from previous update should persist(2)", () => {
      const updatedDataset = {
        publishable: false,
      };
      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("archivable").and.equal(true);
          res.body.should.have.property("retrievable").and.equal(false);
          res.body.should.have.property("publishable").and.equal(false);
          res.body.should.have
            .property("retrieveIntegrityCheck")
            .and.equal(true);
        });
    });

    it("0621: should  be able to update lifecycle of dataset as a user from admin groups", () => {
      const updatedDataset = {
        publishable: true,
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("archivable").and.equal(true);
          res.body.should.have.property("retrievable").and.equal(false);
          res.body.should.have.property("publishable").and.equal(true);
        });
    });

    it("0622: should  be able to update lifecycle of dataset owned by this user's group", () => {
      const updatedDataset = {
        archivable: false,
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetPidByUser)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0623: should not be able to update lifecycle of dataset when not in appropriate group", () => {
      const updatedDataset = {
        archivable: false,
      };

      return request(appUrl)
        .patch(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}/datasetlifecycle`,
        )
        .set("Content-type", "application/merge-patch+json")
        .send(updatedDataset)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Datasets v4 delete tests", () => {
    it("0700: should not be able to delete dataset if not logged in", () => {
      return request(appUrl)
        .delete(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0801: should be able to delete dataset", () => {
      return request(appUrl)
        .delete(`/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("pid");
          res.body.should.have.property("datasetName");
        });
    });

    it("0802: delete all dataset as archivemanager", async () => {
      return await request(appUrl)
        .get("/api/v4/datasets")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          return processArray(res.body);
        });
    });
  });

  describe("Datasets v4 scientificMetadata validation", () => {
    let RawCorrectMinV4Scientific = {
      ...TestData.RawCorrectMinV4,
      scientificMetadata: {
        title: "Test Scientific Metadata",
        description: "This is a test scientific metadata field.",
      },
    };

    it("0800: adds a new minimal raw dataset with scientificMetadata and no scientificMetadataSchema", async () => {
      return request(appUrl)
        .post("/api/v4/datasets")
        .send(RawCorrectMinV4Scientific)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.be.string(RawCorrectMinV4Scientific.owner);
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.not.have.property("scientificMetadataSchema");
          res.body.should.not.have.property("scientificMetadataValid");
        });
    });

    it("0801: adds a new minimal raw dataset with valid scientificMetadataSchema url and invalid scientificMetadata", async () => {
      RawCorrectMinV4Scientific = {
        ...TestData.RawCorrectMinV4,
        scientificMetadata: {
          title: false,
        },
        scientificMetadataSchema: "https://json-schema.org/draft-07/schema",
      };

      return request(appUrl)
        .post("/api/v4/datasets")
        .send(RawCorrectMinV4Scientific)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.be.string(RawCorrectMinV4Scientific.owner);
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(false);
        });
    });

    it("0802: adds a new minimal raw dataset with valid scientificMetadataSchema url and valid scientificMetadata", async () => {
      RawCorrectMinV4Scientific = {
        ...TestData.RawCorrectMinV4,
        scientificMetadata: {
          title: "Test Scientific Metadata",
          description: "This is a test scientific metadata field.",
        },
        scientificMetadataSchema: "https://json-schema.org/draft-07/schema",
      };

      return request(appUrl)
        .post("/api/v4/datasets")
        .send(RawCorrectMinV4Scientific)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("owner")
            .and.be.string(RawCorrectMinV4Scientific.owner);
          res.body.should.have.property("type").and.equal("raw");
          res.body.should.have.property("pid").and.be.a("string");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(true);
          datasetScientificPid = res.body.pid;
        });
    });

    it("0803: partially updates the dataset without editing scientificMetadata and scientificMetadataSchema", () => {
      const updateDto = {
        datasetName: "Updated dataset name 1",
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(datasetScientificPid)}`)
        .send(updateDto)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("pid");
          res.body.should.have
            .property("datasetName")
            .and.be.equal(updateDto.datasetName);
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(true);
        });
    });

    it("0804: partially updates the dataset with a new invalid scientificMetadata", () => {
      const updateDto = {
        scientificMetadata: {
          title: "Test Scientific Metadata",
          description: false,
        },
      };

      return request(appUrl)
        .patch(`/api/v4/datasets/${encodeURIComponent(datasetScientificPid)}`)
        .send(updateDto)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("pid");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(updateDto.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(false);
        });
    });

    it("0805: updates the dataset without providing scientificMetadata and scientificMetadataSchema", () => {
      const { type, ...updateDto } = {
        ...TestData.RawCorrectMinV4,
        datasetName: "Updated dataset name 2",
      };

      return request(appUrl)
        .put(`/api/v4/datasets/${encodeURIComponent(datasetScientificPid)}`)
        .send(updateDto)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("pid");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals({});
          res.body.should.not.have.property("scientificMetadataSchema");
          res.body.should.not.have.property("scientificMetadataValid");
        });
    });

    it("0806: adds a new minimal raw dataset with invalid scientificMetadataSchema url", async () => {
      RawCorrectMinV4Scientific = {
        ...TestData.RawCorrectMinV4,
        scientificMetadata: {
          title: "Test Scientific Metadata",
          description: "This is a test scientific metadata field.",
        },
        scientificMetadataSchema:
          "https://json-schema.org/draft-07/schema/invalid",
      };

      return request(appUrl)
        .post("/api/v4/datasets")
        .send(RawCorrectMinV4Scientific)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("pid");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(false);
        });
    });

    it("0807: adds a new minimal raw dataset with invalid scientificMetadataSchema", async () => {
      RawCorrectMinV4Scientific = {
        ...TestData.RawCorrectMinV4,
        scientificMetadata: {
          title: "Test Scientific Metadata",
          description: "This is a test scientific metadata field.",
        },
        scientificMetadataSchema: "https://www.scicatproject.org/",
      };

      return request(appUrl)
        .post("/api/v4/datasets")
        .send(RawCorrectMinV4Scientific)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("pid");
          res.body.should.have
            .property("scientificMetadata")
            .that.deep.equals(RawCorrectMinV4Scientific.scientificMetadata);
          res.body.should.have
            .property("scientificMetadataSchema")
            .and.equal(RawCorrectMinV4Scientific.scientificMetadataSchema);
          res.body.should.have
            .property("scientificMetadataValid")
            .and.be.equal(false);
        });
    });
  });
});
