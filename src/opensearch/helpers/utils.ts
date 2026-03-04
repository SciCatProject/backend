import {
  AggregateBase,
  SingleBucketAggregateBase,
} from "@opensearch-project/opensearch/api/_types/_common.aggregations";

export const transformKey = (key: string): string => {
  return key.trim().replace(/[.]/g, "\\.").replace(/ /g, "_").toLowerCase();
};

export const transformFacets = (
  aggregation: AggregateBase,
): Record<string, unknown>[] => {
  const transformed = Object.entries(aggregation).reduce(
    (acc, [key, value]) => {
      const isBucketArray = Array.isArray(value.buckets);

      acc[key] = isBucketArray
        ? value.buckets.map((bucket: SingleBucketAggregateBase) => ({
            _id: bucket.key,
            count: bucket.doc_count,
          }))
        : [{ totalSets: value.value }];

      return acc;
    },
    {} as any,
  );

  return [transformed];
};
