module.exports = {
  async up(db, client) {
    await db
      .collection("UserRole")
      .aggregate([
        {
          $lookup: {
            from: "Role",
            localField: "roleId",
            foreignField: "_id",
            as: "role",
          },
        },
        {
          $set: {
            name: "$role.name",
            created: "$role.created",
            modified: "$role.modified",
          },
        },
        { $unset: "role" },
      ]);
    
    await db
      .collection("Role")
      .deleteMany({});
  },

  /**
   * Migrating up and down will randomize Role._id values but preserve references
   */
  async down(db, client) {
    const roleFields = await db
      .collection("UserRole")
      .aggregate([
        {
          $group: {
            _id: { name: "$name" },
          }
        }
      ]);
    
    const roles = roleFields.map(async (fields) => {
      const role = {
        _id: new mongodb.ObjectId(),
        ...fields,
      }

      await db
        .collection("Role")
        .insert(role);

      return role;
    });

    for (const role of roles) {
      await db.collection("UserRole").updateMany(
        {
          $match: { 
            name: { $in: role.name },
          }
        },
        { $set: { roleId: role._id } },
        { $unset: [ "name", "cretead", "modified" ] },
      );
    }
  },
};