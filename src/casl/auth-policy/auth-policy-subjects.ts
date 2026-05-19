import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { JobClass } from "src/jobs/schemas/job.schema";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { User } from "src/users/schemas/user.schema";

/**
 * Maps subject name strings (as used in auth-policy.json) to the actual
 * Mongoose document classes used by CASL.
 *
 * Extend this map whenever a new subject is added to the system.
 * Using a concrete class (rather than a plain string) lets @casl/mongoose
 * infer the correct collection and subject type in accessibleBy() calls.
 */
export const SUBJECTS = {
  // Datasets and related sub-resources
  Dataset: DatasetClass,
  DatasetAttachment: DatasetClass,
  DatasetOrigdatablock: DatasetClass,
  DatasetDatablock: DatasetClass,

  // Standalong resource types
  Attachment: Attachment,
  Datablock: Datablock,
  Instrument: Instrument,
  Job: JobClass,
  Logbook: Logbook,
  MetadataKey: MetadataKeyClass,
  OrigDatablock: OrigDatablock,
  Policy: Policy,
  Proposal: ProposalClass,
  ProposalAttachment: ProposalClass,
  PublishedData: PublishedData,
  RuntimeConfig: RuntimeConfig,
  Sample: SampleClass,
  SampleAttachment: SampleClass,
  User: User,

  // Wildcard – matches every subject
  all: "all" as const,
} as const;

export type SubjectName = keyof typeof SUBJECTS;
export type SubjectValue = (typeof SUBJECTS)[SubjectName];

/**
 * Resolve a subject name string from the auth policy JSON to the
 * corresponding class (or the string "all") understood by CASL.
 *
 * @throws Error when the subject name is not found in the SUBJECTS map.
 */
export function resolveSubject(name: string): SubjectValue {
  if (name === "all" || name === "All") {
    return "all";
  }
  const resolved = (SUBJECTS as Record<string, SubjectValue>)[name];
  if (resolved === undefined) {
    throw new Error(
      `Unknown subject "${name}" in auth policy. ` +
        `Valid subjects are: ${Object.keys(SUBJECTS).join(", ")}`,
    );
  }
  return resolved;
}
