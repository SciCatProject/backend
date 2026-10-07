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

const nestedScientificMetadata = {
  ...TestData.DatasetWithScientificMetadata.scientificMetadata,
  instrumentNestedQ7: {
    detectorNestedZ4: {
      modelNestedM6: "PilatusNestedModelZX9",
      pixelCount: 1475,
    },
    cryostatNestedR8: {
      temperature: {
        value: 4.2,
        unit: "NestedKelvinU5",
      },
    },
  },
};

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

      await request(appUrl)
        .post("/api/v3/opensearch/delete-index")
        .query({ index: "dataset" })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .catch(() => {});

      await request(appUrl)
        .post("/api/v3/opensearch/create-index")
        .send({ index: "dataset" })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode);
    });

    it("0010: adds a new raw dataset -1 ", async () => {
      const dataset1 = {
        ...TestData.DatasetWithScientificMetadata,
        datasetName: datasetName1,
        isPublished: true,
        scientificMetadata: nestedScientificMetadata,
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
          const found = res.body.some((d) => d.datasetName === datasetName1);
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

    it("0027: finds dataset1 by a scientific metadata value nested three levels deep", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: "PilatusNestedModelZX9" }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName1);
          found.should.equal(true);
        });
    });

    it("0028: finds dataset1 by a scientific metadata value nested four levels deep", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: "NestedKelvinU5" }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName1);
          found.should.equal(true);
        });
    });

    it("0029: finds dataset1 by a top level scientific metadata key", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: "instrumentNestedQ7" }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName1);
          found.should.equal(true);
        });
    });

    it("0030: does not match dataset2 on dataset1 nested metadata", async () => {
      return request(appUrl)
        .get("/api/v3/datasets/fullquery")
        .query({
          fields: JSON.stringify({ text: "PilatusNestedModelZX9" }),
          limits: JSON.stringify({
            skip: 0,
            limit: 10,
          }),
        })
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(200)
        .then((res) => {
          const found = res.body.some((d) => d.datasetName === datasetName2);
          found.should.equal(false);
        });
    });

    describe("Result order consistency", () => {
      const orderTestText = "orderconsistencytoken";
      const orderDatasetCount = 12;
      const orderPids = [];

      const searchPage = ({ limit, skip, order = null }) =>
        request(appUrl)
          .get("/api/v3/datasets/fullquery")
          .query({
            fields: JSON.stringify({ text: orderTestText }),
            limits: JSON.stringify(
              order ? { skip, limit, order } : { skip, limit },
            ),
          })
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
          .expect(200)
          .then((res) => res.body.map((d) => d.pid));

      const pageThroughAll = async (pageSize, order = null) => {
        let collected = [];
        for (let skip = 0; skip < orderDatasetCount; skip += pageSize) {
          collected = collected.concat(
            await searchPage({ limit: pageSize, skip, order }),
          );
        }
        return collected;
      };

      before(async () => {
        for (let i = 0; i < orderDatasetCount; i++) {
          await request(appUrl)
            .post("/api/v3/Datasets")
            .send({
              ...TestData.DatasetWithScientificMetadata,
              datasetName: `OrderTest_${String(i).padStart(2, "0")} ${orderTestText}`,
              isPublished: true,
            })
            .set("Accept", "application/json")
            .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
            .expect(TestData.EntryCreatedStatusCode)
            .then((res) => orderPids.push(res.body.pid));
        }
      });

      // JOURNEY: the user runs the same search twice - they hit enter again,
      // click "reload", or navigate away and come back to the same query.
      // EXPECT: the table does not reshuffle under them.
      it("0040: repeating the same search returns the results in the same order", async () => {
        const firstSearch = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
        });
        firstSearch.length.should.equal(orderDatasetCount);

        for (let repeat = 0; repeat < 4; repeat++) {
          const laterSearch = await searchPage({
            limit: orderDatasetCount,
            skip: 0,
          });
          laterSearch.should.deep.equal(firstSearch);
        }
      });

      // JOURNEY: the user searches and clicks through pages 1, 2, 3 without
      // sorting anything.
      // EXPECT: page 1 + page 2 + page 3 is exactly the list they would have
      // seen if every result fit on one page - no dataset shown twice, none lost.
      it("0041: paging through unsorted results shows each dataset exactly once", async () => {
        const everythingAtOnce = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
        });
        const pagedThrough = await pageThroughAll(5);

        pagedThrough.should.deep.equal(everythingAtOnce);
        new Set(pagedThrough).size.should.equal(orderDatasetCount);
        [...pagedThrough].sort().should.deep.equal([...orderPids].sort());
      });

      // JOURNEY: the user clicks the "Name" column header to sort A-Z, then
      // pages through the sorted results.
      // EXPECT: the pages are slices of one sorted list, and that list really
      // is in alphabetical order - not just internally consistent.
      it("0042: paging through name-sorted results keeps the alphabetical order across pages", async () => {
        const order = "datasetName:asc";

        const everythingAtOnce = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
          order,
        });
        const pagedThrough = await pageThroughAll(5, order);

        pagedThrough.should.deep.equal(everythingAtOnce);
        new Set(pagedThrough).size.should.equal(orderDatasetCount);
      });

      // JOURNEY: same as above, but we verify the sort is actually applied by
      // reading the names back, because a stable-but-wrong order would still
      // pass a pure consistency check.
      it("0043: sorting by name ascending really returns the datasets alphabetically", async () => {
        return request(appUrl)
          .get("/api/v3/datasets/fullquery")
          .query({
            fields: JSON.stringify({ text: orderTestText }),
            limits: JSON.stringify({
              skip: 0,
              limit: orderDatasetCount,
              order: "datasetName:asc",
            }),
          })
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
          .expect(200)
          .then((res) => {
            const names = res.body.map((d) => d.datasetName);
            names.length.should.equal(orderDatasetCount);
            names.should.deep.equal([...names].sort());
          });
      });

      // JOURNEY: the user clicks the "Name" header a second time to flip to Z-A.
      // EXPECT: they see the exact same datasets, in reverse - nothing appears
      // or disappears just because the direction changed.
      it("0044: flipping the sort direction reverses the same result set", async () => {
        const ascending = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
          order: "datasetName:asc",
        });
        const descending = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
          order: "datasetName:desc",
        });

        descending.should.deep.equal([...ascending].reverse());
      });

      // JOURNEY: the user sorts by newest first - the most common sort in the
      // dataset table. Bulk-ingested datasets can share the same createdAt
      // timestamp, leaving the sort column tied.
      // EXPECT: paging still shows each dataset exactly once. Where the column
      // ties, only a unique tiebreaker (pid) in the backend sort can guarantee
      // that.
      it("0045: paging works when sorting by creation date", async () => {
        const order = "createdAt:desc";

        const everythingAtOnce = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
          order,
        });
        const pagedThrough = await pageThroughAll(4, order);

        pagedThrough.should.deep.equal(everythingAtOnce);
        new Set(pagedThrough).size.should.equal(orderDatasetCount);
        [...pagedThrough].sort().should.deep.equal([...orderPids].sort());
      });

      // JOURNEY: the user changes the page size dropdown from 10 to 25 to 5.
      // EXPECT: the underlying order never changes - only how it is chopped up.
      it("0046: changing the page size does not change the order of results", async () => {
        const order = "datasetName:asc";
        const everythingAtOnce = await searchPage({
          limit: orderDatasetCount,
          skip: 0,
          order,
        });

        for (const pageSize of [2, 4, 6]) {
          const pagedThrough = await pageThroughAll(pageSize, order);
          pagedThrough.should.deep.equal(everythingAtOnce);
        }
      });

      // JOURNEY: the user is on the last page and clicks "next" once more.
      // EXPECT: an empty page, not an error and not a repeat of earlier results.
      it("0047: paging past the end returns nothing rather than repeating results", async () => {
        const pastTheEnd = await searchPage({
          limit: 5,
          skip: orderDatasetCount + 5,
          order: "datasetName:asc",
        });

        pastTheEnd.length.should.equal(0);
      });

      after(async () => {
        await Promise.all(
          orderPids.map((pid) =>
            request(appUrl)
              .delete("/api/v3/datasets/" + encodeURIComponent(pid))
              .set("Accept", "application/json")
              .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
              .expect(TestData.SuccessfulDeleteStatusCode),
          ),
        );
      });
    });

    after(async () => {
      await Promise.all(
        [pid1, pid2].map((pid) =>
          request(appUrl)
            .delete("/api/v3/datasets/" + pid)
            .set("Accept", "application/json")
            .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
            .expect(TestData.SuccessfulDeleteStatusCode),
        ),
      );
    });
  },
);
