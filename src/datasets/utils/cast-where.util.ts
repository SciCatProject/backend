import { BadRequestException } from "@nestjs/common";
import {
  Error as MongooseError,
  FilterQuery,
  Mongoose,
  Schema,
} from "mongoose";
import { AttachmentSchema } from "src/attachments/schemas/attachment.schema";
import { DatablockSchema } from "src/datablocks/schemas/datablock.schema";
import { InstrumentSchema } from "src/instruments/schemas/instrument.schema";
import { OrigDatablockSchema } from "src/origdatablocks/schemas/origdatablock.schema";
import { ProposalSchema } from "src/proposals/schemas/proposal.schema";
import { SampleSchema } from "src/samples/schemas/sample.schema";
import { DatasetSchema } from "../schemas/dataset.schema";
import { castWhereFilter } from "./pipeline.util";

// A dataset as it looks after its relations are looked up. Only used to cast
// filters, so it lives on its own mongoose instance, away from the database.
const DatasetWhere = new Mongoose().model(
  "DatasetWhere",
  new Schema().add(DatasetSchema).add({
    instruments: [InstrumentSchema],
    proposals: [ProposalSchema],
    origdatablocks: [OrigDatablockSchema],
    datablocks: [DatablockSchema],
    attachments: [AttachmentSchema],
    samples: [SampleSchema],
  }),
);

/**
 * Casts a where filter on datasets, including conditions on their relations,
 * to the schema types, e.g. date strings to dates. Aggregation $match stages,
 * unlike find queries, are not cast by mongoose.
 */
export function castDatasetWhere<T>(where: FilterQuery<T>): FilterQuery<T> {
  try {
    return DatasetWhere.find().cast(
      DatasetWhere,
      castWhereFilter(where ?? {}),
    ) as FilterQuery<T>;
  } catch (error) {
    if (error instanceof MongooseError.CastError)
      throw new BadRequestException(error.message);
    throw error;
  }
}
