import { ClassConstructor } from "class-transformer";

/**
 * MongoDB collection names that the SSE listener may watch.
 */
export type WatchableCollection =
  | "Attachment"
  | "RuntimeConfig"
  | "Dataset"
  | "Proposal"
  | "Sample"
  | "PublishedData"
  | "MetadataKeys"
  | "Datablock"
  | "Instrument"
  | "Job"
  | "OrigDatablock"
  | "History";

/**
 * How a watched collection maps to an SSE entity name and the DTO used to
 * serialize raw MongoDB documents before they are pushed to clients.
 */
export interface SseRegistryEntry {
  entity: string;
  dto: ClassConstructor<object>;
}

export type SseRegistry = Partial<
  Record<WatchableCollection, SseRegistryEntry>
>;
