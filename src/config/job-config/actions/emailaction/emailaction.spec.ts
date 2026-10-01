/* emailaction tests
 *
 * This suite contains snapshot tests for the email action templates. After changing
 * templates, run
 *
 *     npm run test emailaction -- -u
 *
 * to update __snapshots__.
 *
 */
import { EmailJobAction } from "./emailaction";
import { EmailJobActionOptions } from "./emailaction.interface";
import { JobClass } from "../../../../jobs/schemas/job.schema";
import { MailService } from "src/common/mail.service";
import { MailerService } from "@nestjs-modules/mailer";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { CreateJobDto } from "src/jobs/dto/create-job.dto";
import { registerHelpers } from "../../handlebar-utils";
import { toMatchFile } from "jest-file-snapshot";
import path from "path";

expect.extend({ toMatchFile });
jest.mock("src/common/mail.service");
jest.mock("@nestjs-modules/mailer");
const snapshotDir = (...parts: string[]) =>
  path.join(__dirname, "__snapshots__", parts.join("_") + ".snap.html");
// initialize helpers, since app.module.ts is not loaded in this test
registerHelpers();

const mockDataset: DatasetClass = {
  _id: "testId/12345",
  pid: "testPid/12345",
  owner: "owner user",
  ownerEmail: "testOwner@email.com",
  instrumentIds: ["testInstrumentId"],
  orcidOfOwner: "https://0000.0000.0000.0001",
  contactEmail: "testContact@email.com",
  sourceFolder: "/nfs/groups/beamlines/test/123456",
  sourceFolderHost: "https://fileserver.site.com",
  size: 50 * 1024 * 1024 * 1024,
  packedSize: 50 * 1024 * 1024 * 1024,
  numberOfFiles: 1,
  numberOfFilesArchived: 1,
  creationTime: new Date("2021-11-11T12:29:02.083Z"),
  type: "raw",
  validationStatus: "string",
  keywords: [],
  description: "Test dataset.",
  datasetName: "Test Dataset",
  classification: "string",
  license: "string",
  version: "string",
  isPublished: false,
  datasetlifecycle: {
    id: "testId",
    archivable: true,
    retrievable: true,
    publishable: true,
    dateOfDiskPurging: new Date("2031-11-11T12:29:02.083Z"),
    archiveRetentionTime: new Date("2031-11-11T12:29:02.083Z"),
    dateOfPublishing: new Date("2024-11-11T12:29:02.083Z"),
    publishedOn: new Date("2024-11-11T12:29:02.083Z"),
    isOnCentralDisk: true,
    archiveReturnMessage: {},
    retrieveReturnMessage: {},
    archiveStatusMessage: "string",
    retrieveStatusMessage: "string",
    exportedTo: "string",
    retrieveIntegrityCheck: false,
  },
  createdAt: new Date("2021-11-11T12:29:02.083Z"),
  updatedAt: new Date("2021-11-11T12:29:02.083Z"),
  endTime: new Date("2021-12-11T12:29:02.083Z"),
  creationLocation: "test",
  dataFormat: "Test Format",
  scientificMetadata: {},
  proposalIds: ["ABCDEF"],
  sampleIds: ["testSampleId"],
  accessGroups: [],
  createdBy: "creating user",
  ownerGroup: "owner group",
  updatedBy: "updating user",
  instrumentGroup: "instrument group",
};

