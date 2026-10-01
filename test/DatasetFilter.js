"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const sandbox = require("sinon").createSandbox();

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenArchiveManager = null,
  datasetPid1 = null,
  encodedDatasetPid1 = null,
  datasetPid2 = null,
  encodedDatasetPid2 = null,
  datasetPid3 = null,
  datasetDate3 = null,
  encodedDatasetPid3 = null,
  datasetPid4 = null,
  datasetDate4 = null,
  encodedDatasetPid4 = null,
  datasetPidAuth1 = null,
  datasetPidAuth2 = null,
  datasetPidSpecial = null,
  encodedDatasetPidSpecial = null,
  datasetPidNested = null,
  encodedDatasetPidNested = null;

const RawCorrect1 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    ...TestData.RawCorrect.scientificMetadata,
    test_field_1: {
      value: 5,
      unit: "",
    },
  },
  datasetName: "This is the first correct test raw dataset",
  description:
    "There was no ice cream in the freezer, nor did they have money to go to the store. Part of the first two datasets",
  isPublished: true,
  ownerGroup: "group1",
  accessGroups: ["group5"],
};

const RawCorrect2 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    ...TestData.RawCorrect.scientificMetadata,
    test_field_1: {
      value: 5,
      unit: "",
    },
  },
  datasetName: "This is the second correct test raw dataset",
  description:
    "There was no telling what thoughts would come from the machine. Part of the first two datasets",
  isPublished: false,
  ownerGroup: "group2",
  accessGroups: ["group6"],
};

const RawCorrect3 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    ...TestData.RawCorrect.scientificMetadata,
    test_field_1: {
      value: 6,
      unit: "",
    },
    test_field_string: {
      value: "test_string_value",
      unit: "",
    },
  },
  datasetName: "This is the third correct test raw dataset",
  description:
    "The opportunity of a lifetime passed before him as he tried to decide between a cone or a cup. Last and third dataset",
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: ["group6"],
};

const RawCorrect4 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    ...TestData.RawCorrect.scientificMetadata,
    test_field_1: {
      value: 7,
      unit: "",
    },
  },
  datasetName: "This is the fourth correct test dataset, and it is raw",
  description:
    "After coating myself in vegetable oil I found my success rate skyrocketed",
  isPublished: false,
  ownerGroup: "group4",
  accessGroups: ["group6"],
};

const RawCorrectWithSpecialMetadataKeys = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    "test field1": {
      value: "test value",
      unit: "",
    },
    "test.field2": {
      value: "test value",
      unit: "",
    },
  },
  datasetName: "Dataset with special characters in metadata keys",
  ownerGroup: "group4",
  accessGroups: ["group6"],
};

const RawCorrectWithNestedMetadata = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    "experiment test": {
      "nested test1": {
        value: "Test Value 1",
        unit: "",
        type: "string",
      },
      "nested.test2": {
        value: "Test Value 2",
        unit: "",
        type: "string",
      },
    },
    regular_field: {
      value: 1,
      unit: "",
    },
  },
  datasetName: "Dataset with nested metadata",
  description:
    "Testing nested metadata with spaces and dot in keys that need encoding",
  isPublished: false,
  ownerGroup: "group4",
  accessGroups: ["group6"],
};

const RawCorrectGroup1 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    run_number: { value: 25, unit: "" },
  },
  ownerGroup: "group1",
  accessGroups: [],
  isPublished: false,
};

const RawCorrectGroup2 = {
  ...TestData.RawCorrect,
  scientificMetadata: {
    run_number: { value: 30, unit: "" },
  },
  ownerGroup: "group2",
  accessGroups: [],
  isPublished: false,
};

