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
  async down(db, client) {
    // no path backward
  },
};
