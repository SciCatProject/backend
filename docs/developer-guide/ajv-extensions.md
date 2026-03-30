# Extending Ajv

## Overview

SciCat uses the [Ajv library](https://ajv.js.org/) to validate metadata for `PublishedData` objects against the configured JSON Schema.

Ajv provides mechanisms to overcome some limitations of JSON Schema by allowing to register custom code to be run during the validation process.

SciCat backend can load an external javascript module containing facility-specific code at runtime and execute it during validation.

Supported features:
- registering new [keywords](https://ajv.js.org/keywords.html)
- registering new [dynamicDefaults functions](https://ajv.js.org/packages/ajv-keywords.html#dynamicdefaults)

## Writing your own extensions

Custom code will be loaded as a [Javascript Module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by the backend.

To load a module, define the `AJV_CUSTOM_DEFINITIONS_FILE` environment variable with the path to your module.

It should export two symbols:
- `keywords` an array of custom keyword definitions
- `dynamicDefaults` a map of function name / function

see [the example file](../../ajvCustomDefinitions.example.js).

⚠️ Ajv expects higher-order functions (i.e., a function that returns another function).

### Synchronous functions

If a function is synchronous, it will simply be registered in ajv and its execution is entirely delegated to the library.

Example:
```js
export const dynamicDefaults = new Map([
    ["mySyncDynamicDefault", () => () => Math.random()]
]);
```

### Asynchronous functions

If you need to execute asynchronous code, you should declare your function `async` (only supported for dynamicDefaults).
It should return a synchronous function as ajv will not resolve any `Promise` returned by custom code.

Asynchronous functions have access to additional context via the `ctx` argument:
- The `PublishedData` instance being validated
- Read-only access to the following services: `ProposalsService`, `DatasetsService` and `AttachmentsService`

Currently only the following methods are supported on read-only services:
- `findOne`
- `findAll`
- `count`

Example:
```js
export const dynamicDefaults = new Map([
  [
    "mergeKeywords",
    async (ctx) => {
      // Make async DB access
      // This will be executed by the ValidatorService
      const datasets = await ctx.datasetsService.findAll({
        where: {
          $or: ctx.publishedData.datasetPids.map((p) => ({
            pid: p,
          })),
        },
      });

      // Return a synchronous function processing data fetched from the DB
      // This will be executed by ajv
      return () => {
        if (!datasets) return;

        const uniqueKeywords = new Set(datasets.flatMap((ds) => ds.keywords || []));
        return Array.from(uniqueKeywords).map((k) => ({
          subject: k,
          lang: "en",
        }));
      };
    },
  ],
]);
```
