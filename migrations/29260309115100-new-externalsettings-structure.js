/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  async up(db, client) {
    await db.collection("UserSetting").updateMany(
      {},
      {
        $unset: {
          columns: "",
          "externalSettings.columns": "",
          "externalSettings.conditions": "",
          "externalSettings.filters": "",
          "externalSettings.tablesSettings": "",
        },
        $set: {
          "externalSettings.fe_dataset_table_columns": [],
          "externalSettings.fe_dataset_table_conditions": [],
          "externalSettings.fe_dataset_table_filters": [],
          "externalSettings.fe_proposal_table_columns": [],
          "externalSettings.fe_proposal_table_filters": [],
          "externalSettings.fe_sample_table_columns": [],
          "externalSettings.fe_sample_table_conditions": [],
          "externalSettings.fe_instrument_table_columns": [],
          "externalSettings.fe_file_table_columns": [],
        },
      },
    );

    console.log("Successfully migrated UserSetting structure");
  },

  async down(db, client) {
    await db.collection("UserSetting").updateMany(
      {},
      {
        $unset: {
          "externalSettings.fe_dataset_table_columns": "",
          "externalSettings.fe_dataset_table_conditions": "",
          "externalSettings.fe_dataset_table_filters": "",
          "externalSettings.fe_proposal_table_columns": "",
          "externalSettings.fe_proposal_table_filters": "",
          "externalSettings.fe_sample_table_columns": "",
          "externalSettings.fe_sample_table_conditions": "",
          "externalSettings.fe_instrument_table_columns": "",
          "externalSettings.fe_file_table_columns": "",
        },
        $set: {
          columns: "",
          "externalSettings.columns": "",
          "externalSettings.conditions": "",
          "externalSettings.filters": "",
          "externalSettings.tablesSettings": "",
        },
      },
    );

    console.log("Successfully reverted UserSetting structure");
  },
};
