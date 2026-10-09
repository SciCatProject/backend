import { Schema } from "mongoose";
import type { PoliciesService } from "src/policies/policies.service";
import { DatasetClass } from "./schemas/dataset.schema";

// The Dataset model factory injects the request-scoped PoliciesService, so Nest
// runs it on every request. Mongoose copies schema hooks into the model only
// when it first compiles it, so a hook added by a later run never executes, but
// its closure keeps that run's PoliciesService and request alive. Register once.
export function applyDatasetPolicyHookOnce(
  schema: Schema,
  policyService: PoliciesService,
) {
  if (schema._datasetPolicyHookApplied) {
    return schema;
  }

  schema.pre<DatasetClass>("save", async function (next) {
    // if _id is empty or differnet than pid,
    // set _id to pid
    if (!this._id) {
      this._id = this.pid;
    }
    const policy = await policyService.findOne({
      ownerGroup: this.ownerGroup,
    });
    let av: string;
    if (policy) {
      av = policy.tapeRedundancy || "low";
    } else {
      const regexLiteral = /(?<=AV\=)(.*?)(?=\,)/g;
      av = (regexLiteral.exec(this.classification ?? "") || ["low"])[0];
      await policyService.addDefaultPolicy(
        this.ownerGroup,
        this.accessGroups,
        this.ownerEmail ?? "",
        av,
        this.createdBy,
      );
    }
    this.classification = `IN=medium,AV=${av},CO=low`;
    next();
  });
  schema._datasetPolicyHookApplied = true;

  return schema;
}
