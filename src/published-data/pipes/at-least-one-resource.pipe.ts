import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import {
  createNoResourceIdsProvidedError,
  hasAtLeastOneResourceId,
  ResourceIdFields,
} from "./resource-id.validation";

/**
 * Validation pipe that ensures at least one of the resource ID fields
 * (datasetPids, proposalIds, sampleIds, instrumentIds) contains at least one non-empty element.
 *
 * This pipe is used for API v4 endpoints to enforce the business rule that
 * PublishedData must be associated with at least one resource type.
 */
@Injectable()
export class AtLeastOneResourcePipe implements PipeTransform {
  /**
   * Transforms and validates the input value.
   *
   * @param value - The DTO object containing resource ID fields
   * @returns The validated value if at least one ID field has elements
   * @throws BadRequestException if no valid ID fields are provided
   */
  transform(value: ResourceIdFields) {
    if (hasAtLeastOneResourceId(value ?? {})) {
      return value;
    }

    throw new BadRequestException(createNoResourceIdsProvidedError());
  }
}
