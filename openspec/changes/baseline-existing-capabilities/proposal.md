# Proposal

## Why

The project has adopted OpenSpec but has no specs, so future changes have no behavior baseline to diff against. This change records the backend's current, externally observable behavior as capability specs.

## What Changes

- Add one baseline spec per existing capability, describing behavior as it is today (verified against source and API tests).
- No code, API, schema, or configuration changes. Nothing is **BREAKING**.

## Capabilities

### New Capabilities
- `datasets`: Raw/derived dataset CRUD, querying, public access, and v3/v4 API differences.
- `orig-datablocks`: Original file listings attached to datasets.
- `datablocks`: Archive containers describing how dataset files were packed.
- `attachments`: Small binary attachments (e.g. thumbnails) linked to datasets, samples, proposals.
- `proposals`: Proposals and measurement periods, including type validation.
- `samples`: Physical samples and their characteristics.
- `instruments`: Instruments/beamlines.
- `metadata-keys`: Index of metadata keys used across entities.
- `published-data`: DOI publication of dataset collections and registration.
- `jobs`: Configurable jobs (archive, retrieve, etc.), their authorization and actions.
- `authentication`: Login methods, token issuance, and resolution of user access groups.
- `user-management`: Users, identities, roles, settings, and user tokens.
- `access-control`: Role- and group-based permission rules applied to every endpoint.
- `archive-policies`: Per-owner-group archive/retrieve policies.
- `change-history`: Audit trail of entity changes and its query API.
- `live-events`: Server-sent events streaming data changes to clients.
- `dataset-search`: Optional OpenSearch indexing and full-text dataset search.
- `logbooks`: Proxy access to an external logbook service.
- `runtime-config`: Runtime-editable configuration and frontend config/theme exposure.
- `health-monitoring`: Health check and optional access metrics.

### Modified Capabilities
None.

## Impact

Documentation only: adds `openspec/specs/*` on archive. No runtime impact.
