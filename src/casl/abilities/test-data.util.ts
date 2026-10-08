import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { JobConfig } from "src/config/job-config/jobconfig.interface";
import { CreateJobAuth, UpdateJobAuth } from "src/jobs/types/jobs-auth.enum";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { JobClass } from "src/jobs/schemas/job.schema";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { User } from "src/users/schemas/user.schema";

export class ConfigServiceMock {
  get = jest.fn((key: string) => {
    if (key === "accessGroups") {
      return {
        admin: ["admin"],
        delete: ["delete"],
        attachment: ["attachment"],
        attachmentPrivileged: ["attachmentPrivileged"],
        createDataset: ["createDataset"],
        createDatasetWithPid: ["createDatasetWithPid"],
        createDatasetPrivileged: ["createDatasetPrivileged"],
        updateDatasetLifecycle: ["updateDatasetLifecycle"],
        historyAttachments: ["historyAttachment"],
        historyDatablocks: ["historyDatablock"],
        historyDataset: ["historyDataset"],
        historyInstrument: ["historyInstrument"],
        historyPolicies: ["historyPolicy"],
        historyProposal: ["historyProposal"],
        historyPublishedData: ["historyPublishedData"],
        historySample: ["historySample"],
        createJobPrivileged: ["createJobPrivileged"],
        updateJobPrivileged: ["updateJobPrivileged"],
        deleteJob: ["deleteJob"],
        policy: ["policy"],
        proposal: ["proposal"],
        sample: ["sample"],
        samplePrivileged: ["samplePrivileged"],
      } as AccessGroupsType;
    }
    return null;
  });
}

export class JobConfigServiceMock {
  public get allJobConfigs(): Readonly<Record<string, JobConfig>> {
    return {
      public: {
        jobType: "public",
        create: { auth: CreateJobAuth.All },
        update: { auth: UpdateJobAuth.All },
      } as unknown as JobConfig,
      owned: {
        jobType: "owned",
        create: { auth: CreateJobAuth.Authenticated },
        update: { auth: UpdateJobAuth.JobOwnerGroup },
      } as unknown as JobConfig,
      privileged: {
        jobType: "privileged",
        create: { auth: CreateJobAuth.JobAdmin },
        update: { auth: UpdateJobAuth.JobAdmin },
      } as unknown as JobConfig,
    };
  }
}

export const unauthenticatedUser = null;

export const authenticatedUser1 = {
  _id: "user1",
  currentGroups: ["group1"],
} as unknown as JWTUser;

export const authenticatedUser2 = {
  _id: "user2",
  currentGroups: ["group2"],
} as unknown as JWTUser;

export const adminUser = {
  _id: "userAdmin",
  currentGroups: ["admin"],
} as unknown as JWTUser;

export const deleteUser = {
  currentGroups: ["delete"],
} as unknown as JWTUser;

export const attachmentUser1 = {
  currentGroups: ["group1", "attachment"],
} as unknown as JWTUser;

export const attachmentUser2 = {
  currentGroups: ["group2", "attachment"],
} as unknown as JWTUser;

export const attachmentPrivilegedUser1 = {
  currentGroups: ["group1", "attachmentPrivileged"],
} as unknown as JWTUser;

export const attachmentPrivilegedUser2 = {
  currentGroups: ["group2", "attachmentPrivileged"],
} as unknown as JWTUser;

export const createDatasetUser1 = {
  currentGroups: ["group1", "createDataset"],
} as unknown as JWTUser;

export const createDatasetUser2 = {
  currentGroups: ["group2", "createDataset"],
} as unknown as JWTUser;

export const createDatasetWithPidUser1 = {
  currentGroups: ["group1", "createDatasetWithPid"],
} as unknown as JWTUser;

export const createDatasetWithPidUser2 = {
  currentGroups: ["group2", "createDatasetWithPid"],
} as unknown as JWTUser;

export const createDatasetPrivilegedUser1 = {
  currentGroups: ["group1", "createDatasetPrivileged"],
} as unknown as JWTUser;

export const createDatasetPrivilegedUser2 = {
  currentGroups: ["group2", "createDatasetPrivileged"],
} as unknown as JWTUser;

export const updateDatasetLifecycleUser = {
  currentGroups: ["updateDatasetLifecycle"],
} as unknown as JWTUser;

export const historyAttachmentUser = {
  currentGroups: ["historyAttachment"],
} as unknown as JWTUser;

