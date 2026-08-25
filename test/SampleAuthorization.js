"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenSampleIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenUser4 = null,
  accessTokenUser5 = null,
  accessTokenArchiveManager = null,

  sampleId1 = null,
  sampleId2 = null,
  sampleId3 = null,
  sampleId4 = null,
  sampleId5 = null,
  sampleId6 = null,
  sampleId7 = null,
  sampleId8 = null,
  sampleId9 = null,
  sampleId10 = null,

  attachmentId1 = null,
  attachmentId2 = null,
  attachmentId3 = null,
  attachmentId3_2 = null,
  attachmentId4 = null,
  attachmentId5 = null,
  attachmentId6 = null,
  attachmentId7 = null,
  attachmentId7_2 = null,
  attachmentId8 = null,
  attachmentId9 = null,
  attachmentId10 = null;

describe("2250: Sample Authorization", () => {
  before(async () => {
    db.collection("Sample").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenSampleIngestor = await utils.getToken(appUrl, {
      username: "sampleIngestor",
      password: TestData.Accounts["sampleIngestor"]["password"],
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    accessTokenUser4 = await utils.getToken(appUrl, {
      username: "user4",
      password: TestData.Accounts["user4"]["password"],
    });

    accessTokenUser5 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  it("0010: adds sample 1 as Admin Ingestor with owner group its own group", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 1";
    sample.ownerGroup = "adminingestor";
    sample.accessGroups = ["group5"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        res.body.should.have.property("sampleId").and.be.string;
        sampleId1 = res.body["sampleId"];
      });
  });

  it("0020: adds sample 2 as Admin Ingestor with owner group sampleingestor", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 2";
    sample.ownerGroup = "sampleingestor";
    sample.accessGroups = ["group3"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId2 = res.body["sampleId"];
      });
  });

  it("0030: adds sample 3 as Admin Ingestor with owner group as group1", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 3";
    sample.ownerGroup = "group1";
    sample.accessGroups = ["group3"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId3 = res.body["sampleId"];
      });
  });

  it("0040: adds sample 4 as Admin Ingestor with owner group as group2", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 4";
    sample.ownerGroup = "group2";
    sample.accessGroups = ["group4"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId4 = res.body["sampleId"];
      });
  });

  it("0045: adds public sample 10 as Admin Ingestor with owner group as nogroup", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 10 Public";
    sample.ownerGroup = "nogroup";
    sample.accessGroups = [];
    sample.isPublished = true;

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId10 = res.body["sampleId"];
      });
  });

  it("0050: adds sample 5 as Sample Ingestor with owner group as adminingestor", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 5";
    sample.ownerGroup = "adminingestor";
    sample.accessGroups = ["group5", "group2"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId5 = res.body["sampleId"];
      });
  });

  it("0060: adds sample 6 as Sample Ingestor with its owner group", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 6";
    sample.ownerGroup = "sampleingestor";
    sample.accessGroups = ["group1", "group4"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId6 = res.body["sampleId"];
      });
  });

  it("0070: adds sample 7 as Sample Ingestor with owner group as group1", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 7";
    sample.ownerGroup = "group1";
    sample.accessGroups = ["group2", "group3"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId7 = res.body["sampleId"];
      });
  });

  it("0080: adds sample 8 as Sample Ingestor with owner group as group2", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 8";
    sample.ownerGroup = "group2";
    sample.accessGroups = [];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId8 = res.body["sampleId"];
      });
  });

  it("0090: adds a new sample as User1 with owner group as adminingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "adminingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0100: adds a new sample as User1 with owner group as sampleingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "sampleingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0110: adds sample 9 as User1 with its owner group", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.description = "Sample 9";
    sample.ownerGroup = "group1";
    sample.accessGroups = ["group5"];

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        res.body.should.have
          .property("ownerGroup")
          .and.equal(sample.ownerGroup);
        sampleId9 = res.body["sampleId"];
      });
  });

  it("0120: adds a new sample as User1 with owner group as group2, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group2";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0130: adds a new sample as User1 with owner group as adminingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "adminingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0140: adds a new sample as User2 with owner group as sampleingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "sampleingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0150: adds a new sample as User2 with owner group as user1, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group1";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0160: adds a new sample as User2 with its owner group, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group2";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0170: adds a new sample as an unauthenticated user with owner group as adminingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "adminingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0180: adds a new sample as an unauthenticated user with owner group as sampleingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "sampleingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0190: adds a new sample as an unauthenticated user with owner group as user1, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group1";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0200: adds a new sample as an unauthenticated user with its owner group, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group2";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0210: adds a new sample as Archive Manager with owner group as adminingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "adminingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0220: adds a new sample as Archive Manager with owner group as sampleingestor, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "sampleingestor";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0230: adds a new sample as Archive Manager with owner group as user1, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group1";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0240: adds a new sample as Archive Manager with its owner group, which should fail", async () => {
    let sample = {
      ...TestData.SampleCorrect,
    };
    sample.ownerGroup = "group2";

    return request(appUrl)
      .post("/api/v3/Samples")
      .send(sample)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  function defineAttachment(caption) {
    return {
      thumbnail: TestData.AttachmentCorrect.thumbnail,
      caption: caption || TestData.AttachmentCorrect.caption,
    };
  }

  // sample attachment
  it("0250: adds attachment 1 as Admin Ingestor to sample 1", async () => {
    const attachment = defineAttachment("Sample 1");
    const sampleId = sampleId1;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("adminingestor");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId1 = res.body["id"];
      });
  });

  it("0260: adds attachment 2 as Admin Ingestor to Sample 2", async () => {
    const attachment = defineAttachment("Sample 2");
    const sampleId = sampleId2;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("sampleingestor");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId2 = res.body["id"];
      });
  });

  it("0270: adds attachment 3 as Admin Ingestor to sample 3", async () => {
    const attachment = defineAttachment("Sample 3");
    const sampleId = sampleId3;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId3 = res.body["id"];
      });
  });

  it("0280: adds attachment 4 as Admin Ingestor to sample 4", async () => {
    const attachment = defineAttachment("Sample 4");
    const sampleId = sampleId4;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group2");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId4 = res.body["id"];
      });
  });

  it("0280: adds attachment 10 as Admin Ingestor to sample 10", async () => {
    const attachment = defineAttachment("Sample 10");
    const sampleId = sampleId10;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("nogroup");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId10 = res.body["id"];
      });
  });

  it("0290: adds attachment 5 as Sample Ingestor to sample 5", async () => {
    const attachment = defineAttachment("Sample 5");
    const sampleId = sampleId5;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("adminingestor");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId5 = res.body["id"];
      });
  });

  it("0300: adds attachment 6 as Sample Ingestor to sample 6", async () => {
    const attachment = defineAttachment("Sample 6");
    const sampleId = sampleId6;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("sampleingestor");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId6 = res.body["id"];
      });
  });

  it("0310: adds attachment 7 as Sample Ingestor to sample 7", async () => {
    const attachment = defineAttachment("Sample 7");
    const sampleId = sampleId7;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId7 = res.body["id"];
      });
  });

  it("0320: adds attachment 8 as Sample Ingestor to sample 8", async () => {
    const attachment = defineAttachment("Sample 8");
    const sampleId = sampleId8;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group2");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId8 = res.body["id"];
      });
  });

  it("0330: adds an attachment as User 1 to sample 1 , which should fail", async () => {
    const attachment = defineAttachment("Sample 1 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId1 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0340: adds an attachment as User 1 to sample 2 , which should fail", async () => {
    const attachment = defineAttachment("Sample 2 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId2 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0345: adds attachment 3_2 as User 1 to sample 3", async () => {
    const attachment = defineAttachment("Sample 3, attachment 2");
    const sampleId = sampleId3;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId3_2 = res.body["id"];
      });
  });

  it("0350: adds an attachment as User 1 to sample 4, which should fail", async () => {
    const attachment = defineAttachment("Sample 4 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId4 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0355: adds attachment 7_2 as User 1 to sample 7", async () => {
    const attachment = defineAttachment("Sample 7, attachment 2");
    const sampleId = sampleId7;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId7_2 = res.body["id"];
      });
  });

  it("0360: adds attachment 9 as User 1 to sample 9", async () => {
    const attachment = defineAttachment("Sample 9");
    const sampleId = sampleId9;

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId9 = res.body["id"];
      });
  });

  it("0370: adds an attachment as User 2 to sample 1, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId1 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0380: adds an attachment as User 2 to sample 2, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId2 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0390: adds an attachment as User 2 to sample 3, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId3 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0400: adds an attachment as User 2 to sample 4, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId4 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0410: adds an attachment as an unauthenticated user to sample 1, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId1 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0420: adds an attachment as an unauthenticated user to sample 2, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId2 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0430: adds an attachment as an unauthenticated user to sample 3, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId3 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0440: adds an attachment as an unauthenticated user to sample 4, which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId4 + "/attachments")
      .send(TestData.AttachmentCorrect)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("0450: adds an attachment as Archive Manager to sample 1, which should fail", async () => {
    const attachment = defineAttachment("Sample 1 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId1 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0460: adds an attachment as Archive Manager to sample 2, which should fail", async () => {
    const attachment = defineAttachment("Sample 2 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId2 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0470: adds an attachment as Archive Manager to sample 3, which should fail", async () => {
    const attachment = defineAttachment("Sample 3 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId3 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0480: adds an attachment as Archive Manager to sample 4, which should fail", async () => {
    const attachment = defineAttachment("Sample 4 which should fail");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId4 + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  // -------------------------------
  // access samples list
  //
  it("0490: fetch all samples as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(10);
      });
  });

  it("0500: fetch all samples with owner group as adminingestor as Admin Ingestor", async () => {
    const filter = {
      where: {
        ownerGroup: "adminingestor",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(2);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId1, sampleId5]);
        });
      });
  });

  it("0510: fetch all samples with owner group as group1 as Admin Ingestor", async () => {
    const filter = {
      where: {
        ownerGroup: "group1",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(3);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId3, sampleId7, sampleId9]);
        });
      });
  });

  it("0520: fetch all samples as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(3);
      });
  });

  it("0530: fetch all samples with owner group as sampleingestor as Sample Ingestor", async () => {
    const filter = {
      where: {
        ownerGroup: "sampleingestor",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(2);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId2, sampleId6]);
        });
      });
  });

  it("0540: fetch all samples with owner group as group1 as Sample Ingestor", async () => {
    const filter = {
      where: {
        ownerGroup: "group1",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(0);
      });
  });

  it("0550: fetch all samples as User 1 (Group 1)", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(5);
      });
  });

  it("0560: fetch all samples with owner group as group1 as User 1", async () => {
    const filter = {
      where: {
        ownerGroup: "group1",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.a("array").and.to.have.length(3);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId3, sampleId7, sampleId9]);
        });
      });
  });

  it("0560: fetch all samples with owner group as group2 as User 1", async () => {
    const filter = {
      where: {
        ownerGroup: "group2",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(0);
      });
  });

  it("0570: fetch all samples as User 2 (Group 2)", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(5);
      });
  });

  it("0580: fetch all samples with owner group as group2 as User 2", async () => {
    const filter = {
      where: {
        ownerGroup: "group2",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(2);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId4, sampleId8]);
        });
      });
  });

  it("0590: fetch all samples with owner group as nogroup as User 2", async () => {
    const filter = {
      where: {
        ownerGroup: "nogroup",
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(1);
        res.body.forEach((e) => {
          e.should.have.deep.property("sampleId");
          e.sampleId.should.be.oneOf([sampleId10]);
        });
      });
  });

  it("0600: fetch all samples as User 3 (Group 3)", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(4);
      });
  });

  it("0610: fetch all samples as User 4 (Group 4)", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(3);
      });
  });

  it("0620: fetch all samples as User 5 (Group 5)", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(4);
      });
  });

  it("0630: fetch all samples as unauthenticated user", async () => {
    return request(appUrl)
      .get("/api/v3/Samples")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.to.have.length(1);
        res.body.forEach((e) => {
          e.should.have.deep.property("isPublished");
          e.isPublished.should.be.equal(true);
        });
      });
  });

  // -------------------------------
  // access samples via findOne
  //
  it("0631: fetch sample 1 via findOne as its owner (Admin Ingestor)", async () => {
    const filter = {
      where: {
        sampleId: sampleId1,
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples/findOne?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId1);
      });
  });

  it("0632: fetch sample 1 via findOne as User 2, who has no access, should return nothing", async () => {
    const filter = {
      where: {
        sampleId: sampleId1,
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples/findOne?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.be.an("object").and.to.be.deep.equal({});
      });
  });

  it("0633: fetch sample 5 via findOne as User 2, who has access through accessGroups", async () => {
    const filter = {
      where: {
        sampleId: sampleId5,
      },
    };

    return request(appUrl)
      .get(
        `/api/v3/Samples/findOne?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId5);
      });
  });

  // -----------------------
  // Access individual sample
  //
  it("0640: access sample 1 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId1);
      });
  });

  it("0641: check Admin Ingestor access to public sample 1 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0645: fetch all attachments for sample 1 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0650: access sample 2 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId2);
      });
  });

  it("0655: fetch all attachments for sample 2 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0660: access sample 3 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId3);
      });
  });

  it("0665: fetch all attachments for sample 3 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("0660: access sample 4 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId4);
      });
  });

  it("0665: fetch all attachments for sample 4 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0670: access sample 5 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId5);
      });
  });

  it("0675: fetch all attachments for sample 5 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0680: access sample 6 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId6);
      });
  });

  it("0685: fetch all attachments for sample 6 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0690: access sample 7 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId7);
      });
  });

  it("0695: fetch all attachments for sample 7 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("0700: access sample 8 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId8);
      });
  });

  it("0705: fetch all attachments for sample 8 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0710: access sample 9 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId9);
      });
  });

  it("0715: fetch all attachments for sample 9 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0720: access public sample 10 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("0725: fetch all attachments for public sample 10 as Admin Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0730: access sample 1 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0731: check Sample Ingestor access to sample 1 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("0735: fetch all attachments for sample 1 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0740: access sample 2 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId2);
      });
  });

  it("0741: check Sample Ingestor access to sample 2 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0745: fetch all attachments for sample 2 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0750: access sample 3 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0755: fetch all attachments for sample 3 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0760: access sample 4 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0765: fetch all attachments for sample 4 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0770: access sample 5 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0775: fetch all attachments for sample 5 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0780: access sample 6 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId6);
      });
  });

  it("0785: fetch all attachments for sample 6 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0790: access sample 7 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0795: fetch all attachments for sample 7 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0800: access sample 8 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0805: fetch all attachments for sample 8 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0810: access sample 9 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0815: fetch all attachments for sample 9 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0820: access public sample 10 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("0825: fetch all attachments for sample 10 as Sample Ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0830: access sample 1 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0831: check User 1 access to sample 2 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("0835: fetch all attachments for sample 1 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0840: access sample 2 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0845: fetch all attachments for sample 2 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0850: access sample 3 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId3);
      });
  });

  it("0851: check User 1 access to sample 3 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0855: fetch all attachments for sample 3 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("0860: access sample 4 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0865: fetch all attachments for sample 4 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0870: access sample 5 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0875: fetch all attachments for sample 5 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0880: access sample 6 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId6);
      });
  });

  it("0885: fetch all attachments for sample 6 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0890: access sample 7 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId7);
      });
  });

  it("0895: fetch all attachments for sample 7 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("0900: access sample 8 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0905: fetch all attachments for sample 8 as User 1, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0910: access sample 9 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId9);
      });
  });

  it("0915: fetch all attachments for sample 9 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0920: access public sample 10 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("0925: fetch all attachments for sample 10 as User 1", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0930: access sample 1 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0935: fetch all attachments for sample 1 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0940: access sample 2 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0945: fetch all attachments for sample 2 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0950: access sample 3 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0955: fetch all attachments for sample 3 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0960: access sample 4 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId4);
      });
  });

  it("0965: fetch all attachments for sample 4 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0970: access sample 5 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId5);
      });
  });

  it("0975: fetch all attachments for sample 5 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("0980: access sample 6 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0985: fetch all attachments for sample 6 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0990: access sample 7 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId7);
      });
  });

  it("0995: fetch all attachments for sample 7 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("1000: access sample 8 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId8);
      });
  });

  it("1005: fetch all attachments for sample 8 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1010: access sample 9 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1015: fetch all attachments for sample 8 as User 2, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1020: access public sample 10 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1025: fetch all attachments for sample 10 as User 2", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1030: access sample 1 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1035: fetch all attachments for sample 1 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1040: access sample 2 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId2);
      });
  });

  it("1045: fetch all attachments for sample 2 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1050: access sample 3 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId3);
      });
  });

  it("1055: fetch all attachments for sample 3 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("1060: access sample 4 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1065: fetch all attachments for sample 4 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1070: access sample 5 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1075: fetch all attachments for sample 5 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1080: access sample 6 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1085: fetch all attachments for sample 6 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1090: access sample 7 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId7);
      });
  });

  it("1095: fetch all attachments for sample 7 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(2);
      });
  });

  it("1100: access sample 8 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1105: fetch all attachments for sample 8 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1110: access sample 9 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1115: fetch all attachments for sample 9 as User 3, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1120: access public sample 10 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1125: fetch all attachments for sample 10 as User 3", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1130: access sample 1 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1135: fetch all attachments for sample 1 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1140: access sample 2 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1145: fetch all attachments for sample 2 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1150: access sample 3 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1155: fetch all attachments for sample 3 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1160: access sample 4 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId4);
      });
  });

  it("1165: fetch all attachments for sample 4 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1170: access sample 5 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1175: fetch all attachments for sample 5 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1180: access sample 6 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId6);
      });
  });

  it("1185: fetch all attachments for sample 6 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1190: access sample 7 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1195: fetch all attachments for sample 7 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1200: access sample 8 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1205: fetch all attachments for sample 8 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1210: access sample 9 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1215: fetch all attachments for sample 9 as User 4, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1220: access public sample 10 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1225: fetch all attachments for sample 10 as User 4", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1230: access sample 1 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId1);
      });
  });

  it("1235: fetch all attachments for sample 1 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1240: access sample 2 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1245: fetch all attachments for sample 2 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1250: access sample 3 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1255: fetch all attachments for sample 3 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1260: access sample 4 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1265: fetch all attachments for sample 4 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1270: access sample 5 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId5);
      });
  });

  it("1275: fetch all attachments for sample 5 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1280: access sample 6 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1285: fetch all attachments for sample 6 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1290: access sample 7 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1295: fetch all attachments for sample 7 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1300: access sample 8 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1305: fetch all attachments for sample 8 as User 5, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("1310: access sample 9 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId9);
      });
  });

  it("1315: fetch all attachments for sample 9 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1320: access public sample 10 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1325: fetch all attachments for sample 10 as User 5", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1330: access sample 1 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1331: check unauthenticated user access to sample 1 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/authorization")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("1335: fetch all attachments for sample 1 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1340: access sample 2 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1345: fetch all attachments for sample 2 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1350: access sample 3 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1355: fetch all attachments for sample 5 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1360: access sample 4 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1365: fetch all attachments for sample 4 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1370: access sample 5 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1375: fetch all attachments for sample 5 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1380: access sample 6 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1385: fetch all attachments for sample 6 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1390: access sample 7 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1395: fetch all attachments for sample 7 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1400: access sample 8 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1405: fetch all attachments for sample 8 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1410: access sample 9 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1415: fetch all attachments for sample 9 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1420: access public sample 10 as Unauthenticated User", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1421: check unauthenticated user access to public sample 10 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/authorization")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("1425: fetch all attachments for sample 10 as Unauthenticated User", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10 + "/attachments")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(1);
      });
  });

  it("1430: access sample 1 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1435: fetch all attachments for sample 5 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId1 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1440: access sample 2 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1445: fetch all attachments for sample 2 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId2 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1450: access sample 3 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1455: fetch all attachments for sample 5 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId3 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1460: access sample 4 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1465: fetch all attachments for sample 4 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId4 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1470: access sample 5 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1475: fetch all attachments for sample 5 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1480: access sample 6 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });
  it("1485: fetch all attachments for sample 6 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId6 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1490: access sample 7 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1495: fetch all attachments for sample 7 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1500: access sample 8 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1505: fetch all attachments for sample 8 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId8 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1510: access sample 9 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1515: fetch all attachments for sample 9 as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId5 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("1520: access public sample 10 as Archive Manager", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleId").and.be.equal(sampleId10);
      });
  });

  it("1525: fetch all attachments for sample 10 as Archive Manager", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId7 + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  // modify sample
  it("2000: update sample characteristic for sample 1 as Admin Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2000",
        user: "Admin Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId1)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2010: update sample characteristic for sample 2 as Admin Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2010",
        user: "Admin Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId2)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2020: update sample characteristic for sample 5 as Admin Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2020",
        user: "Admin Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId5)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2030: update sample characteristic for sample 6 as Admin Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2030",
        user: "Admin Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId6)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2040: update sample characteristic for sample 1 as Sample Ingestor, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2040",
        user: "Sample Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId1)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2050: update sample characteristic for sample 2 as Sample Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2050",
        user: "Sample Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId2)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2060: update sample characteristic for sample 5 as Sample Ingestor, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2060",
        user: "Sample Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId5)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2070: update sample characteristic for sample 6 as Sample Ingestor", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2070",
        user: "Sample Ingestor",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId6)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2080: update sample characteristic for sample 2 as User 1, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2080",
        user: "User 1",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId2)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2090: update sample characteristic for sample 3 as User 1", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2090",
        user: "User 1",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId3)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2100: update sample characteristic for sample 6 as User 1, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2100",
        user: "User 1",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId6)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2110: update sample characteristic for sample 7 as User 1", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2110",
        user: "User 1",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId7)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2120: update sample characteristic for sample 9 as User 1", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2120",
        user: "User 1",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId9)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("sampleCharacteristics");
        res.body.sampleCharacteristics.should.have
          .property("test")
          .and.be.equal(characteristics["test"]);
      });
  });

  it("2130: update sample characteristic for sample 3 as User 2, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2130",
        user: "User 2",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId2)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2140: update sample characteristic for sample 4 as User 2, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2140",
        user: "User 2",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId4)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2150: update sample characteristic for sample 5 as User 2, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2150",
        user: "User 2",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId5)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2160: update sample characteristic for sample 3 as User 3, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2160",
        user: "User 3",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId3)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2170: update sample characteristic for sample 4 as User 3, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2170",
        user: "User 3",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId4)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2180: update sample characteristic for public sample 10 as User 3, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2180",
        user: "User 3",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId10)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2190: update sample characteristic for sample 4 as User 4, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2190",
        user: "User 4",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId4)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2200: update sample characteristic for sample 5 as User 4, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2200",
        user: "User 4",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId5)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2210: update sample characteristic for public sample 10 as User 4, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2210",
        user: "User 4",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId10)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2220: update sample characteristic for sample 5 as User 5, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2220",
        user: "User 5",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId5)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2230: update sample characteristic for sample 6 as User 5, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2230",
        user: "User 5",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId6)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2240: update sample characteristic for public sample 10 as User 5, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2240",
        user: "User 5",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId10)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2250: update sample characteristic for sample 1 as Archive Manager, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2250",
        user: "Archive Manager",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId1)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2260: update sample characteristic for public sample 10 as Archive Manager, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2260",
        user: "Archive Manager",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId10)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("2270: update sample characteristic for sample 1 as Unauthenticated User, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2270",
        user: "Unauthenticated User",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId1)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("2280: update sample characteristic for public sample 10 as Unauthenticated User, which should fail", async () => {
    const characteristics = {
      ...TestData.SampleCorrect["sampleCharacteristics"],
      ...{
        test: "2280",
        user: "Unauthenticated User",
      },
    };

    return request(appUrl)
      .patch("/api/v3/Samples/" + sampleId10)
      .send({ sampleCharacteristics: characteristics })
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  // delete sample attachment
  it("4000: delete attachment 1 from sample 1 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1 + "/attachments/" + attachmentId1)
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("4010: delete attachment 10 from sample 10 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .expect(TestData.CreationUnauthorizedStatusCode);
  });

  it("4020: delete attachment 1 from sample 1 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1 + "/attachments/" + attachmentId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4030: delete attachment 2 from sample 2 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2 + "/attachments/" + attachmentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4040: delete attachment 10 from sample 10 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4050: delete attachment 2 from sample 2 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2 + "/attachments/" + attachmentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4060: delete attachment 4 from sample 4 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4 + "/attachments/" + attachmentId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4070: delete attachment 10 from sample 10 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4080: delete attachment 2 from sample 2 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2 + "/attachments/" + attachmentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4090: delete attachment 4 from sample 4 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4 + "/attachments/" + attachmentId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4100: delete attachment 10 from sample 10 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4110: delete attachment 3 from sample 3 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId3 + "/attachments/" + attachmentId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4120: delete attachment 4 from sample 4 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4 + "/attachments/" + attachmentId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4130: delete attachment 5 from sample 5 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId5 + "/attachments/" + attachmentId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4140: delete attachment 10 from sample 10 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4150: delete attachment 3 from sample 3 as User 1", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId3 + "/attachments/" + attachmentId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4160: delete attachment 4 from sample 4 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4 + "/attachments/" + attachmentId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4170: delete attachment 6 from sample 6 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId6 + "/attachments/" + attachmentId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4180: delete attachment 9 from sample 9 as User 1", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId9 + "/attachments/" + attachmentId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4190: delete attachment 10 from sample 10 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4200: delete attachment 2 from sample 2 as Sample Ingestor", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2 + "/attachments/" + attachmentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4210: delete attachment 5 from sample 5 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId5 + "/attachments/" + attachmentId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4220: delete attachment 7 from sample 7 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId7 + "/attachments/" + attachmentId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4230: delete attachment 8 from sample 8 as Sample Ingestor, wich should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId8 + "/attachments/" + attachmentId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("4240: delete attachment 1 from sample 1 as Admin Ingestor", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1 + "/attachments/" + attachmentId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4250: delete attachment 3_2 from sample 3 as Admin Ingestor", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId3 + "/attachments/" + attachmentId3_2,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4260: delete attachment 6 from sample 6 as Admin Ingestor", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId6 + "/attachments/" + attachmentId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4270: delete attachment 4 from sample 4 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4 + "/attachments/" + attachmentId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4280: delete attachment 7_2 from sample 7 as Archive Manager", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId7 + "/attachments/" + attachmentId7_2,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("4290: delete attachment 10 from sample 10 as Archive Manager", async () => {
    return request(appUrl)
      .delete(
        "/api/v3/samples/" + sampleId10 + "/attachments/" + attachmentId10,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  // delete sample
  it("5000: delete sample 1 as Admin Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5010: delete sample 2 as Admin Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5020: delete public sample 10 as Admin Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5030: delete sample 1 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5040: delete sample 2 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5050: delete public sample 10 as Sample Ingestor, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenSampleIngestor}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5060: delete sample 2 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5070: delete sample 3 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5080: delete sample 6 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5090: delete public sample 10 as User 1, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5000: delete sample 3 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5010: delete sample 4 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5020: delete sample 5 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5030: delete public sample 10 as User 2, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5040: delete sample 1 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5050: delete sample 2 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5060: delete public sample 10 as User 3, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5070: delete sample 1 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5080: delete sample 4 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5090: delete public sample 10 as User 4, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5100: delete sample 2 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5110: delete sample 5 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5120: delete public sample 10 as User 5, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser5}` })
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5130: delete sample 1 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5140: delete public sample 10 as Unauthenticated User, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .expect(TestData.DeleteForbiddenStatusCode);
  });

  it("5150: delete sample 1 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5160: delete sample 2 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5170: delete sample 3 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5180: delete sample 4 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5190: delete sample 5 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5200: delete sample 6 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5210: delete sample 7 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId7)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5220: delete sample 8 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId8)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5230: delete sample 9 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId9)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("5240: delete public sample 10 as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v3/samples/" + sampleId10)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
