"use strict";
const utils = require("./LoginUtils");
const { v4: uuidv4 } = require("uuid");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,

  datasetPid1 = null,
  datasetPid2 = null,
  datasetPid3 = null,
  jobId1 = null,
  jobId2 = null,
  jobId3 = null,
  attachmentId = null,
  datablockId1 = null,
  datablockId2 = null,
  datablockId3 = null,
  datablockId4 = null,
  datablockId5 = null,
  origDatablock1 = null;

const dataset1 = {
  ...TestData.DerivedCorrectV4,
  isPublished: true,
  ownerGroup: "group1",
  accessGroups: ["group5"],
};

const dataset2 = {
  ...TestData.DerivedCorrectV4,
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: [],
};

const dataset3 = {
  ...TestData.DerivedCorrectV4,
  isPublished: false,
  ownerGroup: "group5",
  accessGroups: ["group1"],
};

describe("1165: Jobs test filters and access", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Datablock").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
    db.collection("Job").deleteMany({});
    db.collection("Attachment").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    accessTokenUser51 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset1,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid1 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset2,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid2 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset3,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid3 = res.body["pid"];
      });
    const attachment = {
      ...TestData.AttachmentCorrectV4,
      relationships: [
        {
          targetId: datasetPid1,
          targetType: "dataset",
        },
        {
          targetId: datasetPid2,
          targetType: "dataset",
        },
      ],
      aid: uuidv4(),
    };

    await request(appUrl)
      .post("/api/v4/attachments")
      .send(attachment)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        attachmentId = res.body.aid;
      });

    await request(appUrl)
      .post(`/api/v3/datasets/${encodeURIComponent(datasetPid1)}/datablocks`)
      .send(TestData.DataBlockCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("archiveId");
        datablockId1 = res.body.id;
      });

    const dataBlock1 = {
      ...TestData.DataBlockCorrect,
      archiveId: "id2",
      size: 200,
    };
    await request(appUrl)
      .post(`/api/v3/datasets/${encodeURIComponent(datasetPid1)}/datablocks`)
      .send(dataBlock1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("archiveId");
        datablockId2 = res.body.id;
      });

    const dataBlock2 = {
      ...TestData.DataBlockCorrect,
      archiveId: "id3",
      size: 300,
    };
    await request(appUrl)
      .post(`/api/v3/datasets/${encodeURIComponent(datasetPid2)}/datablocks`)
      .send(dataBlock2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("archiveId");
        datablockId3 = res.body.id;
      });

    const dataBlock3 = {
      ...TestData.DataBlockCorrect,
      archiveId: "id4",
      size: 400,
    };
    await request(appUrl)
      .post(`/api/v3/datasets/${encodeURIComponent(datasetPid2)}/datablocks`)
      .send(dataBlock3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("archiveId");
        datablockId4 = res.body.id;
      });

    const dataBlock4 = {
      ...TestData.DataBlockCorrect,
      archiveId: "id5",
      size: 500,
    };
    await request(appUrl)
      .post(`/api/v3/datasets/${encodeURIComponent(datasetPid3)}/datablocks`)
      .send(dataBlock4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("archiveId");
        datablockId5 = res.body.id;
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid1,
        ownerGroup: "group1",
        accessGroups: ["group5"],
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock1 = res.body._id;
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid2,
        ownerGroup: "group3",
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid3,
        ownerGroup: "group5",
        accessGroups: ["group1"],
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: datasetPid1, files: [] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId1 = res.body["id"];
      });

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: datasetPid2, files: [] },
            { pid: datasetPid3, files: [] },
          ],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId2 = res.body["id"];
      });

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "user5.1",
        ownerGroup: "group5",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: datasetPid2, files: [] },
            { pid: datasetPid3, files: [] },
          ],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId3 = res.body["id"];
      });
  });

  after(() => {
    db.collection("Dataset").deleteMany({});
    db.collection("Datablock").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
    db.collection("Job").deleteMany({});
    db.collection("Attachment").deleteMany({});
  });

  it("0010: Access jobs as a user from ADMIN_GROUPS with wrong include query", async () => {
    const query = { include: ["datasets", "datasets.datablocks"] };
    return request(appUrl)
      .get(`/api/v4/Jobs`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("message")
          .and.be.equal(
            "The 'include' filter must contain 'datasets' — it’s currently the only collection that can be merged. To include related data, add use Jobs/v4/datasetDetails endpoint",
          );
      });
  });

  it("0020: Access jobs and dataset details as a user from ADMIN_GROUPS with include query, which is not allowed", async () => {
    const query = { include: ["datasets", "datasets.datablocks"] };
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0030: Access jobs as a user from ADMIN_GROUPS with a correct include query and fields query", async () => {
    const query = {
      include: ["datasets"],
      fields: ["id", "type", "datasets.pid", "datasets.keywords"],
    };
    return request(appUrl)
      .get(`/api/v4/Jobs`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        res.body[0].should.include.keys(["type", "datasets"]);
        const job = res.body.find((j) => j.id === jobId1);
        job.datasets.should.be.an("array").to.have.lengthOf(1);
        job.datasets[0].should.include.keys(["pid", "keywords"]);
        job.datasets[0].pid.should.be.an("string").and.be.equal(datasetPid1);
        res.body[0].type.should.be.equal("dataset_access");
      });
  });

  it("0040: Access jobs as a user from ADMIN_GROUPS with where filter.", async () => {
    const query = {
      where: { ownerGroup: "group1" },
      include: ["datasets"],
      fields: ["id", "type", "ownerGroup", "datasets.pid", "datasets.keywords"],
    };
    return request(appUrl)
      .get(`/api/v4/Jobs`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0].should.include.keys([
          "id",
          "type",
          "ownerGroup",
          "datasets",
        ]);
        const job = res.body.find((j) => j.id === jobId2);
        job.datasets.should.be.an("array").to.have.lengthOf(3);
        job.datasets[0].should.include.keys(["pid", "keywords"]);
      });
  });

  it("0050: Access jobs as a user from ADMIN_GROUPS with an include filter specified as all", async () => {
    const query = {
      include: ["all"],
      fields: ["id", "type", "datasets.pid", "datasets.keywords"],
    };
    return request(appUrl)
      .get(`/api/v4/Jobs`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        res.body[0].should.include.keys(["type", "datasets"]);
        const job = res.body.find((j) => j.id === jobId1);
        job.datasets.should.be.an("array").to.have.lengthOf(1);
        job.datasets[0].should.include.keys(["pid", "keywords"]);
        job.datasets[0].pid.should.be.an("string").and.be.equal(datasetPid1);
        res.body[0].type.should.be.equal("dataset_access");
      });
  });

  it("0060: Access jobs datsetDetails as a user from ADMIN_GROUPS with no fields query that should return all properties of JobClass", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        res.body[0].should.include.keys([
          "createdBy",
          "updatedBy",
          "createdAt",
          "updatedAt",
          "ownerGroup",
          "accessGroups",
          "isPublished",
          "id",
          "ownerUser",
          "type",
          "statusCode",
          "statusMessage",
          "jobParams",
          "contactEmail",
          "configVersion",
          "jobResultObject",
          "datasetDetails",
        ]);
      });
  });

  it("0070: Access jobs and datasetDetails, information should be returned based on correct access", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3); // user1 is in CreateJobPrivileged Groups, so can read any job
        const j1 = res.body.find((j) => j.id === jobId1);
        const j2 = res.body.find((j) => j.id === jobId2);
        const j3 = res.body.find((j) => j.id === jobId3);
        j1.should.include.keys(["id", "datasetDetails"]);
        j1.datasetDetails.should.be.an("array").to.have.lengthOf(1);
        const j1ds1 = j1.datasetDetails.find((d) => d.pid === datasetPid1);
        j1ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j1ds1.datablocks.should.be.an("array").to.have.lengthOf(2);
        j1ds1.datablocks
          .map((db) => db._id)
          .should.include.members([datablockId1, datablockId2]);
        j1ds1.origdatablocks.should.be.an("array").to.have.lengthOf(1);
        const [origdatablock] = j1ds1.origdatablocks;
        origdatablock.should.have.property("_id");
        origdatablock._id.should.be.eq(origDatablock1);
        j1ds1.attachments.should.be.an("array").to.have.lengthOf(1);
        const [attachments] = j1ds1.attachments;
        attachments.should.have.property("_id");
        attachments._id.should.be.eq(attachmentId);

        j2.should.include.keys(["id", "datasetDetails"]);
        j2.datasetDetails.should.be.an("array").to.have.lengthOf(2);
        const j2ds1 = j2.datasetDetails.find((d) => d.pid === datasetPid1);
        const j2ds3 = j2.datasetDetails.find((d) => d.pid === datasetPid3);
        j2ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j2ds3.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);

        j2ds1.datablocks.should.be.an("array").to.have.lengthOf(2);
        j2ds3.datablocks.should.be.an("array").to.have.lengthOf(1);
        const [datablocks] = j2ds3.datablocks;
        datablocks._id.should.be.eq(datablockId5);

        j3.should.include.keys(["id", "datasetDetails"]);
        j3.datasetDetails.should.be.an("array").to.have.lengthOf(2);
        const j3ds1 = j3.datasetDetails.find((d) => d.pid === datasetPid1);
        const j3ds3 = j3.datasetDetails.find((d) => d.pid === datasetPid3);
        j3ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j3ds3.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
      });
  });

  it("0080: Access jobs and datasetDetails, apply fields filter", async () => {
    const query = {
      fields: [
        "id",
        "datasetDetails.pid",
        "datasetDetails.datablocks._id",
        "datasetDetails.datablocks.size",
        "datasetDetails.origdatablocks._id",
        "datasetDetails.origdatablocks.chkAlg",
      ],
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        const j1 = res.body.find((j) => j.id === jobId1);
        const j2 = res.body.find((j) => j.id === jobId2);
        const j3 = res.body.find((j) => j.id === jobId3);
        j1.should.include.keys(["id", "datasetDetails"]);
        j1.datasetDetails.should.be.an("array").to.have.lengthOf(1);
        const j1ds1 = j1.datasetDetails.find((d) => d.pid === datasetPid1);
        j1ds1.should.include.keys(["pid", "datablocks", "origdatablocks"]);

        j1ds1.datablocks.should.be.an("array").to.have.lengthOf(2);
        const ds1db1 = j1ds1.datablocks.find((d) => d._id === datablockId1);
        const ds1db2 = j1ds1.datablocks.find((d) => d._id === datablockId2);
        ds1db1.should.include.keys(["_id", "size"]);
        ds1db1.size.should.be.eq(41780190);
        ds1db2.should.include.keys(["_id", "size"]);
        ds1db2.size.should.be.eq(200);

        j1ds1.origdatablocks.should.be.an("array").to.have.lengthOf(1);
        const [origdatablockDs1] = j1ds1.origdatablocks;
        origdatablockDs1.should.have.property("chkAlg");
        origdatablockDs1._id.should.be.eq(origDatablock1);
        origdatablockDs1.chkAlg.should.be.eq("Test-chkAlg");
      });
  });

  it("0090: Access jobs, datasets and instruments, that should be returned based on correct access", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        const job = res.body[0];
        job.should.have.property("id").and.be.equal(jobId3);
        job.should.include.keys(["id", "datasetDetails"]);
        job.datasetDetails.should.be.an("array").to.have.lengthOf(2);
        const ds1 = job.datasetDetails.find((d) => d.pid === datasetPid1);
        const ds3 = job.datasetDetails.find((d) => d.pid === datasetPid3);
        ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        ds1.datablocks.should.be.an("array").to.have.lengthOf(2);
        ds1.datablocks
          .map((db) => db._id)
          .should.include.members([datablockId1, datablockId2]);
        ds1.origdatablocks.should.be.an("array").to.have.lengthOf(1);
        const [origdatablockDs1] = ds1.origdatablocks;
        origdatablockDs1.should.have.property("_id");
        origdatablockDs1._id.should.be.eq(origDatablock1);

        ds3.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        ds3.datablocks.should.be.an("array").to.have.lengthOf(1);
        ds3.datablocks[0].should.have.property("_id");
        ds3.datablocks[0]._id.should.be.eq(datablockId5);
        ds1.origdatablocks.should.be.an("array").to.have.lengthOf(1);
        const [origdatablockDs2] = ds1.origdatablocks;
        origdatablockDs2.should.have.property("_id");
        origdatablockDs2._id.should.be.eq(origDatablock1);
      });
  });

  it("0100: Access jobs, datasets and instruments, that should be returned based on correct access", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3); // user3 is in UpdateJobPrivileged Groups, so can read any job
        const j1 = res.body.find((j) => j.id === jobId1);
        const j2 = res.body.find((j) => j.id === jobId2);
        const j3 = res.body.find((j) => j.id === jobId3);
        j1.should.include.keys(["id", "datasetDetails"]);
        j1.datasetDetails.should.be.an("array").to.have.lengthOf(1);
        const j1ds1 = j1.datasetDetails.find((d) => d.pid === datasetPid1); // datasetPid1 is public
        j1ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j1ds1.datablocks.should.be.an("array").to.have.lengthOf(0);
        j1ds1.origdatablocks.should.be.an("array").to.have.lengthOf(0);

        j2.should.include.keys(["id", "datasetDetails"]);
        j2.datasetDetails.should.be.an("array").to.have.lengthOf(2);
        const j2ds1 = j2.datasetDetails.find((d) => d.pid === datasetPid1);
        const j2ds2 = j2.datasetDetails.find((d) => d.pid === datasetPid2);
        j2ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j2ds2.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);

        j3.should.include.keys(["id", "datasetDetails"]);
        j3.datasetDetails.should.be.an("array").to.have.lengthOf(2);
      });
  });

  it("0110: Access jobs, datasets and instruments, that should be returned based on correct access", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/datasetDetails`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        const j1 = res.body.find((j) => j.id === jobId1);
        const j2 = res.body.find((j) => j.id === jobId2);
        const j3 = res.body.find((j) => j.id === jobId3);

        j1.should.include.keys(["id", "datasetDetails"]);
        j1.datasetDetails.should.be.an("array").to.have.lengthOf(1);
        const j1ds1 = j1.datasetDetails.find((d) => d.pid === datasetPid1); // datasetPid1 is public
        j1ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j1ds1.datablocks.should.be.an("array").to.have.lengthOf(2);
        j1ds1.datablocks
          .map((db) => db._id)
          .should.include.members([datablockId1, datablockId2]);
        j1ds1.origdatablocks.should.be.an("array").to.have.lengthOf(1);

        j2.should.include.keys(["id", "datasetDetails"]);
        j2.datasetDetails.should.be.an("array").to.have.lengthOf(3);
        const j2ds1 = j2.datasetDetails.find((d) => d.pid === datasetPid1);
        const j2ds2 = j2.datasetDetails.find((d) => d.pid === datasetPid2);
        const j2ds3 = j2.datasetDetails.find((d) => d.pid === datasetPid3);
        j2ds1.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j2ds2.should.include.keys([
          "pid",
          "datablocks",
          "origdatablocks",
          "attachments",
        ]);
        j2ds2.datablocks.should.be.an("array").to.have.lengthOf(2);
        j2ds2.datablocks
          .map((db) => db._id)
          .should.include.members([datablockId3, datablockId4]);
        j2ds2.origdatablocks.should.be.an("array").to.have.lengthOf(1);

        j2ds3.datablocks.should.be.an("array").to.have.lengthOf(1);
        j2ds3.datablocks[0].should.have.property("_id");
        j2ds3.datablocks[0]._id.should.be.eq(datablockId5);
        j2ds3.origdatablocks.should.be.an("array").to.have.lengthOf(1);

        j3.should.include.keys(["id", "datasetDetails"]);
        j3.datasetDetails.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0120: Create job with a datasetList item missing pid should return 422 and validation error", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ files: [] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
      });
  });

  it("0130: Create job with a datasetList item with empty pid should return 422 and validation error", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: "", files: [] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
      });
  });

  it("0140: Create job with a datasetList item with non-string pid should return 422 and validation error", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: 12345, files: [] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
      });
  });

  it("0150: Create job with a datasetList item with non-array files should return 422 and validation error", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: datasetPid1, files: "not-an-array" }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
      });
  });

  it("0160: Create job with a datasetList item with non-string entries in files array should return 422 and validation error", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: datasetPid1, files: [123, 456] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
      });
  });

  it("0170: Create job with multiple datasetList items where one has an invalid pid should return 422 and validation error listing the failing property", async () => {
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: "", files: [] },
          ],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("message");
        res.body.message.should.contain("Invalid dataset list.");
        res.body.message.should.contain("pid");
      });
  });
});
