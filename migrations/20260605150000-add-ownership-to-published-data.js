module.exports = {
  async up(db, client) {
    // Add ownerGroup and ensure status for all PublishedData records
    // Legacy records without ownerGroup should be accessible to everyone
    // We set ownerGroup to "public" for backward compatibility
    
    await db
      .collection("PublishedData")
      .find({
        $or: [
          { ownerGroup: { $exists: false } },
          { ownerGroup: null },
        ],
      })
      .forEach(async (publishedData) => {
        const pid = publishedData._id;
        
        // Set default ownerGroup to "public" for backward compatibility
        // Set default status to "public" if not set or is null
        const update = {
          $set: {
            ownerGroup: "public",
          },
        };
        
        // If status is not set or is null, set it to PUBLIC
        if (!publishedData.status || publishedData.status === null) {
          update.$set.status = "public";
        }
        
        console.log(`Updating PublishedData (Id: ${pid}) with ownerGroup and status`);
        await db.collection("PublishedData").updateOne(
          { _id: pid },
          update,
        );
      });
  },
  async down(db, client) {
    // Remove ownerGroup from records that were added by this migration
    // We can't easily revert this, but we'll unset ownerGroup for records that had it set to "public"
    await db
      .collection("PublishedData")
      .updateMany(
        { ownerGroup: "public" },
        { $unset: { ownerGroup: true } },
      );
    
    console.log("Reverted ownerGroup for public records");
  },
};
