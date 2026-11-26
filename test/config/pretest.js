"use strict";

require("dotenv").config();

const supertest = require("supertest");
const { MongoClient } = require("mongodb");

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured");
}

const client = new MongoClient(process.env.MONGODB_URI);

global.appUrl = "http://localhost:3000";
global.request = supertest;

module.exports = {
  mochaHooks: {
    async beforeAll() {
      await client.connect();

      // Uses the database specified in MONGODB_URI.
      global.db = client.db();

      const [chaiModule, chaiHttpModule] = await Promise.all([
        import("chai"),
        import("chai-http"),
      ]);

      const chai = chaiModule.default || chaiModule;
      const chaiHttp = chaiHttpModule.default || chaiHttpModule;

      global.chai = chai.use(chaiHttp);

      console.log(`Test MongoDB connected: ${global.db.databaseName}`);
    },

    async afterAll() {
      await client.close();
      delete global.db;
    },
  },
};
