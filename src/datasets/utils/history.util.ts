import { HistoryClass } from "src/datasets/schemas/history.schema";
import { GenericHistory } from "../../common/schemas/generic-history.schema";
import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { computeDeltaWithOriginals } from "src/common/utils/delta.util";
import { omit } from "lodash";

const IGNORE_FIELDS = ["updatedAt", "updatedBy", "_id"];

export function convertObsoleteHistoryToGenericHistory(
  history: HistoryClass,
  documentId: string,
): GenericHistory {
  const result: GenericHistory = {
    subsystem: "Dataset",
    documentId: documentId,
    user: history.updatedBy,
    operation: "update",
    timestamp: history.updatedAt,
    before: {},
    after: {},
  };
  const changeList = Object.keys(history).filter(
    (key) => !IGNORE_FIELDS.includes(key),
  );
  for (const key of changeList) {
    if (
      !history[key] ||
      !history[key].hasOwnProperty("previousValue") ||
      !history[key].hasOwnProperty("currentValue")
    ) {
      continue;
    }
    const fieldChange = history[key] as {
      previousValue: unknown;
      currentValue: unknown;
    };
    if (typeof fieldChange.previousValue == "object") {
      const currentValue = fieldChange.currentValue as Record<string, unknown>;
      const previousValue = fieldChange.previousValue as Record<
        string,
        unknown
      >;
      // only retain the intersection of keys in currentValue and previousValue and whose value has changed. drop all others
      const { delta, originals } = computeDeltaWithOriginals(previousValue, {
        ...previousValue,
        ...currentValue,
      });
      fieldChange.previousValue = originals;
      fieldChange.currentValue = delta;
    }
    result.before![key] = fieldChange.previousValue;
    result.after![key] = fieldChange.currentValue;
  }
  return result;
}

// Given a dataset snapshot and a history entry, reconstruct the obsolete history entry
export function convertGenericHistoryToObsoleteHistory(
  history: GenericHistory,
  datasetSnapshot: Partial<DatasetClass>,
): HistoryClass {
  const result: HistoryClass = {
    updatedAt: history.timestamp,
    updatedBy: history.user ?? "",
    _id: "",
  };
  for (const field in history.before) {
    if (IGNORE_FIELDS.includes(field)) {
      continue;
    }
    if (field === "datasetlifecycle" && datasetSnapshot.datasetlifecycle) {
      const beforePartial = (history.before[field] || {}) as Record<
        string,
        unknown
      >;
      const afterPartial = (history.after?.[field] || {}) as Record<
        string,
        unknown
      >;
      // omit keys that are only in afterPartial, as it means they were added in this update
      // and apply beforePartial to the resulting datasetlifecycle snapshot
      const reconstructedBefore = {
        ...JSON.parse(
          JSON.stringify(
            omit(
              datasetSnapshot.datasetlifecycle,
              Object.keys(afterPartial).filter(
                (key) => !(key in beforePartial),
              ),
            ),
          ),
        ),
        ...beforePartial,
      };

      history.before[field] = reconstructedBefore;

      history.after![field] = JSON.parse(
        JSON.stringify(datasetSnapshot.datasetlifecycle),
      );
    }
    result[field] = {
      previousValue: history.before[field],
      currentValue: history.after?.[field],
    };
  }
  return result;
}

// starting from the latest dataset, replay the history entries in reverse order to reconstruct the obsolete history entries.
// assumes histories is sorted in descending order of updatedAt
export function convertGenericHistoriesToObsoleteHistories(
  histories: GenericHistory[],
  currentDataset: DatasetDocument | DatasetClass,
): HistoryClass[] {
  const result: HistoryClass[] = [];
  for (const history of histories) {
    const obsoleteHistory = convertGenericHistoryToObsoleteHistory(
      history,
      currentDataset,
    );
    for (const key of Object.keys(history.before || {})) {
      (currentDataset as unknown as Record<string, unknown>)[key] =
        history.before?.[key];
    }
    result.push(obsoleteHistory);
  }
  return result;
}
