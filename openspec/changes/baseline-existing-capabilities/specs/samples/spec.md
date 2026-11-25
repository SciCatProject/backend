# Spec Delta

## Purpose

Stores physical samples with free-form characteristics, linked to proposals, datasets, and attachments.

## ADDED Requirements

### Requirement: Create sample
`POST /api/v3/samples` SHALL require a non-empty `sampleName`, generate a UUID `sampleId` when none is given, use `sampleId` as the record id, and default `sampleCharacteristics` to `{}` and `isPublished` to false.

#### Scenario: No sampleId supplied
- **WHEN** a sample is created without `sampleId`
- **THEN** the response is 201 with a generated UUID `sampleId`

### Requirement: Sample write permissions
`SAMPLE_GROUPS` (default `#all`) SHALL create and update samples only for owner groups they belong to. `SAMPLE_PRIVILEGED_GROUPS` SHALL also create samples for any owner group. Deletion SHALL require `DELETE_GROUPS`.

#### Scenario: Foreign owner group
- **WHEN** a `SAMPLE_GROUPS` member creates a sample for a group they are not in
- **THEN** the response is 403

### Requirement: Authentication for samples
`GET /api/v3/samples`, `GET /:id`, `GET /:id/authorization`, and `GET /:id/attachments` SHALL be available anonymously, limited to published samples. Other sample endpoints, except delete, SHALL return 401 to anonymous callers.

#### Scenario: Anonymous count
- **WHEN** an anonymous client calls `GET /api/v3/samples/count`
- **THEN** the response is 401

### Requirement: Characteristics encoding
Characteristic keys containing spaces or dots SHALL be stored safely and returned unchanged. Entries with a value and unit SHALL gain SI-normalised `valueSI` and `unitSI`.

#### Scenario: Key with a dot
- **WHEN** a sample is created with characteristic key `temp.max`
- **THEN** reading the sample returns key `temp.max`

### Requirement: Query samples
`GET /api/v3/samples` (`filter`), `/fullquery`, and `/count` SHALL apply access filtering and support `fields.characteristics` conditions (`lhs`, `relation`, `rhs`) and `fields.text`. `GET /findOne` SHALL return the first accessible match, optionally including `attachments` or `datasets`, or `{}` when none matches.

#### Scenario: Characteristic condition
- **WHEN** fullquery filters `characteristics` with relation `EQUAL_TO_STRING`
- **THEN** only samples whose characteristic equals that string are returned

### Requirement: Metadata keys
`GET /api/v3/samples/metadataKeys` SHALL return distinct characteristic keys, excluding keys ending in `_date`, optionally filtered by `fields.metadataKey` substring and capped by `METADATA_KEYS_RETURN_LIMIT`.

#### Scenario: Date key excluded
- **WHEN** samples have a characteristic `start_date`
- **THEN** it is not returned

### Requirement: Update and delete
`PATCH /api/v3/samples/:id` SHALL partially update and return 412 on a stale `If-Unmodified-Since`. `DELETE` SHALL return the deleted sample. Unknown ids SHALL return 404.

#### Scenario: Delete unknown sample
- **WHEN** a delete-group member deletes a nonexistent sample
- **THEN** the response is 404

### Requirement: Sample attachments and datasets
Attachments created under `/api/v3/samples/:id/attachments` SHALL take `sampleId` from the path and inherit the sample's `ownerGroup` and `accessGroups`. `GET /:id/datasets` SHALL require read access to the sample and return only datasets the caller may read.

#### Scenario: Unreadable sample datasets
- **WHEN** a user requests datasets of a sample they cannot read
- **THEN** the response is 403
