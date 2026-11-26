# Spec Delta

## Purpose

Defines the shared permission model: group-based ownership and visibility of records, and configurable privileged groups that grant broader rights.

## ADDED Requirements

### Requirement: Group identity
All permission checks SHALL compare against the caller's current groups (role names plus resolved access groups). Permissions from all matching groups SHALL be combined.

#### Scenario: User in two privileged groups
- **WHEN** a user belongs to both a create group and a delete group
- **THEN** the user has both sets of rights

### Requirement: Endpoint authentication modes
Endpoints for users, user identities, history, and most sample and v4 published-data operations SHALL return 401 to anonymous callers. Other endpoints SHALL evaluate permissions for anonymous callers and return 403 when denied.

#### Scenario: Anonymous reads private dataset
- **WHEN** an anonymous client requests an unpublished dataset
- **THEN** the response is 403

### Requirement: Record visibility
Datasets, proposals, samples, and attachments SHALL be readable when published, or when the caller's groups include the record's `ownerGroup` or any of its `accessGroups`. Datablocks and origdatablocks SHALL apply the same rule to their own ownership fields, which are copied from their dataset on create. A failed check on an existing record SHALL return 403.

#### Scenario: Access group member
- **WHEN** a user in one of a private dataset's `accessGroups` reads it
- **THEN** the dataset is returned

### Requirement: List filtering
List and search endpoints SHALL filter results rather than reject: anonymous callers see only published records; regular users see records they own, are granted via accessGroups, or that are published; callers with any-access rights see all. v4 dataset and origdatablock lists SHALL instead reject anonymous callers with 403 and offer `/public` endpoints.

#### Scenario: Anonymous v3 dataset list
- **WHEN** an anonymous client lists datasets via `/api/v3/datasets`
- **THEN** only datasets with `isPublished: true` are returned

#### Scenario: Anonymous v4 dataset list
- **WHEN** an anonymous client lists datasets via `/api/v4/datasets`
- **THEN** the response is 403

### Requirement: Privileged group configuration
Privileged groups SHALL be configured by comma-separated `*_GROUPS` environment variables: admin, delete, dataset create tiers and lifecycle, proposal, sample, attachment, policy, job create/update/delete, and per-entity history access. The value `#all` SHALL mean every authenticated user.

#### Scenario: Open dataset creation
- **WHEN** `CREATE_DATASET_GROUPS` is `#all`
- **THEN** any authenticated user may create datasets for groups they belong to

### Requirement: Dataset creation tiers
`CREATE_DATASET_GROUPS` SHALL allow creating datasets only for an own `ownerGroup` and without a `pid`. `CREATE_DATASET_WITH_PID_GROUPS` SHALL also allow supplying a `pid`. `CREATE_DATASET_PRIVILEGED_GROUPS` SHALL allow any `ownerGroup` and `pid`. All three SHALL update only datasets they own.

#### Scenario: Foreign owner group
- **WHEN** a member of `CREATE_DATASET_GROUPS` creates a dataset with an `ownerGroup` they are not in
- **THEN** the response is 403

#### Scenario: Supplying a pid without pid rights
- **WHEN** a member of only `CREATE_DATASET_GROUPS` supplies a `pid`
- **THEN** the response is 403

### Requirement: Delete separated from admin
Deleting datasets, proposals, samples, instruments, policies, published data, datablocks, and origdatablocks SHALL require `DELETE_GROUPS` membership. Admin groups alone SHALL NOT grant deletion of these. Attachments are the exception (see the attachments capability).

#### Scenario: Admin deletes dataset
- **WHEN** a user in `ADMIN_GROUPS` but not `DELETE_GROUPS` deletes a dataset
- **THEN** the response is 403

### Requirement: Admin rights
Admin groups SHALL read, create, and update any dataset, proposal, sample, attachment, and job, and create and update instruments.

#### Scenario: Admin reads private proposal
- **WHEN** an admin requests a proposal owned by another group
- **THEN** the proposal is returned

### Requirement: Entity-specific grants
`UPDATE_DATASET_LIFECYCLE_GROUPS` SHALL read and lifecycle-update any dataset. `PROPOSAL_GROUPS` SHALL create, read, and update any proposal. `SAMPLE_PRIVILEGED_GROUPS` SHALL create samples for any owner group. `POLICY_GROUPS` SHALL manage policies. Instruments SHALL be readable by everyone.

#### Scenario: Anonymous instrument list
- **WHEN** an anonymous client lists instruments
- **THEN** instruments are returned