describe("0400: DatasetFilter: Test retrieving datasets using filtering capabilities", () => {
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

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  afterEach((done) => {
    sandbox.restore();
    done();
  });

  it("0010: adds dataset 1", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("ownerGroup")
          .and.equal(RawCorrect1.ownerGroup);
        res.body.should.have.property("type").and.equal(RawCorrect1.type);
        res.body.should.have
          .property("isPublished")
          .and.equal(RawCorrect1.isPublished);
        res.body.should.have.property("pid").and.be.string;
        datasetPid1 = res.body["pid"];
        encodedDatasetPid1 = encodeURIComponent(datasetPid1);
      });
  });

  it("0020: adds dataset 2", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("ownerGroup")
          .and.equal(RawCorrect2.ownerGroup);
        res.body.should.have.property("type").and.equal(RawCorrect2.type);
        res.body.should.have
          .property("isPublished")
          .and.equal(RawCorrect2.isPublished);
        res.body.should.have.property("pid").and.be.string;
        datasetPid2 = res.body["pid"];
        encodedDatasetPid2 = encodeURIComponent(datasetPid2);
      });
  });

  it("0030: adds dataset 3", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrect3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("ownerGroup")
          .and.equal(RawCorrect3.ownerGroup);
        res.body.should.have.property("type").and.equal(RawCorrect3.type);
        res.body.should.have
          .property("isPublished")
          .and.equal(RawCorrect3.isPublished);
        res.body.should.have.property("pid").and.be.string;
        datasetPid3 = res.body["pid"];
        datasetDate3 = res.body["createdAt"];
        encodedDatasetPid3 = encodeURIComponent(datasetPid3);
      });
  });

  it("0040: adds dataset 4", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrect4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("ownerGroup")
          .and.equal(RawCorrect4.ownerGroup);
        res.body.should.have.property("type").and.equal(RawCorrect4.type);
        res.body.should.have
          .property("isPublished")
          .and.equal(RawCorrect4.isPublished);
        res.body.should.have.property("pid").and.be.string;
        datasetPid4 = res.body["pid"];
        datasetDate4 = res.body["createdAt"];
        encodedDatasetPid4 = encodeURIComponent(datasetPid4);
      });
  });

  it("0050: retrieve single dataset by its name", async () => {
    const query = { where: { datasetName: RawCorrect1.datasetName } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid1);
      });
  });

  it('0060: retrieve datasets with "correct test raw" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it('0070: count how many datasets with "correct test raw" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(3);
      });
  });

  it('0080: retrieve one dataset with "correct test raw" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([
          datasetPid1,
          datasetPid2,
          datasetPid3,
        ]);
      });
  });

  it('0090: retrieve datasets with "correct test raw" in dataset name using mongo regex operator', async () => {
    const query = { where: { datasetName: { $regex: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it('0100: count how many datasets with "correct test raw" in dataset name using mongo regex operator', async () => {
    const query = { where: { datasetName: { $regex: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(3);
      });
  });

  it('0110: retrieve one datasets with "correct test raw" in dataset name using mongo regex operator', async () => {
    const query = { where: { datasetName: { $regex: "correct test raw" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([
          datasetPid1,
          datasetPid2,
          datasetPid3,
        ]);
      });
  });

  it('0120: retrieve datasets with "third correct" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0123: retrieve datasets with "third correct" in dataset name using loopback style "gte" operator', async () => {
    const query = { where: { createdAt: { gte: datasetDate3 } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.equal(datasetPid3);
        res.body[1]["pid"].should.be.equal(datasetPid4);
      });
  });

  it('0126: retrieve 3rd and 4th datasets using loopback style "gte" operator', async () => {
    const query = { where: { createdAt: { gte: datasetDate4 } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid4);
      });
  });

  it('0129: retrieve datasets 4th using loopback style "lte" operator', async () => {
    const query = { where: { createdAt: { lte: new Date().toISOString() } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(4);
      });
  });

  it('0130: retrieve one dataset with "third correct" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0140: count how many datasets with "third correct" in dataset name using loopback style "like" operator', async () => {
    const query = { where: { datasetName: { like: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(1);
      });
  });

  it('0150: retrieve datasets with "third correct" in dataset name using mongo "regex" operator', async () => {
    const query = { where: { datasetName: { $regex: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0160: retrieve one dataset with "third correct" in dataset name using mongo "regex" operator', async () => {
    const query = { where: { datasetName: { $regex: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0170: count how many datasets with "third correct" in dataset name using mongo "regex" operator', async () => {
    const query = { where: { datasetName: { $regex: "third correct" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(1);
      });
  });

  it('0180: retrieve datasets with "Part of the first two dataset" in description using loopback style "like" operator', async () => {
    const query = {
      where: { description: { like: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
        res.body[1]["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
      });
  });

  it('0190: retrieve one dataset with "Part of the first two dataset" in description using loopback style "like" operator', async () => {
    const query = {
      where: { description: { like: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
      });
  });

  it('0200: count how many datasets with "Part of the first two dataset" in description using loopback style "like" operator', async () => {
    const query = {
      where: { description: { like: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(2);
      });
  });

  it('0210: retrieve datasets with "Part of the first two dataset" in description using "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
        res.body[1]["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
      });
  });

  it('0220: retrieve one dataset with "Part of the first two dataset" in description using mongo "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([datasetPid1, datasetPid2]);
      });
  });

  it('0230: count how many datasets with "Part of the first two dataset" in description using mongo "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "Part of the first two datasets" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(2);
      });
  });

  it('0240: retrieve datasets with "lifetime passed" in description using loopback style "like" operator', async () => {
    const query = { where: { description: { like: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0250: retrieve one dataset with "lifetime passed" in description using loopback style "like" operator', async () => {
    const query = { where: { description: { like: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0260: count how many datasets with "lifetime passed" in description using loopback style "like" operator', async () => {
    const query = { where: { description: { like: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(1);
      });
  });

  it('0270: retrieve datasets with "lifetime passed" in description using "regex" operator', async () => {
    const query = { where: { description: { $regex: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0280: retrieve one dataset with "lifetime passed" in description using "regex" operator', async () => {
    const query = { where: { description: { $regex: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(datasetPid3);
      });
  });

  it('0290: count how many datasets with "lifetime passed" in description using "regex" operator', async () => {
    const query = { where: { description: { $regex: "lifetime passed" } } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(1);
      });
  });

  it('0300: retrieve datasets with "second" or "third" together with "dataset" in description using "regex" operator', async () => {
    const query = {
      where: { datasetName: { $regex: "(second|third).*dataset" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.oneOf([datasetPid2, datasetPid3]);
        res.body[1]["pid"].should.be.oneOf([datasetPid2, datasetPid3]);
      });
  });

  it('0310: retrieve one dataset with "second" or "third" together with "dataset" in description using "regex" operator', async () => {
    const query = {
      where: { datasetName: { $regex: "(second|third).*dataset" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([datasetPid2, datasetPid3]);
      });
  });

  it('0320: count how many datasets with "second" or "third" together with "dataset" in description using "regex" operator', async () => {
    const query = {
      where: { datasetName: { $regex: "(second|third).*dataset" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(2);
      });
  });

  it('0330: retrieve datasets with "cream" and "money" or "opportunity" and "decide" in description using "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "(cream.*money|opportunity.*decide)" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.oneOf([datasetPid1, datasetPid3]);
        res.body[1]["pid"].should.be.oneOf([datasetPid1, datasetPid3]);
      });
  });

  it('0340: retrieve one dataset with "cream" and "money" or "opportunity" and "decide" in description using "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "(cream.*money|opportunity.*decide)" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([datasetPid1, datasetPid3]);
      });
  });

  it('0350: count how many datasets with "cream" and "money" or "opportunity" and "decide" in description using "regex" operator', async () => {
    const query = {
      where: { description: { $regex: "(cream.*money|opportunity.*decide)" } },
    };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["count"].should.be.equal(2);
      });
  });

  it("0360: Adding GREATER_THAN condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        { lhs: "test_field_1", relation: "GREATER_THAN", rhs: 1, unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(4);
      });
  });

  it("0370: Adding LESS_THAN condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        { lhs: "test_field_1", relation: "LESS_THAN", rhs: 6, unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(2);
      });
  });

  it("0380: Adding EQUAL_TO_NUMERIC condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        { lhs: "test_field_1", relation: "EQUAL_TO_NUMERIC", rhs: 6, unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(1);
      });
  });

  it("0390: Adding EQUAL_TO_STRING condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        {
          lhs: "test_field_string",
          relation: "EQUAL_TO_STRING",
          rhs: "test_string_value",
          unit: "",
        },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(1);
      });
  });

  it("0400: Adding GREATER_THAN_OR_EQUAL condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        {
          lhs: "test_field_1",
          relation: "GREATER_THAN_OR_EQUAL",
          rhs: 5,
          unit: "",
        },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(4);
      });
  });

  it("0410: Adding LESS_THAN_OR_EQUAL condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        {
          lhs: "test_field_1",
          relation: "LESS_THAN_OR_EQUAL",
          rhs: 6,
          unit: "",
        },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(3);
      });
  });

  it("0420: Adding RANGE condition on the fullquery endpoint should work", async () => {
    const fields = {
      mode: {},
      scientific: [
        { lhs: "test_field_1", relation: "RANGE", rhs: [5, 7], unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(1);
      });
  });

  it("0425: Should return informative error on malfored json is passed in filter", async () => {
    const query = { where: { datasetName: { like: "correct test raw" } } };
    const malformedJson = JSON.stringify(query).replace("}", "},");

    return request(appUrl)
      .get(`/api/v3/datasets`)
      .query({ filter: malformedJson })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("message")
          .and.be.equal(
            "Invalid JSON in filter: Expected double-quoted property name in JSON at position 52 (line 1 column 53)",
          );
      });
  });
  it("0430: should delete dataset 1", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0440: should delete dataset 2", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0450: should delete dataset 3", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0460: should delete dataset 4", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPid4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0500: adds dataset with special characters in metadata keys", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrectWithSpecialMetadataKeys)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("pid").and.be.string;
        datasetPidSpecial = res.body["pid"];
        encodedDatasetPidSpecial = encodeURIComponent(datasetPidSpecial);
      });
  });

  it("0510: retrieve dataset and verify metadata keys are decoded", async () => {
    return request(appUrl)
      .get("/api/v3/datasets/" + encodedDatasetPidSpecial)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("scientificMetadata");
        res.body["scientificMetadata"].should.have.property("test field1");
        res.body["scientificMetadata"].should.have.property("test.field2");
      });
  });

  it("0520: update dataset and verify metadata keys are decoded", async () => {
    const update = {
      scientificMetadata: {
        "test field1 updated": {
          value: "test value",
          unit: "",
        },
        "test.field2.updated": {
          value: "test value",
          unit: "",
        },
      },
    };
    return request(appUrl)
      .patch("/api/v3/datasets/" + encodedDatasetPidSpecial)
      .send(update)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("scientificMetadata");
        res.body["scientificMetadata"].should.have.property(
          "test field1 updated",
        );
        res.body["scientificMetadata"].should.have.property(
          "test.field2.updated",
        );
      });
  });

  it("0530: should delete dataset with special characters in metadata keys", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPidSpecial)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0600: adds dataset with nested metadata keys", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrectWithNestedMetadata)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("ownerGroup")
          .and.equal(RawCorrectWithNestedMetadata.ownerGroup);
        res.body.should.have.property("pid").and.be.string;
        datasetPidNested = res.body["pid"];
        encodedDatasetPidNested = encodeURIComponent(datasetPidNested);
      });
  });

  it("0610: retrieve dataset and verify nested metadata keys are decoded", async () => {
    return request(appUrl)
      .get("/api/v3/datasets/" + encodedDatasetPidNested)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const metadata = res.body.scientificMetadata;

        metadata.should.have.property("experiment test");
        metadata["experiment test"].should.have.property("nested test1");
        metadata["experiment test"].should.have.property("nested.test2");
      });
  });

  it("0620: update dataset and verify nested metadata keys are decoded", async () => {
    const update = {
      scientificMetadata: {
        "experiment test": {
          "updatednested test1": { value: "updated value 1", unit: "" },
          "updatednested.test2": { value: "updated value 2", unit: "" },
        },
      },
    };
    return request(appUrl)
      .patch("/api/v3/datasets/" + encodedDatasetPidNested)
      .send(update)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const metadata = res.body.scientificMetadata;

        metadata["experiment test"].should.have.property("updatednested test1");
        metadata["experiment test"].should.have.property("updatednested.test2");
      });
  });

  it("0620: should delete dataset with nested metadata", async () => {
    return request(appUrl)
      .delete("/api/v3/datasets/" + encodedDatasetPidNested)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0700: adds dataset owned by group1", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrectGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPidAuth1 = res.body["pid"];
      });
  });

  it("0710: adds dataset owned by group2", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(RawCorrectGroup2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPidAuth2 = res.body["pid"];
      });
  });

  it("0720: user in group1 should only see datasets owned by group1", async () => {
    const fields = {
      scientific: [
        { lhs: "run_number", relation: "GREATER_THAN", rhs: 24, unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(JSON.stringify(fields))}`,
      )
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(datasetPidAuth1);
      });
  });

  it("0730: user in group1 should not see datasets owned by group2 even if the conditions match", async () => {
    const fields = {
      scientific: [
        { lhs: "run_number", relation: "GREATER_THAN", rhs: 29, unit: "" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(JSON.stringify(fields))}`,
      )
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });
});
