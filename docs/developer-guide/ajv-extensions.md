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

To indicate to backend where the module is located, use the `AJV_CUSTOM_DEFINITIONS_FILE` environment variable.

It should export two symbols:
- `keywords` an array of custom keyword definitions
- `dynamicDefaults` a map of function name / function

see [the example file](../../ajvCustomDefinitions.example.js).