// Basic archive job for testing
const mockJob: JobClass = {
  id: "jobId123",
  _id: "jobId123",
  type: "archive",
  statusCode: "jobSubmitted",
  statusMessage: "Job submitted",
  jobParams: {
    datasetList: [
      {
        pid: mockDataset.pid,
        files: [],
      },
      {
        pid: mockDataset.pid,
        files: [],
      },
    ],
  },
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

// PSI retrieve object structure. Other facilities may differ.
const retrieveResultObject = {
  result: [
    {
      datasetId: mockDataset.pid,
      name: `${mockDataset.pid}-1.tar`,
      size: 40127,
      archiveId: `/lts/${mockDataset.pid}-1.tar`,
      url: "https://example.com/v1/publicbucket/${mockDataset.pid}-1.tar",
    },
    {
      datasetId: mockDataset.pid,
      name: `${mockDataset.pid}-2.tar`,
      size: 40127,
      archiveId: `/lts/${mockDataset.pid}-2.tar`,
      url: "https://example.com/v1/publicbucket/${mockDataset.pid}-2.tar",
    },
  ],
};

function jobToCreateDto(job: JobClass): CreateJobDto {
  return {
    type: job.type,
    jobParams: job.jobParams,
    ownerUser: job.ownerUser,
    ownerGroup: job.ownerGroup,
    contactEmail: job.contactEmail,
  };
}

describe("EmailJobAction", () => {
  const config: EmailJobActionOptions = {
    actionType: "email",
    to: "recipient@example.com",
    from: "sender@example.com",
    subject: "Job {{job.id}} completed",
    bodyTemplateFile:
      "src/common/email-templates/test-minimal-template.spec.html",
  };

  const mailService = {
    sendMail: jest.fn(),
  } as unknown as MailService;

  const action = new EmailJobAction(mailService, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be configured successfully", async () => {
    expect(action).toBeDefined();
  });

  it("should send an email successfully", async () => {
    const job = {
      id: "12345",
      type: "testemail",
    } as JobClass;

    const context = { request: job, job, env: {}, datasets: [] };
    await action.perform(context);

    expect(mailService.sendMail).toHaveBeenCalledWith({
      to: "recipient@example.com",
      from: "sender@example.com",
      subject: "Job 12345 completed",
      html: "Your testemail job with ID 12345 has been completed successfully.",
    });
  });

  it("should throw an error if email sending fails", async () => {
    const job = {
      id: "12345",
      type: "testemail",
    } as JobClass;

    (mailService.sendMail as jest.Mock).mockRejectedValue(
      new Error("Email sending failed"),
    );

    const context = { request: job, job, env: {}, datasets: [] };
    await expect(action.perform(context)).rejects.toThrow(
      "Email sending failed",
    );
  });

  it("should ignore errors if the ignoreError is set", async () => {
    const job = {
      id: "12345",
      type: "testemail",
    } as JobClass;

    (mailService.sendMail as jest.Mock).mockRejectedValue(
      new Error("Email sending failed"),
    );

    const actionIgnore = new EmailJobAction(mailService, {
      ...config,
      ignoreErrors: true,
    });

    const context = { request: job, job, env: {}, datasets: [] };
    await expect(actionIgnore.perform(context)).resolves.toBeUndefined();

    expect(mailService.sendMail).toHaveBeenCalledWith({
      to: "recipient@example.com",
      from: "sender@example.com",
      subject: "Job 12345 completed",
      html: "Your testemail job with ID 12345 has been completed successfully.",
    });
  });
});

describe("EmailJobAction with default sender", () => {
  const config: EmailJobActionOptions = {
    actionType: "email",
    to: "recipient@example.com",
    subject: "Job {{ job.id }} completed",
    bodyTemplateFile:
      "src/common/email-templates/test-minimal-template.spec.html",
  };

  const mailService = {
    sendMail: jest.fn(),
  } as unknown as MailService;

  const mailerService = {
    sendMail: jest.fn(),
  } as unknown as MailerService;

  const action = new EmailJobAction(mailService, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be configured successfully", async () => {
    expect(action).toBeDefined();
  });

  it("should send an email with default sender successfully", async () => {
    const job = {
      id: "12345",
      type: "testemail",
    } as JobClass;

    const defaultFrom = "default-sender@example.com";
    (mailerService.sendMail as jest.Mock).mockImplementation((mailOptions) => {
      mailOptions.from = defaultFrom;
      return Promise.resolve();
    });

    (mailService.sendMail as jest.Mock).mockImplementation((mailOptions) => {
      return mailerService.sendMail(mailOptions);
    });

    const context = { request: job, job, env: {}, datasets: [] };
    await action.perform(context);

    expect(mailerService.sendMail).toHaveBeenCalledWith({
      to: "recipient@example.com",
      from: defaultFrom,
      subject: "Job 12345 completed",
      html: "Your testemail job with ID 12345 has been completed successfully.",
    });
  });
});

