//NOTE: Here we load and initialize some global variables that are used throughout the tests

require("dotenv").config();
var chaiHttp;
var chai;

const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGODB_URI);

async function loadChai() {
  chaiHttp = await import("chai-http");
  await import("chai").then((result) => {
    chai = result.use(chaiHttp);
  });
  await client.connect();
}

loadChai();
global.appUrl = "http://localhost:3000";
global.request = require("supertest");
global.db = client.db();
