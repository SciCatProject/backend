# Spec Delta

## Purpose

Exposes a public liveness check for the database dependency and optionally logs per-request access metrics.

## ADDED Requirements

### Requirement: Health check
`GET /api/v3/health` SHALL be public and report MongoDB reachability under the key `mongodb` in the `{ status, info, error, details }` shape, responding 200 when healthy and 503 when not.

#### Scenario: Database reachable
- **WHEN** an unauthenticated client calls `GET /api/v3/health` and MongoDB responds to ping
- **THEN** the response is 200 with `status: "ok"`

### Requirement: Access metrics flag
Access tracking SHALL be active only when `METRICS_ENABLED` is `yes`. Tracked routes SHALL come from the `include` and `exclude` lists (path, method, version) in `METRICS_CONFIG_FILE`. If both lists are empty, nothing SHALL be tracked.

#### Scenario: Excluded route
- **WHEN** metrics are enabled and a request hits a route in `exclude`
- **THEN** no access record is logged

### Requirement: Access record content
Each tracked response SHALL produce one `SciCatAccessLogs` log entry containing `userId` (from a valid bearer token, otherwise `anonymous`), `originIp` (`X-Forwarded-For` or `-`), `endpoint`, `query`, `statusCode`, and `responseTime`. Records SHALL go to the configured loggers. No metrics endpoint SHALL exist.

#### Scenario: Anonymous request tracked
- **WHEN** an unauthenticated request to a tracked route completes
- **THEN** a record with `userId: "anonymous"` is logged

### Requirement: Access record suppression
The system SHALL NOT log 304 responses, requests from user agents matching bot, crawl, spider, or slurp, or repeat requests with the same user, IP, and path within 1 second.

#### Scenario: Rapid repeat
- **WHEN** the same user requests the same path twice within one second
- **THEN** only one record is logged
