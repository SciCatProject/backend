import {
  InferSubjects,
  MongoQuery,
} from "@casl/ability";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { JobClass } from "src/jobs/schemas/job.schema";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { UserIdentity } from "src/users/schemas/user-identity.schema";
import { UserSettings } from "src/users/schemas/user-settings.schema";
import { User } from "src/users/schemas/user.schema";
import { Action } from "../action.enum";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { Opensearch } from "src/opensearch/opensearch.subject";
import { GenericHistory } from "src/common/schemas/generic-history.schema";

export type Subjects =
  | string
  | InferSubjects<
      | typeof Attachment
      | typeof Datablock
      | typeof DatasetClass
      | typeof GenericHistory
      | typeof Instrument
      | typeof JobClass
      | typeof Logbook
      | typeof MetadataKeyClass
      | typeof Opensearch
      | typeof OrigDatablock
      | typeof Policy
      | typeof ProposalClass
      | typeof PublishedData
      | typeof RuntimeConfig
      | typeof SampleClass
      | typeof User
      | typeof UserIdentity
      | typeof UserSettings
    >
  | "all";

export type PossibleAbilities = [Action, Subjects];

export type Conditions = MongoQuery;