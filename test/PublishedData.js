"use strict";

const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

const clone = (value) => JSON.parse(JSON.stringify(value));

const datasetPath = (pid) => `/api/v3/Datasets/${encodeURIComponent(pid)}`;
const publishedDataPath = (doi) =>
  `/api/v3/PublishedData/${encodeURIComponent(doi)}`;

const requestWithToken = (method, path, token) => {
  const req = request(appUrl)[method](path).set("Accept", "application/json");
  return token ? req.set({ Authorization: `Bearer ${token}` }) : req;
};

describe("1600: PublishedData v3 lifecycle", () => {
  let accessTokenAdmin;
  let accessTokenAdminIngestor;
  let accessTokenArchiveManager;
  let accessTokenUser1;
  let accessTokenUser2;
  let associatedDatasetPids = [];
  let unrelatedDatasetPid;
  let publishedDataDoi;

  const createDataset = async (payload) => {
    const response = await requestWithToken(
      "post",
      "/api/v3/Datasets",
      accessTokenAdminIngestor,
    )
      .send(payload)
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);

    response.body.should.have.property("pid").and.be.string;
    return response.body.pid;
  };

  const expectDatasetAccessible = async (pid, token) => {
    const response = await requestWithToken(
      "get",
      datasetPath(pid),
      token,
    ).expect(TestData.SuccessfulGetStatusCode);

    response.body.should.have.property("pid").and.equal(pid);
    return response.body;
  };

  const expectDatasetInaccessible = async (pid, token) => {
    await requestWithToken("get", datasetPath(pid), token).expect(
      TestData.AccessForbiddenStatusCode,
    );
  };

  before(async () => {
    await db.collection("Dataset").deleteMany({});
    await db.collection("PublishedData").deleteMany({});

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts.admin.password,
    });
    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts.adminIngestor.password,
    });
    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts.archiveManager.password,
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts.user1.password,
    });
    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts.user2.password,
    });
  });

  after(async () => {
    if (publishedDataDoi) {
      await requestWithToken(
        "delete",
        publishedDataPath(publishedDataDoi),
        accessTokenArchiveManager,
      ).expect(TestData.SuccessfulDeleteStatusCode);
    }

    for (const pid of [...associatedDatasetPids, unrelatedDatasetPid]) {
      if (pid) {
        await requestWithToken(
          "delete",
          datasetPath(pid),
          accessTokenArchiveManager,
        ).expect(TestData.SuccessfulDeleteStatusCode);
      }
    }
  });

  it("0010: rejects published data without associated datasets", async () => {
    const payload = {
      ...clone(TestData.PublishedData),
      pidArray: [],
      title: "Published data without associated datasets",
    };

    await requestWithToken(
      "post",
      "/api/v3/PublishedData",
      accessTokenAdminIngestor,
    )
      .send(payload)
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);

    const records = await db
      .collection("PublishedData")
      .find({ title: payload.title })
      .toArray();
    records.should.have.length(0);
  });

  it("0020: creates the first associated dataset", async () => {
    const payload = {
      ...clone(TestData.RawCorrect),
      datasetName: "published-data-test-dataset-1",
    };

    const pid = await createDataset(payload);
    associatedDatasetPids.push(pid);

    const dataset = await expectDatasetAccessible(
      pid,
      accessTokenAdminIngestor,
    );
    dataset.should.have.property("isPublished").and.equal(false);
  });

  it("0030: creates the second associated dataset", async () => {
    const payload = {
      ...clone(TestData.RawCorrect),
      datasetName: "published-data-test-dataset-2",
    };

    const pid = await createDataset(payload);
    associatedDatasetPids.push(pid);
    associatedDatasetPids.should.have.length(2);
    associatedDatasetPids[0].should.not.equal(associatedDatasetPids[1]);

    const dataset = await expectDatasetAccessible(
      pid,
      accessTokenAdminIngestor,
    );
    dataset.should.have.property("isPublished").and.equal(false);
  });

  it("0040: creates a third restricted dataset outside the record", async () => {
    const payload = {
      ...clone(TestData.RawCorrect),
      datasetName: "published-data-test-dataset-3-restricted",
      ownerGroup: "examplenonpublicgroup",
      accessGroups: [],
    };

    unrelatedDatasetPid = await createDataset(payload);
    const dataset = await expectDatasetAccessible(
      unrelatedDatasetPid,
      accessTokenAdminIngestor,
    );
    dataset.should.have.property("isPublished").and.equal(false);
  });

  it("0050: creates published data referencing only the first two datasets", async () => {
    const payload = {
      ...clone(TestData.PublishedData),
      pidArray: [...associatedDatasetPids],
      title: "Published data with two associated datasets",
    };

    const response = await requestWithToken(
      "post",
      "/api/v3/PublishedData",
      accessTokenAdminIngestor,
    )
      .send(payload)
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);

    response.body.should.have
      .property("pidArray")
      .and.deep.equal(associatedDatasetPids);
    response.body.pidArray.should.not.include(unrelatedDatasetPid);
    response.body.should.have
      .property("status")
      .and.equal("pending_registration");
    response.body.should.have.property("doi").and.be.string;
    publishedDataDoi = response.body.doi;
  });

  it("0055: accepts a legacy scalar pidArray and returns it as an array", async () => {
    const payload = {
      ...clone(TestData.PublishedData),
      pidArray: "legacy-scalar-dataset-pid",
      title: "Published data with scalar legacy pidArray",
    };

    const response = await requestWithToken(
      "post",
      "/api/v3/PublishedData",
      accessTokenAdminIngestor,
    )
      .send(payload)
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);

    response.body.should.have
      .property("pidArray")
      .and.deep.equal([payload.pidArray]);

    await requestWithToken(
      "delete",
      publishedDataPath(response.body.doi),
      accessTokenArchiveManager,
    ).expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0060: allows the dataset owner to access both associated datasets before registration", async () => {
    for (const pid of associatedDatasetPids) {
      const dataset = await expectDatasetAccessible(
        pid,
        accessTokenAdminIngestor,
      );
      dataset.should.have.property("isPublished").and.equal(false);
    }
  });

  it("0070: allows an admin to access both associated datasets before registration", async () => {
    for (const pid of associatedDatasetPids) {
      const dataset = await expectDatasetAccessible(pid, accessTokenAdmin);
      dataset.should.have.property("isPublished").and.equal(false);
    }
  });

  it("0080: rejects regular users without dataset permission before registration", async () => {
    for (const token of [accessTokenUser1, accessTokenUser2]) {
      for (const pid of [...associatedDatasetPids, unrelatedDatasetPid]) {
        await expectDatasetInaccessible(pid, token);
      }
    }
  });

  it("0090: rejects anonymous access to unpublished datasets before registration", async () => {
    for (const pid of [...associatedDatasetPids, unrelatedDatasetPid]) {
      await expectDatasetInaccessible(pid);
    }
  });

  it("0100: rejects unauthorized access to the third dataset before registration", async () => {
    for (const token of [accessTokenUser1, accessTokenUser2]) {
      await expectDatasetInaccessible(unrelatedDatasetPid, token);
    }
    await expectDatasetInaccessible(unrelatedDatasetPid);
  });

  it("0110: allows the owner to retrieve private published data", async () => {
    const response = await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
      accessTokenAdminIngestor,
    )
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);

    response.body.should.have
      .property("pidArray")
      .and.deep.equal(associatedDatasetPids);
    response.body.should.have
      .property("status")
      .and.equal("pending_registration");
  });

  it("0120: allows an admin to retrieve private published data", async () => {
    await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
      accessTokenAdmin,
    )
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0130: rejects anonymous access to private published data", async () => {
    await requestWithToken("get", publishedDataPath(publishedDataDoi)).expect(
      TestData.NotFoundStatusCode,
    );
  });

  it("0140: registers the published data through the configured DataCite test service", async () => {
    const registerUrl = `${publishedDataPath(publishedDataDoi)}/register`;
    console.log(registerUrl);
    await requestWithToken("post", registerUrl, accessTokenAdminIngestor)
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0150: verifies the published data is registered", async () => {
    const response = await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    response.body.should.have.property("status").and.equal("registered");
  });

  it("0160: allows anonymous users to retrieve registered published data", async () => {
    const response = await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
    ).expect(TestData.SuccessfulGetStatusCode);

    response.body.should.have.property("status").and.equal("registered");
  });

  it("0165: lists and counts registered published data for authenticated users", async () => {
    const listResponse = await requestWithToken(
      "get",
      "/api/v3/PublishedData",
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    listResponse.body.should.be.instanceof(Array);
    listResponse.body.should.have.length(1);
    listResponse.body[0].should.have
      .property("doi")
      .and.equal(publishedDataDoi);

    const countResponse = await requestWithToken(
      "get",
      "/api/v3/PublishedData/count",
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    countResponse.body.should.have.property("count").and.equal(1);
  });

  it("0166: lists and counts only registered published data anonymously", async () => {
    const listResponse = await requestWithToken(
      "get",
      "/api/v3/PublishedData",
    ).expect(TestData.SuccessfulGetStatusCode);

    listResponse.body.should.be.instanceof(Array);
    listResponse.body.should.have.length(1);

    const countResponse = await requestWithToken(
      "get",
      "/api/v3/PublishedData/count",
    ).expect(TestData.SuccessfulGetStatusCode);

    countResponse.body.should.have.property("count").and.equal(1);
  });

  it("0167: supports V3 filters through the query and header", async () => {
    const filter = { where: { creator: "ESS" } };

    const queryResponse = await requestWithToken(
      "get",
      `/api/v3/PublishedData?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    queryResponse.body.should.have.length(1);
    queryResponse.body[0].should.have
      .property("creator")
      .and.deep.equal(["ESS"]);

    const headerResponse = await requestWithToken(
      "get",
      "/api/v3/PublishedData",
      accessTokenAdminIngestor,
    )
      .set({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode);

    headerResponse.body.should.have.length(1);
    headerResponse.body[0].should.have
      .property("creator")
      .and.deep.equal(["ESS"]);
  });

  it("0168: supports V3 field projection for list responses", async () => {
    const objectFieldsResponse = await requestWithToken(
      "get",
      `/api/v3/PublishedData?filter=${encodeURIComponent(
        JSON.stringify({ fields: { creator: 1 } }),
      )}`,
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    objectFieldsResponse.body[0].should.have.property("creator");
    objectFieldsResponse.body[0].should.not.have.property("thumbnail");

    const arrayFieldsResponse = await requestWithToken(
      "get",
      `/api/v3/PublishedData?filter=${encodeURIComponent(
        JSON.stringify({ fields: ["creator"] }),
      )}`,
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);

    arrayFieldsResponse.body[0].should.have.property("creator");
    arrayFieldsResponse.body[0].should.not.have.property("thumbnail");
  });

  it("0170: allows the owner to retrieve registered published data", async () => {
    await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
      accessTokenAdminIngestor,
    ).expect(TestData.SuccessfulGetStatusCode);
  });

  it("0180: allows an admin to retrieve registered published data", async () => {
    await requestWithToken(
      "get",
      publishedDataPath(publishedDataDoi),
      accessTokenAdmin,
    ).expect(TestData.SuccessfulGetStatusCode);
  });

  it("0190: allows regular users to retrieve registered published data", async () => {
    for (const token of [accessTokenUser1, accessTokenUser2]) {
      await requestWithToken(
        "get",
        publishedDataPath(publishedDataDoi),
        token,
      ).expect(TestData.SuccessfulGetStatusCode);
    }
  });

  it("0200: allows anonymous users to access both associated datasets after registration", async () => {
    for (const pid of associatedDatasetPids) {
      const dataset = await expectDatasetAccessible(pid);
      dataset.should.have.property("isPublished").and.equal(true);
    }
  });

  it("0210: allows the owner to access both associated datasets after registration", async () => {
    for (const pid of associatedDatasetPids) {
      const dataset = await expectDatasetAccessible(
        pid,
        accessTokenAdminIngestor,
      );
      dataset.should.have.property("isPublished").and.equal(true);
    }
  });

  it("0220: allows an admin to access both associated datasets after registration", async () => {
    for (const pid of associatedDatasetPids) {
      const dataset = await expectDatasetAccessible(pid, accessTokenAdmin);
      dataset.should.have.property("isPublished").and.equal(true);
    }
  });

  it("0230: allows regular users to access both associated datasets after registration", async () => {
    for (const token of [accessTokenUser1, accessTokenUser2]) {
      for (const pid of associatedDatasetPids) {
        const dataset = await expectDatasetAccessible(pid, token);
        dataset.should.have.property("isPublished").and.equal(true);
      }
    }
  });

  it("0240: keeps the third dataset inaccessible after registration", async () => {
    for (const token of [accessTokenUser1, accessTokenUser2]) {
      await expectDatasetInaccessible(unrelatedDatasetPid, token);
    }
    await expectDatasetInaccessible(unrelatedDatasetPid);
  });
});
