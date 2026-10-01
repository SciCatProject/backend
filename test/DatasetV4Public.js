"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  derivedDatasetMinPid = null;

describe("2600: Datasets v4 public endpoints tests", () => {
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

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({ ...TestData.DerivedCorrectV4, isPublished: true })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        derivedDatasetMinPid = res.body.pid;
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({ ...TestData.RawCorrectV4, isPublished: true })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({ ...TestData.CustomDatasetCorrect, isPublished: true })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
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

  describe("Fetching v4 public datasets", () => {
    it("0200: should fetch several public datasets using limits sort filter", async () => {
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
        .get("/api/v4/datasets/public")
        .query({ filter: JSON.stringify(filter) })
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
        .get("/api/v4/datasets/public")
        .query({ filter: JSON.stringify(filter) })
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

    it("0202: should fetch different public datasets if skip is used in limits filter", async () => {
      let responseBody;
      const filter = {
        limits: {
          limit: 1,
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      await request(appUrl)
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(1);

          responseBody = res.body;
        });

      filter.limits.skip = 1;

      return request(appUrl)
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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

    it("0205: should fetch all dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["all"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Datasets v4 findOne public tests", () => {
    it("0301: should fetch different public dataset if skip is used in limits filter", async () => {
      let responseBody;
      const filter = {
        limits: {
          skip: 0,
          sort: {
            datasetName: "asc",
          },
        },
      };

      await request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          responseBody = res.body;
        });

      filter.limits.skip = 1;

      return request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
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
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");

          res.body.should.have.property("datasetName");
          res.body.should.have.property("pid");
          res.body.should.not.have.property("description");
        });
    });

    it("0303: should fetch dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["instruments", "proposals"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
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

    it("0304: should fetch all dataset relation fields if provided in the filter", async () => {
      const filter = {
        include: ["all"],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
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

    it("0305: should be able to fetch the dataset providing where filter", async () => {
      const filter = {
        where: {
          datasetName: {
            $regex: "Dataset",
            $options: "i",
          },
        },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.datasetName.should.match(/Dataset/i);
        });
    });

    it("0306: should be able to fetch a dataset providing all allowed filters together", async () => {
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
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
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

    it("0307: should not be able to provide filters that are not allowed", async () => {
      const filter = {
        customField: { datasetName: "test" },
      };

      return request(appUrl)
        .get(`/api/v4/datasets/public/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Datasets v4 public count tests", () => {
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
        .get("/api/v4/datasets/public/count")
        .query({ filter: JSON.stringify(filter) })
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

  describe("Datasets v4 public findById tests", () => {
    it("0501: should fetch dataset by id", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/public/${encodeURIComponent(derivedDatasetMinPid)}`,
        )
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
          `/api/v4/datasets/public/${encodeURIComponent(derivedDatasetMinPid)}?include=instruments&include=proposals`,
        )
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
          `/api/v4/datasets/public/${encodeURIComponent(derivedDatasetMinPid)}?include=all`,
        )
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
  });

  describe("Cleanup datasets after the tests", () => {
    it("0600: delete all dataset as archivemanager", async () => {
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
});