describe("Email Template", () => {
  const mailService = {
    sendMail: jest.fn(),
  } as unknown as MailService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("job-template-simplified.html should render correctly", async () => {
    const config: EmailJobActionOptions = {
      actionType: "email",
      to: "recipient@example.com",
      from: "sender@example.com",
      subject: "Job {{ job.id }}",
      bodyTemplateFile:
        "src/common/email-templates/job-template-simplified.html",
    };
    const action = new EmailJobAction(mailService, config);

    const context = {
      request: jobToCreateDto(mockJob),
      job: mockJob,
      env: {},
      datasets: [mockDataset],
    };
    await action.perform(context);

    expect(mailService.sendMail).toHaveBeenCalled();
    const mail = (mailService.sendMail as jest.Mock).mock.calls.at(-1)[0];
    expect(mail.html).toMatchFile(
      snapshotDir(
        "job-template-simplified",
        context.job.type,
        mockJob.statusCode || "",
      ),
    );
  });

  const jobTypes = ["archive", "retrieve", "public"];
  const statusCodes = [
    "jobSubmitted",
    "finishedSuccessful",
    "finishedUnsuccessful",
  ];
  const retrieveOptions = ["URLs", "PSI", "PSI-Ra"];

  // Build list of combinations
  const combinations: [string, string, string?][] = [];
  for (const jobType of jobTypes) {
    for (const statusCode of statusCodes) {
      if (jobType === "retrieve") {
        for (const option of retrieveOptions) {
          combinations.push([jobType, statusCode, option]);
        }
      } else {
        combinations.push([jobType, statusCode, undefined]);
      }
    }
  }

  it.each(combinations)(
    "job-template.html should render correctly on %s jobs with status %s and option %s",
    async (jobType, statusCode, retrieveOption) => {
      const config: EmailJobActionOptions = {
        actionType: "email",
        to: "recipient@example.com",
        from: "sender@example.com",
        subject: "Job {{ job.id }}",
        bodyTemplateFile: "src/common/email-templates/job-template.html",
      };
      const action = new EmailJobAction(mailService, config);

      const job: JobClass = {
        ...mockJob,
        type: jobType,
        statusCode: statusCode,
        statusMessage: `Job ${statusCode}`,
        jobParams: {
          ...mockJob.jobParams,
        },
      };
      if (jobType === "retrieve") {
        job.jobParams.option = retrieveOption;
        job.jobResultObject = retrieveResultObject;
      }

      const datasets: DatasetClass[] = [
        {
          ...mockDataset,
          datasetlifecycle: {
            ...mockDataset.datasetlifecycle,
            archivable: true,
            retrievable:
              statusCode != "finishedUnsuccessful" && jobType == "retrieve",
          },
        },
        {
          ...mockDataset,
          datasetlifecycle: {
            ...mockDataset.datasetlifecycle,
            archivable:
              statusCode != "finishedUnsuccessful" && jobType == "archive",
            retrievable: true,
          },
        },
      ];

      const context = {
        request: jobToCreateDto(job),
        job: job,
        env: { SCICAT_FRONTEND_URL: "https://discovery.psi.ch" },
        datasets: datasets,
      };
      console.log(JSON.stringify(context));
      await action.perform(context);

      expect(mailService.sendMail).toHaveBeenCalled();
      const mail = (mailService.sendMail as jest.Mock).mock.calls.at(-1)[0];

      expect(mail.html).toMatchFile(
        snapshotDir("job-template", jobType, statusCode, retrieveOption || ""),
      );
    },
  );
});
