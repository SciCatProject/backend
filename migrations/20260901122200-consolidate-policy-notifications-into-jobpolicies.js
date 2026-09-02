const policyV3toV4FieldMap =
  require("../dist/policies/dto/policy.obsolete.dto").policyV3toV4FieldMap;
const { toApiToDBMap } = require("../dist/common/utils/deep-mapper.util");

const { apiToDBMap } = toApiToDBMap(policyV3toV4FieldMap);
const FIELD_MAPPINGS = Object.entries(apiToDBMap).map(([legacy, target]) => ({
  legacy,
  target,
}));


module.exports = {
  async up(db) {
    await db.collection("Policy").updateMany(
      { $or: FIELD_MAPPINGS.map(({ legacy }) => ({ [legacy]: { $exists: true } })) },
      [
        {
          $set: Object.fromEntries(
            FIELD_MAPPINGS.map(({ legacy, target }) => [
              target,
              { $ifNull: [`$${target}`, `$${legacy}`] },
            ]),
          ),
        },
        { $unset: FIELD_MAPPINGS.map(({ legacy }) => legacy) },
      ],
    );
  },

  async down(db) {
    await db.collection("Policy").updateMany(
      { $or: FIELD_MAPPINGS.map(({ target }) => ({ [target]: { $exists: true } })) },
      [
        {
          $set: Object.fromEntries(
            FIELD_MAPPINGS.map(({ legacy, target }) => [
              legacy,
              { $ifNull: [`$${legacy}`, `$${target}`] },
            ]),
          ),
        },
        { $unset: FIELD_MAPPINGS.map(({ target }) => target) },
      ],
    );
  },
};
