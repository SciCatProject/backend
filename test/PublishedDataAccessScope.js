"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const sandbox = require("sinon").createSandbox();

let accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  idOrigDatablock = null,
  pid = null,
  pidnonpublic = null,
  attachmentId = null,
  doi = null;

const publishedData = { ...TestData.PublishedData };

const defaultStatus = "pending_registration";

const origDataBlock = { ...TestData.OrigDataBlockCorrect1 };

const testdataset = {
  ...TestData.RawCorrect,
  isPublished: true,
};

const nonpublictestdataset = {
  ...TestData.RawCorrect,
  ownerGroup: "examplenonpublicgroup",
};
describe("1601: PublishedData: Test of access scope and update guard on v3 endpoints", () => {
  let accessTokenAdmin = null,
    accessTokenArchiveManager = null,
    accessTokenUser1 = null,
    accessTokenUser2 = null,
    doiUser1 = null,
    doiUser1Registered = null,
    doiAdminRegistered = null;

  const user1PublishedData = {
    ...TestData.PublishedData,
    pidArray: [],
    title: "User1 published data",
  };

  before(async () => {
    db.collection("PublishedData").deleteMany({});

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });
  });

  afterEach((done) => {
    sandbox.restore();
    done();
  });

  it("0010: adds a published data as user1", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData")
      .send(user1PublishedData)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal(defaultStatus);
        doiUser1 = encodeURIComponent(res.body["doi"]);
      });
  });

  it("0020: should fetch the published data as its owner", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("title")
          .and.equal(user1PublishedData.title);
      });
  });

  it("0030: should not fetch the published data of another user in private state", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0040: should fetch the published data of another user as admin", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0050: should not list or count the published data of another user in private state", async () => {
    await request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
    return request(appUrl)
      .get("/api/v3/PublishedData/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.count.should.equal(0);
      });
  });

  it("0060: should list and count own published data in private state", async () => {
    await request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(1);
        res.body[0].should.have
          .property("title")
          .and.equal(user1PublishedData.title);
      });
    return request(appUrl)
      .get("/api/v3/PublishedData/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.count.should.equal(1);
      });
  });

  it("0070: should not update the published data of another user", async () => {
    await request(appUrl)
      .patch("/api/v3/PublishedData/" + doiUser1)
      .send({ title: "Updated by user2" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have
          .property("title")
          .and.equal(user1PublishedData.title);
      });
  });

  it("0080: should update own published data in private state", async () => {
    return request(appUrl)
      .patch("/api/v3/PublishedData/" + doiUser1)
      .send({ title: "Updated by user1" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("title").and.equal("Updated by user1");
      });
  });

  it("0090: should not register the published data of another user", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData/" + doiUser1 + "/register")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0100: should not resync the published data of another user", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData/" + doiUser1 + "/resync")
      .send({ ...user1PublishedData, title: "Resynced by user2" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0110: adds a published data in registered state as user1", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData")
      .send({
        ...user1PublishedData,
        title: "User1 registered published data",
        status: "registered",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal("registered");
        doiUser1Registered = encodeURIComponent(res.body["doi"]);
      });
  });

  it("0120: should not update own published data that is not in private state", async () => {
    return request(appUrl)
      .patch("/api/v3/PublishedData/" + doiUser1Registered)
      .send({ title: "Updated by user1" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0130: adds a published data in registered state as admin", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData")
      .send({
        ...user1PublishedData,
        title: "Admin registered published data",
        status: "registered",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        doiAdminRegistered = encodeURIComponent(res.body["doi"]);
      });
  });

  it("0140: should not update a registered published data as admin", async () => {
    return request(appUrl)
      .patch("/api/v3/PublishedData/" + doiAdminRegistered)
      .send({ title: "Updated by admin" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0150: should update the published data of another user in private state as admin", async () => {
    return request(appUrl)
      .patch("/api/v3/PublishedData/" + doiUser1)
      .send({ title: "Updated by admin" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("title").and.equal("Updated by admin");
      });
  });

  it("0160: should only expose registered published data anonymously", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
        res.body.forEach((publishedDataItem) => {
          publishedDataItem.should.have
            .property("status")
            .and.equal("registered");
        });
      });
  });

  it("0170: allows the archive manager to delete published data", async () => {
    await request(appUrl)
      .delete("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);

    return request(appUrl)
      .get("/api/v3/PublishedData/" + doiUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.NotFoundStatusCode);
  });

  it("0180: returns not found when deleting a missing published data record", async () => {
    return request(appUrl)
      .delete("/api/v3/PublishedData/does-not-exist")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.NotFoundStatusCode);
  });
});
