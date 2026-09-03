import { ModuleRef } from "@nestjs/core";
import { GroupedEmailJobAction } from "./groupedemailaction";
import { GroupedEmailJobActionOptions } from "./groupedemailaction.interface";
import { JobClass } from "../../../../jobs/schemas/job.schema";
import { MailService } from "src/common/mail.service";
import { PoliciesService } from "src/policies/policies.service";
import { Policy } from "src/policies/schemas/policy.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { registerHelpers } from "../../handlebar-utils";

jest.mock("src/common/mail.service");

// initialize helpers, since app.module.ts is not loaded in this test
registerHelpers();

function makeDataset(overrides: Partial<DatasetClass>): DatasetClass {
  return {
    pid: "testPid/12345",
    ownerGroup: "group1",
    accessGroups: [],
    createdBy: "creator",
    updatedBy: "updater",
    isPublished: false,
    ...overrides,
  } as DatasetClass;
}

function makePolicy(overrides: Partial<Policy>): Policy {
  return {
    _id: "policyId",
    manager: [],
    ownerGroup: "group1",
    accessGroups: [],
    isPublished: false,
    createdBy: "creator",
    updatedBy: "updater",
    ...overrides,
  } as Policy;
}

const config: GroupedEmailJobActionOptions = {
  actionType: "groupedEmail",
  subject: "Job {{job.id}} update for {{ datasets.[0].ownerGroup }}",
  bodyTemplateFile:
    "src/common/email-templates/test-minimal-template.spec.html",
};

const mockJob: JobClass = {
  id: "jobId123",
  _id: "jobId123",
  type: "markForDeletion",
  statusCode: "jobSubmitted",
  statusMessage: "Job submitted",
  jobParams: { datasetList: [] },
  jobResultObject: {},
  ownerUser: "admin",
  ownerGroup: "admin",
  configVersion: "1.0",
  createdBy: "admin",
  updatedBy: "admin",
  createdAt: new Date("2023-10-01T10:00:00Z"),
  updatedAt: new Date("2023-10-01T10:00:00Z"),
  accessGroups: [],
  isPublished: false,
};

function mockPolicies(policies: Policy[]) {
  (policiesService.findAll as jest.Mock).mockResolvedValue(policies);
}

let mailService: MailService;
let policiesService: PoliciesService;
let moduleRef: ModuleRef;
let action: GroupedEmailJobAction;

