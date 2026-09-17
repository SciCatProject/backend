"use strict";
const { faker } = require("@faker-js/faker");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const sandbox = require("sinon").createSandbox();

let accessTokenProposalIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  proposalPid1 = null,
  encodedProposalPid1 = null,
  proposalPid2 = null,
  encodedProposalPid2 = null,
  proposalPid3 = null,
  encodedProposalPid3 = null;
// proposalPid10 = null,
// encodedProposalPid10 = null;

const proposal1 = {
  ...TestData.ProposalCorrectMin,
  proposalId: faker.string.numeric(8),
  ownerGroup: "group4",
  accessGroups: ["group5"],
};

const proposal2 = {
  ...TestData.ProposalCorrectComplete,
  proposalId: faker.string.numeric(8),
  ownerGroup: "group1",
  accessGroups: ["group3"],
};

const proposal3 = {
  ...TestData.ProposalCorrectMin,
  proposalId: faker.string.numeric(8),
  ownerGroup: "group2",
  accessGroups: ["group3"],
};

// const proposal10 = {
//   ...TestData.ProposalCorrectMin,
//   proposalId: "20170271",
//   ownerGroup: "admin",
//   accessGroups: ["admin"],
//   isPublished: true,
// };

describe("1400: ProposalAuthorization: Test access to proposal", () => {
  before(async () => {
    db.collection("Proposal").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenProposalIngestor = await utils.getToken(appUrl, {
      username: "proposalIngestor",
      password: TestData.Accounts["proposalIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
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

  it("0010: adds proposal 1", async () => {
    return request(appUrl)
      .post("/api/v3/proposals")
      .send(proposal1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group4");
        res.body.should.have.property("proposalId").and.be.string;
        proposalPid1 = res.body["proposalId"];
        encodedProposalPid1 = encodeURIComponent(proposalPid1);
      });
  });

  it("0020: adds proposal 2", async () => {
    return request(appUrl)
      .post("/api/v3/proposals")
      .send(proposal2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("proposalId").and.be.string;
        proposalPid2 = res.body["proposalId"];
        encodedProposalPid2 = encodeURIComponent(proposalPid2);
      });
  });

  it("0030: adds proposal 3", async () => {
    return request(appUrl)
      .post("/api/v3/proposals")
      .send(proposal3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group2");
        res.body.should.have.property("proposalId").and.be.string;
        proposalPid3 = res.body["proposalId"];
        encodedProposalPid3 = encodeURIComponent(proposalPid3);
      });
  });

  // it("0035: adds proposal 10", async () => {
  //   return request(appUrl)
  //     .post("/api/v3/proposals")
  //     .send(proposal10)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(TestData.EntryCreatedStatusCode)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.have.property("ownerGroup").and.equal("admin");
  //       res.body.should.have.property("proposalId").and.be.string;
  //       proposalPid10 = res.body["proposalId"];
  //       encodedProposalPid10 = encodeURIComponent(proposalPid10);
  //     });
  // });

  it("0040: cannot access proposal as unauthenticated user", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(TestData.AccessForbiddenStatusCode);
  });

  // it("0045: can access public proposal as unauthenticated user", async () => {
  //   return request(appUrl)
  //     .get("/api/v3/proposals/" + encodedProposalPid10)
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .expect(TestData.SuccessfulGetStatusCode);
  // });

  it("0050: admin can list all proposals", async () => {
    return request(appUrl)
      .get("/api/v3/proposals")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0060: access proposal 1 as admin", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid1);
      });
  });

  it("0061: check admin access to proposal 1 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0062: access proposal 1 as proposalIngestor", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenProposalIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid1);
      });
  });

  it("0070: full query for proposals for admin", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/fullquery")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0080: access proposal 2 as admin", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid2);
      });
  });

  it("0081: check admin access to proposal 2 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0090: access proposal 3 as admin", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid3);
      });
  });

  it("0091: check admin access to proposal 3 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0100: list of proposals for user 1", async () => {
    return request(appUrl)
      .get("/api/v3/proposals")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["proposalId"].should.be.equal(proposalPid2);
      });
  });

  it("0110: access proposal 1 as user 1 should fail", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect("Content-Type", /json/)
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0111: check user 1 access to proposal 1 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("0120: access proposal 2 as user 1", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid2);
      });
  });

  it("0121: check user 1 access to proposal 2 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0130: access proposal 3 as user 1 should fail", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect("Content-Type", /json/)
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0131: check user 1 access to proposal 3 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("0140: full query for proposals for user 1", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/fullquery")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["proposalId"].should.be.equal(proposalPid2);
      });
  });

  it("0150: list of proposals for user 2", async () => {
    return request(appUrl)
      .get("/api/v3/proposals")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[1]["proposalId"].should.be.equal(proposalPid3);
      });
  });

  it("0160: access proposal 1 as user 2 should fail", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0161: check user 2 access to proposal 1 should return false", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid1 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(false);
      });
  });

  it("0165: access proposal 2 as user 2", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid2);
      });
  });

  it("0166: check user 2 access to proposal 2 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid2 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0170: access proposal 3 as user 2", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body["proposalId"].should.be.equal(proposalPid3);
      });
  });

  it("0171: check user 2 access to proposal 3 should return true", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/" + encodedProposalPid3 + "/authorization")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect("Content-Type", /json/)
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("canAccess").and.be.equal(true);
      });
  });

  it("0180: full query for proposals for user 2", async () => {
    return request(appUrl)
      .get("/api/v3/proposals/fullquery")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["proposalId"].should.be.equal(proposalPid2);
        res.body[1]["proposalId"].should.be.equal(proposalPid3);
      });
  });

  it("0190: full facet for proposals for user 2", async () => {
    return request(appUrl)
      .get(`/api/v3/proposals/fullfacet`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].all[0].totalSets.should.be.equal(2);
      });
  });

  it("0200: should delete proposal 1", async () => {
    return request(appUrl)
      .delete("/api/v3/Proposals/" + proposalPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0210: should delete proposal 2", async () => {
    return request(appUrl)
      .delete("/api/v3/Proposals/" + proposalPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0220: should delete proposal 3", async () => {
    return request(appUrl)
      .delete("/api/v3/Proposals/" + proposalPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
