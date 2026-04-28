/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  async up(db, client) {
    await db.collection("UserSetting").updateMany(
      {},
      {
        $unset: {
          columns: "",
          externalSettings: "",
        },
      },
    );

    console.log("Successfully migrated UserSetting structure");
  },
};