describe("GroupedEmailJobAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mailService = { sendMail: jest.fn() } as unknown as MailService;
    policiesService = { findAll: jest.fn() } as unknown as PoliciesService;
    moduleRef = {
      resolve: jest.fn().mockResolvedValue(policiesService),
    } as unknown as ModuleRef;
    action = new GroupedEmailJobAction(mailService, moduleRef, config);
  });

  it("should be configured successfully", () => {
    expect(action).toBeDefined();
  });

  it("does nothing when there are no datasets", async () => {
    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets: [],
    });

    expect(moduleRef.resolve).not.toHaveBeenCalled();
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("throws when PoliciesService cannot be resolved and ignoreErrors is not set", async () => {
    (moduleRef.resolve as jest.Mock).mockRejectedValue(
      new Error("Resolution failed"),
    );

    await expect(
      action.perform({
        request: mockJob,
        job: mockJob,
        env: {},
        datasets: [makeDataset({ ownerGroup: "group1" })],
      }),
    ).rejects.toThrow("Resolution failed");

    expect(policiesService.findAll).not.toHaveBeenCalled();
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("ignores a PoliciesService resolution failure when ignoreErrors is set", async () => {
    (moduleRef.resolve as jest.Mock).mockRejectedValue(
      new Error("Resolution failed"),
    );
    const ignoringAction = new GroupedEmailJobAction(mailService, moduleRef, {
      ...config,
      ignoreErrors: true,
    });

    await expect(
      ignoringAction.perform({
        request: mockJob,
        job: mockJob,
        env: {},
        datasets: [makeDataset({ ownerGroup: "group1" })],
      }),
    ).resolves.toBeUndefined();

    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("sends one email per ownerGroup whose policy enables notifications for this job type", async () => {
    const datasets = [
      makeDataset({ pid: "pid1", ownerGroup: "group1" }),
      makeDataset({ pid: "pid2", ownerGroup: "group2" }),
    ];
    mockPolicies([
      makePolicy({
        ownerGroup: "group1",
        jobPolicies: {
          markForDeletion: {
            emailTo: ["group1@example.com"],
            emailNotification: true,
          },
        },
      }),
      makePolicy({
        ownerGroup: "group2",
        jobPolicies: {
          markForDeletion: {
            emailTo: ["group2@example.com"],
            emailNotification: true,
          },
        },
      }),
    ]);

    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets,
    });

    expect(moduleRef.resolve).toHaveBeenCalledWith(PoliciesService, undefined, {
      strict: false,
    });
    expect(policiesService.findAll).toHaveBeenCalledWith({
      where: {
        ownerGroup: { $in: ["group1", "group2"] },
        "jobPolicies.markForDeletion.emailNotification": true,
        "jobPolicies.markForDeletion.emailTo": {
          $exists: true,
          $not: { $size: 0 },
        },
      },
      fields: ["ownerGroup", "jobPolicies.markForDeletion.emailTo"],
    });
    expect(mailService.sendMail).toHaveBeenCalledTimes(2);
    expect(mailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["group1@example.com"],
        subject: "Job jobId123 update for group1",
      }),
    );
    expect(mailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["group2@example.com"],
        subject: "Job jobId123 update for group2",
      }),
    );
  });

  it("skips a group when its policy is missing", async () => {
    mockPolicies([]);

    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets: [makeDataset({ ownerGroup: "group1" })],
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("filters out policies with emailNotification disabled at the query level", async () => {
    // The findAll where-clause itself excludes emailNotification: false
    // policies, so the mocked service returns none for this group.
    mockPolicies([]);

    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets: [makeDataset({ ownerGroup: "group1" })],
    });

    expect(policiesService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          "jobPolicies.markForDeletion.emailNotification": true,
        }),
      }),
    );
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("filters out policies with an empty emailTo at the query level", async () => {
    // The findAll where-clause itself excludes empty/missing emailTo, so
    // the mocked service returns none for this group.
    mockPolicies([]);

    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets: [makeDataset({ ownerGroup: "group1" })],
    });

    expect(policiesService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          "jobPolicies.markForDeletion.emailTo": {
            $exists: true,
            $not: { $size: 0 },
          },
        }),
      }),
    );
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("skips a group whose jobPolicies has no entry for this job type", async () => {
    mockPolicies([
      makePolicy({
        ownerGroup: "group1",
        jobPolicies: {
          otherJobType: {
            emailTo: ["group1@example.com"],
            emailNotification: true,
          },
        },
      }),
    ]);

    await action.perform({
      request: mockJob,
      job: mockJob,
      env: {},
      datasets: [makeDataset({ ownerGroup: "group1" })],
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it("ignores send errors when ignoreErrors is set", async () => {
    mockPolicies([
      makePolicy({
        ownerGroup: "group1",
        jobPolicies: {
          markForDeletion: {
            emailTo: ["group1@example.com"],
            emailNotification: true,
          },
        },
      }),
    ]);
    (mailService.sendMail as jest.Mock).mockRejectedValue(
      new Error("Email sending failed"),
    );
    const ignoringAction = new GroupedEmailJobAction(mailService, moduleRef, {
      ...config,
      ignoreErrors: true,
    });

    await expect(
      ignoringAction.perform({
        request: mockJob,
        job: mockJob,
        env: {},
        datasets: [makeDataset({ ownerGroup: "group1" })],
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when sending fails and ignoreErrors is not set", async () => {
    mockPolicies([
      makePolicy({
        ownerGroup: "group1",
        jobPolicies: {
          markForDeletion: {
            emailTo: ["group1@example.com"],
            emailNotification: true,
          },
        },
      }),
    ]);
    (mailService.sendMail as jest.Mock).mockRejectedValue(
      new Error("Email sending failed"),
    );

    await expect(
      action.perform({
        request: mockJob,
        job: mockJob,
        env: {},
        datasets: [makeDataset({ ownerGroup: "group1" })],
      }),
    ).rejects.toThrow("Email sending failed");
  });
});
