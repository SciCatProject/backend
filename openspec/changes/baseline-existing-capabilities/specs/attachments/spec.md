# Spec Delta

## Purpose

Stores small attachments (thumbnail image and caption) linked by relationships to datasets, proposals, samples, or published data.

## ADDED Requirements

### Requirement: Attachment content
`POST /api/v4/attachments` SHALL require `ownerGroup`, `caption`, and `isPublished`, accept `thumbnail` and `relationships`, and use a supplied or generated UUID `aid` as id. Each relationship SHALL have `targetType` of `dataset`, `proposal`, `sample`, or `published_data`; target existence SHALL NOT be checked.

#### Scenario: Invalid target type
- **WHEN** an attachment has a relationship with `targetType: "instrument"`
- **THEN** the response is 400

### Requirement: Attachment permissions
`ATTACHMENT_GROUPS` (default `#all`) SHALL create, update, and delete attachments of owner groups they belong to. `ATTACHMENT_PRIVILEGED_GROUPS` SHALL also create for any group. Admin groups SHALL do everything; `DELETE_GROUPS` SHALL delete any attachment.

#### Scenario: Foreign owner group
- **WHEN** an `ATTACHMENT_GROUPS` member creates an attachment for a group they are not in
- **THEN** the response is 403

### Requirement: Query attachments
`GET /api/v4/attachments` SHALL take a whitelisted JSON `filter` (`where`, `fields`, `limits`; default limit 10, sort `createdAt` desc) and return only accessible attachments; anonymous callers SHALL get published ones. `/public` SHALL always return published only.

#### Scenario: Anonymous list
- **WHEN** an anonymous client lists attachments
- **THEN** only published attachments are returned

### Requirement: Read attachment
`GET /api/v4/attachments/:aid` SHALL return 404 if missing and 403 if unreadable.

#### Scenario: Private attachment anonymously
- **WHEN** an anonymous client requests an unpublished attachment
- **THEN** the response is 403

### Requirement: Validate without saving
`POST /api/v4/attachments/isValid` SHALL require create permission and return `{ valid, reason }`.

#### Scenario: Missing caption
- **WHEN** a body without `caption` is validated
- **THEN** `valid` is false

### Requirement: Update and replace
`PATCH /api/v4/attachments/:aid` SHALL partially update, support RFC 7386 merge patch, and return 412 on stale `If-Unmodified-Since`. `PUT` SHALL replace the attachment, keeping `aid`, `createdBy`, and `createdAt`.

#### Scenario: Merge patch null
- **WHEN** a merge patch sets `thumbnail` to null
- **THEN** the thumbnail is removed

### Requirement: Delete attachment
`DELETE /api/v4/attachments/:aid` SHALL return the deleted attachment.

#### Scenario: Owner deletes
- **WHEN** an `ATTACHMENT_GROUPS` member deletes an attachment of their group
- **THEN** the deleted attachment is returned
