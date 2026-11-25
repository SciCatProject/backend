# Spec Delta

## Purpose

Maintains a searchable index of metadata keys used by datasets, proposals, samples, and instruments, with usage counts and group visibility.

## ADDED Requirements

### Requirement: Key index maintenance
Creating, updating, or deleting a single dataset, proposal, sample, or instrument SHALL update the index from its `scientificMetadata`, `metadata`, `sampleCharacteristics`, or `customMetadata`. Keys SHALL be identified by source type, key, and `human_name`. There SHALL be no write API.

#### Scenario: Key renamed
- **WHEN** a dataset's metadata entry changes its `human_name`
- **THEN** the old index entry is removed and a new one created

### Requirement: Usage counting
Each key SHALL track `usageCount` and `userGroups` (owner and access groups of the sources). Removing the last use SHALL delete the key; groups with no remaining uses SHALL be removed. `isPublished` SHALL become true when any published source uses the key.

#### Scenario: Last use removed
- **WHEN** the only dataset using a key is deleted
- **THEN** the key is removed from the index

### Requirement: Instrument keys
Keys from instruments SHALL be published and have no user groups.

#### Scenario: Anonymous sees instrument keys
- **WHEN** an anonymous client lists metadata keys
- **THEN** instrument keys are included

### Requirement: Query keys
`GET /api/v4/metadatakeys` SHALL take a whitelisted JSON `filter` (`where`, `fields`, `limits`; default limit 100, sort `createdAt` desc). Anonymous callers SHALL see published keys; authenticated users also keys of their groups; admins all.

#### Scenario: Group-restricted key
- **WHEN** a user lists keys and a key's `userGroups` do not include their groups and it is unpublished
- **THEN** that key is not returned
