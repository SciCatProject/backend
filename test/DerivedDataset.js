"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,

  pid = null,
  minPid = null,
  explicitPid = null;

describe("0700: DerivedDataset: Derived Datasets", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});

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
      .delete("/api/v3/datasets/" + encodeURIComponent(item.pid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  async function processArray(array) {
    for (const item of array) {
      await deleteDataset(item);
    }
  }

  // check if dataset is valid
  it("0100: check if valid derived dataset is valid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(true);
      });
  });

  it("0025: check if valid raw dataset min is valid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DerivedCorrectMin)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(true);
      });
  });

  it("0110: adds a new minimal derived dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send({...TestData.DerivedCorrectMin, sourceFolder: "/data/derived/"})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("derived");
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have.property("datasetName").and.equal("data/derived");
        minPid = res.body["pid"];
      });
  });

  it("0120: adds a new derived dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("owner")
          .and.be.equal(TestData.DerivedCorrect.owner);
        res.body.should.have.property("type").and.be.equal("derived");
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have.property("proposalId").and.be.string;
        //res.body.should.have.property("sampleId").and.be.string;
        //res.body.should.have.property("instrumentId").and.be.string;
        pid = res.body["pid"];
      });
  });

  it("0130: should be able to add new derived dataset with explicit pid", async () => {
    const derivedDatasetWithExplicitPID = {
      ...TestData.DerivedCorrect,
      pid: TestData.PidPrefix + "/" + uuidv4(),
    };
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(derivedDatasetWithExplicitPID)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("owner")
          .and.be.equal(derivedDatasetWithExplicitPID.owner);
        res.body.should.have.property("type").and.be.equal("derived");
        res.body.should.have
          .property("pid")
          .and.be.equal(derivedDatasetWithExplicitPID.pid);
        pid = res.body["pid"];
      });
  });

  it("0135: should not be able to add new derived dataset with user that is not in create dataset list", async () => {
    const derivedDatasetWithExplicitPID = {
      ...TestData.DerivedCorrect,
      pid: TestData.PidPrefix + "/" + uuidv4(),
    };

    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(derivedDatasetWithExplicitPID)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0140: should not be able to add new derived dataset with group that is not part of allowed groups", async () => {
    const derivedDatasetWithExplicitPID = {
      ...TestData.DerivedCorrect,
      pid: TestData.PidPrefix + "/" + uuidv4(),
      ownerGroup: "group1",
    };
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(derivedDatasetWithExplicitPID)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0145: should not be able to add new derived dataset with correct group but explicit PID that does not pass validation", async () => {
    const derivedDatasetWithExplicitPID = {
      ...TestData.DerivedCorrect,
      ownerGroup: "group2",
      pid: "strange-pid",
    };
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(derivedDatasetWithExplicitPID)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0150: should be able to add new derived dataset with group that is part of allowed groups and correct explicit PID", async () => {
    const derivedDatasetWithExplicitPID = {
      ...TestData.DerivedCorrect,
      ownerGroup: "group2",
      pid: TestData.PidPrefix + "/" + uuidv4(),
    };
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(derivedDatasetWithExplicitPID)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("derived");
        res.body.should.have
          .property("pid")
          .and.equal(derivedDatasetWithExplicitPID.pid);
        explicitPid = res.body["pid"];
      });
  });

  // check if dataset is valid
  it("0160: check if invalid derived dataset is valid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DerivedWrong)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(false);
      });
  });

  it("0170: tries to add an incomplete derived dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedWrong)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.statusCode.should.not.be.equal(200);
      });
  });

  it("0180: should fetch several derived datasets", async () => {
    const filter = {
      where: {
        type: "derived",
      },
      limit: 2,
    };

    return request(appUrl)
      .get(
        `/api/v3/Datasets?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .query(JSON.stringify(filter))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array);
      });
  });

  it("0190: should fetch this derived dataset", async () => {
    const filter = {
      where: {
        pid: pid,
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/datasets/findOne?filter=${encodeURIComponent(
          JSON.stringify(filter),
        )}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("pid").and.equal(pid);
      });
  });

  it("0200: should fetch all derived datasets", async () => {
    const filter = {
      where: {
        type: "derived",
      },
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets?filter=" + encodeURIComponent(JSON.stringify(filter)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array);
      });
  });

  it("0210: should contain an array of facets", async () => {
    const filter = {
      where: {
        type: "derived",
      },
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets?filter=" + encodeURIComponent(JSON.stringify(filter)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array");
      });
  });

  it("0220: should delete a derived dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + encodeURIComponent(pid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0230: should delete a minimal derived dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + encodeURIComponent(minPid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0240: should delete a derived dataset with explicit PID", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + encodeURIComponent(explicitPid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0250: delete all dataset as archivemanager", async () => {
    return await request(appUrl)
      .get("/api/v3/datasets")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        return processArray(res.body);
      });
  });
});
