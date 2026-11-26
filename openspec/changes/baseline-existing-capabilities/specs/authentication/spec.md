# Spec Delta

## Purpose

Authenticates users by local password, LDAP, or OpenID Connect, issues bearer tokens, and resolves each user's access groups.

## ADDED Requirements

### Requirement: Local login
`POST /api/v3/auth/login` SHALL accept `{ username, password }`, verify the password against the stored hash, and return 201 with `{ access_token, id, expires_in, ttl, created, userId, user }` where `id` equals `access_token`. Invalid credentials SHALL return 401.

#### Scenario: Valid credentials
- **WHEN** a local user posts correct credentials
- **THEN** the response is 201 with a bearer token in `access_token` and `id`

#### Scenario: Wrong password
- **WHEN** a user posts an incorrect password
- **THEN** the response is 401

### Requirement: LDAP login
`POST /api/v3/auth/ldap` (and legacy `POST /api/v3/auth/msad`) SHALL authenticate against the configured LDAP server and return the login response. On first login a user and identity SHALL be created; on every login the user's access groups SHALL be refreshed.

#### Scenario: First LDAP login
- **WHEN** an LDAP user without a SciCat account logs in successfully
- **THEN** a user with `authStrategy: "ldap"` is created and a token is returned

### Requirement: OIDC login
When `OIDC_ISSUER` is set, `GET /api/v3/auth/oidc` SHALL redirect to the identity provider and `GET /api/v3/auth/oidc/callback` SHALL redirect to the success URL with `access-token`, `user-id`, and `returnUrl` query parameters. A `client` other than `scicat` SHALL be listed in `OIDC_FRONTEND_CLIENTS`, else 401.

#### Scenario: Unknown frontend client
- **WHEN** `GET /api/v3/auth/oidc?client=unknown` is called
- **THEN** the response is 401 "Unauthorized client"

### Requirement: OIDC user provisioning
On OIDC login the system SHALL map claims to a user (configurable via `OIDC_USERINFO_MAPPING_FIELD_*`), create the user with `authStrategy: "oidc"` if none matches, and otherwise overwrite the stored username and identity from the latest claims.

#### Scenario: Returning OIDC user
- **WHEN** an existing OIDC user logs in with changed profile claims
- **THEN** the stored identity reflects the new claims

### Requirement: ID token exchange
`POST /api/v3/auth/oidc/token` SHALL exchange a valid OIDC `idToken` for a SciCat login response. Invalid tokens, or tokens from parties not in `OIDC_ADDITIONAL_AUTHORIZED_PARTIES`, SHALL return 401. The endpoint SHALL be rate-limited.

#### Scenario: Untrusted audience
- **WHEN** an ID token issued to an unlisted client is posted
- **THEN** the response is 401

### Requirement: Bearer token handling
Tokens SHALL be signed with `JWT_SECRET` (startup fails without it) and expire after `JWT_EXPIRES_IN` seconds (default 3600). They SHALL be accepted in the `Authorization: Bearer` header or the `access_token` query parameter. An expired token SHALL return 401 `SESSION_EXPIRED`; a missing or invalid token SHALL be treated as anonymous.

#### Scenario: Invalid token on public endpoint
- **WHEN** a request carries a malformed token
- **THEN** it is processed as an anonymous request

#### Scenario: Expired token
- **WHEN** a request carries an expired token
- **THEN** the response is 401 `SESSION_EXPIRED`

### Requirement: Groups resolved per request
The caller's effective groups SHALL be recomputed from stored data on every request (role names plus identity access groups), not taken from the token. `GET /api/v3/auth/whoami` SHALL return `{ _id, username, email, currentGroups, authStrategy }`.

#### Scenario: Group change after login
- **WHEN** a user's stored access groups change while their token is still valid
- **THEN** the next request uses the new groups

### Requirement: Access group providers
At login, access groups SHALL be the combined output of each enabled provider: static values (`ACCESS_GROUPS_STATIC_*`, enabled by default), OIDC claim, LDAP groups, GraphQL service, and REST service. A failing provider SHALL contribute no groups and SHALL NOT block login.

#### Scenario: REST provider unavailable
- **WHEN** the REST group service errors during login
- **THEN** login succeeds with groups from the other providers

### Requirement: Logout
`POST /api/v3/auth/logout` SHALL return `{ logout: "successful" }` for an authenticated user and 401 otherwise. For OIDC users with auto-logout (default on), the response SHALL include a `logoutURL`.

#### Scenario: Anonymous logout
- **WHEN** an unauthenticated client calls logout
- **THEN** the response is 401 "Not logged in"

### Requirement: Default settings on login
After any successful login, the system SHALL create user settings with `datasetCount` 25, `jobCount` 25, and empty `externalSettings` if none exist.

#### Scenario: First login
- **WHEN** a user logs in for the first time
- **THEN** default user settings exist for that user
