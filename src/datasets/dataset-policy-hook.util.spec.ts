import { Schema } from "mongoose";
import type { PoliciesService } from "src/policies/policies.service";
import { applyDatasetPolicyHookOnce } from "./dataset-policy-hook.util";

type SaveHook = (
  this: Record<string, unknown>,
  next: () => void,
) => Promise<void>;

describe("applyDatasetPolicyHookOnce", () => {
  let schema: Schema;
  let policyService: {
    findOne: jest.Mock;
    addDefaultPolicy: jest.Mock;
  };

  beforeEach(() => {
    schema = new Schema();
    policyService = {
      findOne: jest.fn(),
      addDefaultPolicy: jest.fn(),
    };
  });

  const registerHook = (): SaveHook => {
    const pre = jest.spyOn(schema, "pre");
    applyDatasetPolicyHookOnce(
      schema,
      policyService as unknown as PoliciesService,
    );
    return pre.mock.calls[0][1] as unknown as SaveHook;
  };

  it("registers the save hook once across repeated factory runs", () => {
    const pre = jest.spyOn(schema, "pre");

    for (let i = 0; i < 3; i++) {
      applyDatasetPolicyHookOnce(schema, {
        ...policyService,
      } as unknown as PoliciesService);
    }

    expect(pre).toHaveBeenCalledTimes(1);
    expect(pre).toHaveBeenCalledWith("save", expect.any(Function));
    expect(schema._datasetPolicyHookApplied).toBe(true);
  });

  it("sets _id and classification from the owner group policy", async () => {
    policyService.findOne.mockResolvedValue({ tapeRedundancy: "high" });
    const hook = registerHook();
    const dataset: Record<string, unknown> = {
      pid: "pid-1",
      ownerGroup: "group",
    };
    const next = jest.fn();

    await hook.call(dataset, next);

    expect(policyService.findOne).toHaveBeenCalledWith({ ownerGroup: "group" });
    expect(policyService.addDefaultPolicy).not.toHaveBeenCalled();
    expect(dataset._id).toBe("pid-1");
    expect(dataset.classification).toBe("IN=medium,AV=high,CO=low");
    expect(next).toHaveBeenCalled();
  });

  it("adds a default policy from the classification when none exists", async () => {
    policyService.findOne.mockResolvedValue(null);
    const hook = registerHook();
    const dataset: Record<string, unknown> = {
      _id: "existing-id",
      pid: "pid-1",
      ownerGroup: "group",
      accessGroups: ["access"],
      createdBy: "creator",
      classification: "IN=low,AV=high,CO=low",
    };
    const next = jest.fn();

    await hook.call(dataset, next);

    expect(policyService.addDefaultPolicy).toHaveBeenCalledWith(
      "group",
      ["access"],
      "",
      "high",
      "creator",
    );
    expect(dataset._id).toBe("existing-id");
    expect(dataset.classification).toBe("IN=medium,AV=high,CO=low");
    expect(next).toHaveBeenCalled();
  });
});
