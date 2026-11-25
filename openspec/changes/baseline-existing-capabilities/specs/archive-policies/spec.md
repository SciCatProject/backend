# Spec Delta

## Purpose

Holds one archive/retrieve policy per owner group (tape redundancy, auto-archive, notifications, embargo), created automatically when a group first stores a dataset.

## ADDED Requirements

### Requirement: Policy management
`/api/v3/policies` SHALL support create, list, count, read, and partial update for `ADMIN_GROUPS` and `POLICY_GROUPS`, and delete for `DELETE_GROUPS`. Other callers SHALL get 403.

#### Scenario: Regular user lists policies
- **WHEN** a user outside the policy and admin groups calls `GET /api/v3/policies`
- **THEN** the response is 403

### Requirement: Policy fields and defaults
A policy SHALL hold `manager[]`, `tapeRedundancy` (default `low`), `autoArchive` (default true), `autoArchiveDelay` days (default 7), archive/retrieve email notification flags (default false) and recipient lists, and `embargoPeriod` years (default 3).

#### Scenario: Minimal policy
- **WHEN** a policy is created with only `ownerGroup`
- **THEN** defaults are applied to the other fields

### Requirement: Bulk update by owner group
`POST /api/v3/policies/updateWhere` SHALL accept `ownerGroupList` (comma-separated) and `data`, creating a default policy for any group without one, then applying `data`. Externally authenticated callers SHALL be listed in that policy's `manager`, else 401.

#### Scenario: Caller not manager
- **WHEN** an externally authenticated user not in a policy's `manager` calls updateWhere for its group
- **THEN** the response is 401

### Requirement: Default policy on dataset creation
When a dataset is saved and no policy exists for its `ownerGroup`, the system SHALL create one with the dataset's `accessGroups`, managers from `ownerEmail`, tape redundancy from the `AV=` part of `classification` (else `low`), auto-archive off, and notifications on.

#### Scenario: First dataset for a group
- **WHEN** the first dataset of group G is created
- **THEN** a policy for G exists afterwards

### Requirement: Dataset classification
On every dataset save, the dataset's `classification` SHALL be set to `IN=medium,AV=<redundancy>,CO=low`, using the group policy's tape redundancy.

#### Scenario: High-redundancy group
- **WHEN** a dataset is saved for a group whose policy has `tapeRedundancy: high`
- **THEN** its classification is `IN=medium,AV=high,CO=low`
