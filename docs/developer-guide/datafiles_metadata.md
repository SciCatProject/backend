# Datafile Metadata

Datafile objects can carry optional file-specific metadata in the `metadata`
field. This field is available on each entry of an origdatablock
`dataFileList`.

```json
{
  "path": "raw/run-0001.nxs",
  "size": 1048576,
  "time": "2026-06-02T08:00:00Z",
  "chk": "2cf24dba5fb0a30e26e83b2ac5b9e29e",
  "metadata": {
    "duration": 12.5,
    "measurement_type": "scan"
  }
}
```

The backend stores `metadata` as a JSON object:

```ts
metadata?: Record<string, unknown>;
```

>**Important**:
>This field is intended for facility specific file-level metadata. For aggregate metadata that should be searchable and shown more prominently to users, prefer the dataset `scientificMetadata` field. Note that these metadata are not searchable at Dataset level.

## Configuration

Datafile metadata validation is configured with the
`DATAFILES_METADATA_SCHEMA` environment variable.

```sh
DATAFILES_METADATA_SCHEMA="datafilesMetadataSchema.example.json"
```

The environment variable points to a JSON Schema file. During application
configuration, `src/config/configuration.ts` reads and parses that file, then
exposes the parsed schema object through the Nest configuration key
`datafilesMetadataSchema`.

If `DATAFILES_METADATA_SCHEMA` is not set, `configuration.ts` uses
`datafilesMetadataSchema.json` as the default schema path. If that file is
missing, it falls back to `datafilesMetadataSchema.example.json`. The default
schema shipped with the backend is closed and rejects non-empty metadata until a
facility configures allowed fields. If both the default schema file and example
schema file are missing, the current configuration loader stores a schema
object (`{type: "object", additionalProperties: false}`), which would still reject all non empty metadata.

The example schema is deliberately closed:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

With this schema, omitted or empty datafile metadata is valid, but any
non-empty metadata object is rejected until the facility configures the allowed
metadata fields.

## Schema Draft

The validation pipe uses the default Ajv import, which validates draft-07
schemas. Schema files should declare the draft-07 meta-schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## Example Facility Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "minimum": 0
    },
    "measurement_type": {
      "type": "string",
      "enum": ["scan", "calibration", "dark"]
    },
    "detector": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "distance_mm": { "type": "number" }
      },
      "required": ["name"],
      "additionalProperties": false
    }
  },
  "required": ["measurement_type"],
  "additionalProperties": false
}
```

To allow arbitrary top-level metadata keys, configure
`additionalProperties: true` explicitly or simply remove it entirely:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
}
```

For nested objects, define `additionalProperties` in the nested schema too if
unknown nested keys should be rejected.

## Validation Mechanism

Validation is implemented by `DatafilesMetadataValidationPipe` in
`src/origdatablocks/pipes/datafiles-metadata-validation.pipe.ts`.

For each request body handled by this pipe:

1. The default schema in case of missing configuration is:
   ```json
   {
     "type": "object",
     "additionalProperties": false
   }
   ```
2. If the request body has no `dataFileList`, the pipe returns without metadata
   validation. This allows partial update bodies that do not touch files.

3. Each entry in `dataFileList` is checked.
4. Each datafile `metadata` value is validated. If a datafile omits `metadata`,
   the pipe validates an empty object (`{}`).
5. Invalid metadata causes HTTP 400 with the validation error details.
6. A schema that cannot be compiled by Ajv causes HTTP 500 because it is a
   server configuration problem.

Invalid metadata produces an error like:

```text
Datafile metadata is not following the configured schema: metadata/duration must be number
```

## Validated Routes

The pipe validates origdatablock request bodies on routes where
`@UsePipes(DatafilesMetadataValidationPipe)` is applied.

Current covered routes:

- `POST /origdatablocks` in the v3 controller
- `PATCH /origdatablocks/:id` in the v3 controller
- `POST /origdatablocks` in the v4 controller
- `POST /origdatablocks/isValid` in the v4 controller
- `PATCH /origdatablocks/:id` in the v4 controller

Any future route that accepts origdatablock `dataFileList` input must also use
this pipe if datafile metadata should be validated there.

## Request Examples

Accepted when the configured schema allows `duration` and
`measurement_type`:

```json
{
  "datasetId": "20.500.12345/example-dataset",
  "size": 1048576,
  "dataFileList": [
    {
      "path": "raw/run-0001.nxs",
      "size": 1048576,
      "time": "2026-06-02T08:00:00Z",
      "metadata": {
        "duration": 12.5,
        "measurement_type": "scan"
      }
    }
  ]
}
```

Rejected by the closed example schema:

```json
{
  "path": "raw/run-0001.nxs",
  "size": 1048576,
  "time": "2026-06-02T08:00:00Z",
  "metadata": {
    "operator_comment": "extra key"
  }
}
```