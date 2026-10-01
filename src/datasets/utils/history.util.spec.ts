import { HistoryClass } from "src/datasets/schemas/history.schema";
import {
  convertGenericHistoriesToObsoleteHistories,
  convertGenericHistoryToObsoleteHistory,
  convertObsoleteHistoryToGenericHistory,
} from "./history.util";
import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { GenericHistory } from "../../common/schemas/generic-history.schema";

describe("History Utility Functions", () => {
  it("should convert obsolete history to generic history", () => {
    const obsoleteHistory: HistoryClass = {
      updatedAt: new Date("2023-10-01T12:00:00Z"),
      updatedBy: "user123",
      isPublished: {
        currentValue: true,
        previousValue: false,
      },
      datasetlifecycle: {
        currentValue: {
          publishedOn: new Date("2023-10-01T12:00:00Z"),
          archivable: true,
          retrievable: true,
        },
        previousValue: {
          archivable: false,
          retrievable: true,
          publishable: false,
          archiveRetentionTime: new Date("2031-10-01T12:00:00Z"),
          dateOfPublishing: new Date("2024-10-01T12:00:00Z"),
          isOnCentralDisk: true,
          archiveStatusMessage: "datasetOnArchiveDisk",
          retrieveStatusMessage: "",
          retrieveIntegrityCheck: false,
        },
      },
      scientificMetadata: {
        currentValue: {
          runNumber: 484,
          scanAxis0Name: ["phi"],
          scanName: "run0484_diamond_D2FG",
          scan_parameters: {
            expected_total_number_of_steps: 7,
            name: ["phi2"],
            scan_name: "run0484_diamond_D2FG",
          },
          scan_readbacks: [
            [73.369784942746],
            [73.36755732624964],
            [73.3680595489329],
            [73.36857790677979],
            [73.3690102872549],
            [73.36911958727225],
            [73.37012839122846],
          ],
          scan_readbacks_raw: [[], [], [], [], [], [], []],
          scan_step_info: [
            {
              step_number: 1,
            },
            {
              step_number: 2,
            },
          ],
        },
        previousValue: {
          runNumber: 0,
          scanAxis0Name: ["phi"],
          scanName: "run0484_diamond_D2FG",
          scan_parameters: {
            expected_total_number_of_steps: 7,
            name: ["phi"],
            scan_name: "run0484_diamond_D2FG",
          },
          scan_readbacks: [
            [73.369784942746],
            [73.36755732624964],
            [73.3680595489329],
            [73.36857790677979],
            [73.3690102872549],
            [73.36911958727225],
            [73.37012839122846],
          ],
          scan_readbacks_raw: [[], [], [], [], [], [], []],
          scan_step_info: [
            {
              step_number: 1,
            },
            {
              step_number: 2,
            },
          ],
        },
      },
      _id: "",
    };
    const documentId = "pid123";
    const genericHistory = convertObsoleteHistoryToGenericHistory(
      obsoleteHistory,
      documentId,
    );
    expect(genericHistory).toEqual({
      subsystem: "Dataset",
      documentId: "pid123",
      user: "user123",
      operation: "update",
      timestamp: new Date("2023-10-01T12:00:00Z"),
      before: {
        isPublished: false,
        datasetlifecycle: { archivable: false, publishedOn: undefined },
        scientificMetadata: {
          runNumber: 0,
          scan_parameters: { name: ["phi"] },
        },
      },
      after: {
        isPublished: true,
        datasetlifecycle: {
          archivable: true,
          publishedOn: new Date("2023-10-01T12:00:00.000Z"),
        },
        scientificMetadata: {
          runNumber: 484,
          scan_parameters: { name: ["phi2"] },
        },
      },
    });
  });

  it("should convert generic history to obsolete history", () => {
    const genericHistory: GenericHistory = {
      subsystem: "Dataset",
      documentId: "pid123",
      user: "user123",
      operation: "update",
      timestamp: new Date("2023-10-01T12:00:00Z"),
      before: {
        isPublished: false,
        datasetlifecycle: {
          publishedOn: undefined,
          archivable: false,
        },
      },
      after: {
        datasetlifecycle: {
          publishedOn: new Date("2023-10-01T12:00:00Z"),
          archivable: true,
          archiveReturnMessage: {
            blackpearlMigration: "succeeded",
          },
        },
        isPublished: true,
      },
    };

    const currentDataset: Partial<DatasetClass> = {
      isPublished: true,
      datasetlifecycle: {
        publishedOn: new Date("2023-10-01T12:00:00Z"),
        archivable: true,
        retrievable: true,
        publishable: false,
        archiveRetentionTime: new Date("2031-10-01T12:00:00Z"),
        dateOfPublishing: new Date("2024-10-01T12:00:00Z"),
        isOnCentralDisk: true,
        archiveStatusMessage: "datasetOnArchiveDisk",
        retrieveStatusMessage: "",
        retrieveIntegrityCheck: false,
      },
    };
    const obsoleteHistory = convertGenericHistoryToObsoleteHistory(
      genericHistory,
      currentDataset,
    );

    expect(obsoleteHistory).toEqual({
      updatedAt: new Date("2023-10-01T12:00:00Z"),
      updatedBy: "user123",
      isPublished: {
        previousValue: false,
        currentValue: true,
      },
      datasetlifecycle: {
        previousValue: {
          publishedOn: undefined,
          archivable: false,
          retrievable: true,
          publishable: false,
          archiveRetentionTime: new Date("2031-10-01T12:00:00Z").toISOString(),
          dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
          isOnCentralDisk: true,
          archiveStatusMessage: "datasetOnArchiveDisk",
          retrieveStatusMessage: "",
          retrieveIntegrityCheck: false,
        },
        currentValue: {
          publishedOn: new Date("2023-10-01T12:00:00Z").toISOString(),
          archivable: true,
          retrievable: true,
          publishable: false,
          archiveRetentionTime: new Date("2031-10-01T12:00:00Z").toISOString(),
          dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
          isOnCentralDisk: true,
          archiveStatusMessage: "datasetOnArchiveDisk",
          retrieveStatusMessage: "",
          retrieveIntegrityCheck: false,
        },
      },
      _id: "",
    });
  });

  it("should convert history list to obsolete histories", () => {
    const genericHistories: GenericHistory[] = [
      {
        subsystem: "Dataset",
        documentId: "pid123",
        user: "user123",
        operation: "update",
        timestamp: new Date("2023-10-02T12:00:00Z"),
        before: {
          isPublished: false,
          datasetlifecycle: {
            archivable: false,
          },
        },
        after: {
          datasetlifecycle: {
            publishedOn: new Date("2023-10-02T12:00:00Z"),
            archivable: true,
            archiveReturnMessage: {
              blackpearlMigration: "succeeded",
            },
          },
          isPublished: true,
        },
      },
      {
        subsystem: "Dataset",
        documentId: "pid123",
        user: "user456",
        operation: "update",
        timestamp: new Date("2023-10-01T12:00:00Z"),
        before: {
          datasetlifecycle: {
            archivable: false,
          },
        },
        after: {
          datasetlifecycle: {
            publishedOn: new Date("2023-10-01T12:00:00Z"),
            archivable: false,
          },
        },
      },
    ];

    const currentDataset: Partial<DatasetDocument> = {
      isPublished: true,
      datasetlifecycle: {
        publishedOn: new Date("2023-10-02T12:00:00Z"),
        archivable: true,
        retrievable: true,
        publishable: false,
        archiveRetentionTime: new Date("2031-10-01T12:00:00Z"),
        dateOfPublishing: new Date("2024-10-01T12:00:00Z"),
        isOnCentralDisk: true,
        archiveStatusMessage: "datasetOnArchiveDisk",
        retrieveStatusMessage: "",
        retrieveIntegrityCheck: false,
        archiveReturnMessage: {
          blackpearlMigration: "succeeded",
        },
      },
    };

    const obsoleteHistories = convertGenericHistoriesToObsoleteHistories(
      genericHistories,
      currentDataset as DatasetDocument,
    );

    expect(obsoleteHistories).toEqual([
      {
        updatedAt: new Date("2023-10-02T12:00:00Z"),
        updatedBy: "user123",
        isPublished: {
          previousValue: false,
          currentValue: true,
        },
        datasetlifecycle: {
          previousValue: {
            archivable: false,
            retrievable: true,
            publishable: false,
            archiveRetentionTime: new Date(
              "2031-10-01T12:00:00Z",
            ).toISOString(),
            dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
            isOnCentralDisk: true,
            archiveStatusMessage: "datasetOnArchiveDisk",
            retrieveStatusMessage: "",
            retrieveIntegrityCheck: false,
          },
          currentValue: {
            publishedOn: new Date("2023-10-02T12:00:00Z").toISOString(),
            archivable: true,
            retrievable: true,
            publishable: false,
            archiveRetentionTime: new Date(
              "2031-10-01T12:00:00Z",
            ).toISOString(),
            dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
            isOnCentralDisk: true,
            archiveStatusMessage: "datasetOnArchiveDisk",
            retrieveStatusMessage: "",
            retrieveIntegrityCheck: false,
            archiveReturnMessage: {
              blackpearlMigration: "succeeded",
            },
          },
        },
        _id: "",
      },
      {
        updatedAt: new Date("2023-10-01T12:00:00Z"),
        updatedBy: "user456",
        datasetlifecycle: {
          previousValue: {
            archivable: false,
            retrievable: true,
            publishable: false,
            archiveRetentionTime: new Date(
              "2031-10-01T12:00:00Z",
            ).toISOString(),
            dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
            isOnCentralDisk: true,
            archiveStatusMessage: "datasetOnArchiveDisk",
            retrieveStatusMessage: "",
            retrieveIntegrityCheck: false,
          },
          currentValue: {
            archivable: false,
            retrievable: true,
            publishable: false,
            archiveRetentionTime: new Date(
              "2031-10-01T12:00:00Z",
            ).toISOString(),
            dateOfPublishing: new Date("2024-10-01T12:00:00Z").toISOString(),
            isOnCentralDisk: true,
            archiveStatusMessage: "datasetOnArchiveDisk",
            retrieveStatusMessage: "",
            retrieveIntegrityCheck: false,
          },
        },
        _id: "",
      },
    ]);
  });
});
