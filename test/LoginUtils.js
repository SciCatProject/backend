"use strict";
const request = require("supertest");

function loginWithPassword(appUrl, user) {
  return new Promise((resolve, reject) => {
    request(appUrl)
      .post("/api/v3/auth/Login")
      .send(user)
      .set("Accept", "application/json")
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body);
        }
      });
  });
}

exports.getToken = async function (appUrl, user) {
  const responseBody = await loginWithPassword(appUrl, user);
  return responseBody.id;
};

exports.getIdAndToken = async function (appUrl, user) {
  const responseBody = await loginWithPassword(appUrl, user);
  return { userId: responseBody.userId, token: responseBody.id };
};

exports.getTokenAndEmail = async function (appUrl, user) {
  const responseBody = await loginWithPassword(appUrl, user);
  return { token: responseBody.id, userEmail: responseBody.user.email };
};

exports.getTokenAD = function (appUrl, user, cb) {
  request(appUrl)
    .post("/auth/msad")
    .send(user)
    .set("Accept", "application/json")
    .end((err, res) => {
      if (err) {
        cb(err);
      } else {
        cb(res.body.access_token);
      }
    });
};