export const historyDatablockUser = {
  currentGroups: ["historyDatablock"],
} as unknown as JWTUser;

export const historyDatasetUser = {
  currentGroups: ["historyDataset"],
} as unknown as JWTUser;

export const historyInstrumentUser = {
  currentGroups: ["historyInstrument"],
} as unknown as JWTUser;

export const historyPolicyUser = {
  currentGroups: ["historyPolicy"],
} as unknown as JWTUser;

export const historyProposalUser = {
  currentGroups: ["historyProposal"],
} as unknown as JWTUser;

export const historyPublishedDataUser = {
  currentGroups: ["historyPublishedData"],
} as unknown as JWTUser;

export const historySampleUser = {
  currentGroups: ["historySample"],
} as unknown as JWTUser;

export const createJobPrivilegedUser = {
  username: "jobAdmin",
  currentGroups: ["jobAdminGroup", "createJobPrivileged"],
} as unknown as JWTUser;

export const updateJobPrivilegedUser = {
  username: "jobAdmin",
  currentGroups: ["jobAdminGroup", "updateJobPrivileged"],
} as unknown as JWTUser;

export const deleteJobUser = {
  currentGroups: ["deleteJob"],
} as unknown as JWTUser;

export const policyUser = {
  currentGroups: ["policy"],
} as unknown as JWTUser;

export const proposalUser1 = {
  currentGroups: ["group1", "proposal"],
} as unknown as JWTUser;

export const proposalUser2 = {
  currentGroups: ["group2", "proposal"],
} as unknown as JWTUser;

export const sampleUser1 = {
  currentGroups: ["group1", "sample"],
} as unknown as JWTUser;

export const sampleUser2 = {
  currentGroups: ["group2", "sample"],
} as unknown as JWTUser;

export const samplePrivilegedUser1 = {
  currentGroups: ["group1", "samplePrivileged"],
} as unknown as JWTUser;

export const samplePrivilegedUser2 = {
  currentGroups: ["group2", "samplePrivileged"],
} as unknown as JWTUser;

export const publicAttachment = new Attachment();
publicAttachment.ownerGroup = "group1";
publicAttachment.isPublished = true;

export const ownedAttachment = new Attachment();
ownedAttachment.ownerGroup = "group1";

export const publicDatablock = new Datablock();
publicDatablock.ownerGroup = "group1";
publicDatablock.isPublished = true;

export const ownedDatablock = new Datablock();
ownedDatablock.ownerGroup = "group1";

export const publicDataset = new DatasetClass();
publicDataset.pid = "";
publicDataset.ownerGroup = "group1";
publicDataset.isPublished = true;

export const ownedDataset = new DatasetClass();
ownedDataset.pid = "";
ownedDataset.ownerGroup = "group1";

export const ownedDatasetPid = new DatasetClass();
ownedDatasetPid.pid = "123456789";
ownedDatasetPid.ownerGroup = "group1";

export const publicJob = new JobClass();
publicJob.type = "public";
publicJob.ownerUser = "anonymous";

export const ownedJob = new JobClass();
ownedJob.type = "owned";
ownedJob.ownerUser = "user1";
ownedJob.ownerGroup = "group1";

export const privilegedJob = new JobClass();
privilegedJob.type = "privileged";
privilegedJob.ownerUser = "jobAdmin";
privilegedJob.ownerGroup = "jobAdminGroup";

export const publicMetadataKey = new MetadataKeyClass();
publicMetadataKey.userGroups = ["group1"];
publicMetadataKey.isPublished = true;

export const ownedMetadataKey = new MetadataKeyClass();
ownedMetadataKey.userGroups = ["group1"];

export const publicOrigdatablock = new OrigDatablock();
publicOrigdatablock.ownerGroup = "group1";
publicOrigdatablock.isPublished = true;

export const ownedOrigdatablock = new OrigDatablock();
ownedOrigdatablock.ownerGroup = "group1";

export const publicProposal = new ProposalClass();
publicProposal.ownerGroup = "group1";
publicProposal.isPublished = true;

export const ownedProposal = new ProposalClass();
ownedProposal.ownerGroup = "group1";

export const publicSample = new SampleClass();
publicSample.ownerGroup = "group1";
publicSample.isPublished = true;

export const ownedSample = new SampleClass();
ownedSample.ownerGroup = "group1";

export const user1 = new User();
user1._id = "user1";

export const userAdmin = new User();
userAdmin._id = "userAdmin";
