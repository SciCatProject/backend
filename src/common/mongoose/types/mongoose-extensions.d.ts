import "mongoose";

declare module "mongoose" {
  interface Schema {
    // This flag lets us check if a plugin was already applied,
    // ensuring plugin logic runs only once per schema instance
    _historyPluginApplied?: boolean;
    _datasetPolicyHookApplied?: boolean;
  }
}
