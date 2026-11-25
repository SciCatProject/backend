# Spec Delta

## Purpose

Manages user records, identities, settings, passwords, and user tokens, with users acting on their own records and admins on any.

## ADDED Requirements

### Requirement: User provisioning
Users SHALL be created only from the functional accounts file (`FUNCTIONAL_ACCOUNTS_FILE`) at startup, as local users, or on first LDAP/OIDC login. Existing functional accounts SHALL NOT be recreated. There SHALL be no API to create or delete users or roles.

#### Scenario: Restart with existing account
- **WHEN** the backend restarts and a functional account already exists
- **THEN** the stored account is kept

### Requirement: Self-or-admin access
`/api/v3/users` endpoints (except `POST /users/jwt`, `/users/login`, `/users/logout`) SHALL require authentication (401 otherwise). Non-admins SHALL act only on their own record (403 otherwise); admin groups SHALL act on any. `GET /users` SHALL return all users to admins and only the caller to others.

#### Scenario: Read another user's record
- **WHEN** a non-admin calls `GET /api/v3/users/<other id>`
- **THEN** the response is 403

### Requirement: Own profile shortcuts
`GET /api/v3/users/my/self`, `/my/identity`, and `/my/settings` SHALL return the caller's user, identity, and settings.

#### Scenario: Anonymous self lookup
- **WHEN** an unauthenticated client calls `GET /api/v3/users/my/self`
- **THEN** the response is 401

### Requirement: User settings
Settings SHALL hold `datasetCount` (default 25), `jobCount` (default 25), and free-form `externalSettings`. The system SHALL support create, read, upsert (PUT), partial update (PATCH), per-key merge into `externalSettings` (`PATCH /users/:id/settings/external`), and delete.

#### Scenario: Merge external setting
- **WHEN** a user patches `/users/<own id>/settings/external` with `{ "columns": [...] }`
- **THEN** only `externalSettings.columns` is replaced and other keys remain

### Requirement: Own password change
`POST /api/v3/users/password` SHALL change a local user's password given `currentPassword`, `newPassword`, and `confirmPassword`. A mismatched confirmation or wrong current password SHALL return 400; a non-local user SHALL get 403.

#### Scenario: Wrong current password
- **WHEN** a local user submits an incorrect `currentPassword`
- **THEN** the response is 400 "Current password is incorrect"

### Requirement: Admin password reset
`PATCH /api/v3/users/:id/password` SHALL let admins set a local user's password. Non-admins SHALL get 403; non-local targets SHALL get 403.

#### Scenario: Non-admin reset
- **WHEN** a non-admin calls `PATCH /api/v3/users/<id>/password`
- **THEN** the response is 403

### Requirement: Generic user token
`POST /api/v3/users/jwt` SHALL be callable without authentication and return `{ jwt }` with `{ username: "anonymous", groups: ["public"] }` for anonymous callers, or the caller's id and groups otherwise.

#### Scenario: Anonymous token
- **WHEN** an unauthenticated client calls `POST /api/v3/users/jwt`
- **THEN** a token with groups `["public"]` is returned

### Requirement: Admin-issued user token
`POST /api/v3/users/:id/jwt` SHALL let admins mint a bearer token for any user with optional `expiresIn` (seconds, or `never` for `JWT_NEVER_EXPIRES`, default `100y`). Non-admins SHALL get 403, even for their own id.

#### Scenario: Long-lived service token
- **WHEN** an admin posts `{ "expiresIn": "never" }` for a user
- **THEN** a token authenticating as that user is returned

### Requirement: Dataset creation check
`GET /api/v3/users/:id/authorization/dataset/create` SHALL return `{ authorization: boolean }` stating whether that user may create datasets.

#### Scenario: Self check
- **WHEN** a user queries their own dataset-create authorization
- **THEN** a boolean result is returned

### Requirement: User identities
`GET /api/v3/useridentities/findOne` SHALL return one identity matching a filter, scoped to the caller's own identity for non-admins (403 for another user's, 404 if none). `GET /useridentities/isValidEmail` SHALL be admin-only and return whether any identity matches.

#### Scenario: No identity match
- **WHEN** a user's filter matches no identity
- **THEN** the response is 404
