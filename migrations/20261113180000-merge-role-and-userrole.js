const ObjectId = require('bson').ObjectId;

module.exports = {
  async up(db, client) {
    await db
      .collection("UserRole")
      .aggregate([
        { $match: { roleId: { $exists: true } } },
        {
          $lookup: {
            from: "Role",
            localField: "roleId",
            foreignField: "_id",
            as: "role",
          },
        },
        { $unwind: "$role" },
        {
          $set: {
            name: "$role.name",
            created: "$role.created",
            modified: "$role.modified",
          },
        },
        { $unset: [ "role", "roleId" ] },
      ])
      .toArray()
      .then(res => res.forEach(
        async (userRole) => {
          const update = {
            _id: userRole._id,
            userId: userRole.userId,
            name: userRole.name,
            created: userRole.created,
            modified: userRole.modified,
            __v: userRole.__v,
          };
          await db
            .collection("UserRole")
            .replaceOne(
              { _id: update._id },
              update,
            );
        }
      ));

    await db
      .collection("Role")
      .deleteMany({});
  },

  /**
   * Migrating up and down will randomize Role._id values but preserve references
   */
  async down(db, client) {
    const groups = await db
      .collection("UserRole")
      .aggregate([
        { $match: { roleId: { $exists: false } } },
        {
          $group: {
            _id: { name: "$name" },
            created: { $first: "$created" },
            modified: { $first: "$modified" },
            __v: { $first: "$__v" },
          }
        },
        { $set: { name: "$_id.name" }},
        { $unset: ["_id"] }
      ])
      .toArray();
    
    for (const group of groups) {
      const role = {
        _id: new ObjectId(),
        name: group.name,
        created: group.created,
        modified: group.modified,
        __v: group.__v,
      };

      await db
        .collection("Role")
        .insertOne(role);

      await db
        .collection("UserRole")
        .aggregate([
          { $match: { name: role.name } },
          { $unset: [ "name", "created", "modified" ] },
          { $set: { roleId: role._id } },
        ])
        .toArray()
        .then(res => res.forEach(
          async (userRole) => {
            // Preserve pre-migration field ordering
            const update = {
              _id: userRole._id,
              userId: userRole.userId,
              roleId: userRole.roleId,
              __v: userRole.__v,
            };
            await db
              .collection("UserRole")
              .replaceOne(
                { _id: update._id },
                update,
              );
          }
        ));
    }
  },
};
