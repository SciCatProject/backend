# Datasets Authoorization

## CASL ability actions

This is the list of the permissions methods available for datasets and all their endpoints

### Endpoint authorization

- DatasetCreate
- DatasetRead
- DatasetUpdate
- DatasetDelete

### Instance authorization

- DatasetCreateOwnerNoPid
- DatasetCreateOwnerWithPid
- DatasetCreateAny
- DatasetReadManyPublic
- DatasetReadManyAccess
- DatasetReadAny
- DatasetUpdateOwner
- DatasetUpdateAny
- DetasetDeleteOwner
- DatasetDeleteAny

### Implementation

How the different level of authorization translates in data condition applied by the backend.

- Public
  - isPublished = true
- Access (condition ar applied in logical _or_)
  - isPublished = true
  - ownerGroup is one of the groups that the user belongs
  - accessGroups are one of the groups that the user belongs
  - _sharedWith contains the user's email_ (obsolete, it will removed)
- Owner
  - ownerGroup is one of the groups that the user belongs
- Any
  - User can perform the action to any dataset

### Operation to endpoints map

- Create
  - POST Datasets
  - POST Datasets/isValid
- Read
  - GET Datasets
  - GET Datasets/fullquery
  - GET Datasets/fullfacet
  - GET Datasets/metadataKeys
  - GET Datasets/count
  - GET Datasets/findOne
  - GET Datasets/_pid_
- Update
  - PATCH Datasets/_pid_
  - PUT Datasets/_pid_
  - POST Datasets/_pid_/appendToArrayField
- Delete
  - DELETE Datasets/_pid_

### Authorization standard users

| Operation | Endpoint Authorization | Anonymous | Authenticated User | Notes |
| --------- | ---------------------- | --------- | ------------------ | ----- |
| Create | _DatasetCreate_ | __no__ | __no__ | |
| Read | _DatasetRead_ | Public<br/>_DatasetReadPublic_ | Has Access<br/>_DatasetReadAccess_ | |
| Update | _DatasetUpdate_ | __no__ | __no__ | |
| | | | | |
| DELETE | _DatasetDelete_ | __no__ | __no__ | |

### Special permissions groups

- Dataset Create Basic (DsCB)  
  These groups are allowed to create datasets for any of the group they belong to, although they are not allowed to assigned the pid to the new dataset.
  Default: _#nogroup_  
  Special values:
  - _#all_ : all groups are allowed to create datasets with pid assigned by the system.
- Dataset Create Extended (DsCE)  
  These groups are allowed to create datasets for any of the group they belong to, and they can assign the pid to the new dataset.  
  Default: _#nogroup_  
  Special values:
  - _#all_ : all groups are allowed to create datasets with explicit pid.
- Dataset Create Privileged (DsCP)  
  These groups are allowed to create datasets for any group, and they can also assign the pid to the new dataset.  
  Default: _#nogroup_  
  Special values:
  - _#all_ : all groups are allowed to create datasets with pid assigned by the system
- Dataset Read Privileged (DsRP)  
  These groups are allowed to read all datasets independently from the ownership.  
  Default: _#nogroup_
- Dataset Update Basic (DsUB)  
  These groups are allowed to update only datasets they own.  
  Default: _#nogroup_  
  Special values:
  - _#DsCB_ : all groups listed in _Dataset Create Basic_ are allowed to update the datasets they own.
  - _#DsCE_ : all groups listed in _Dataset Create Basic_ are allowed to update the datasets they own.
- Dataset Update Privileged (DsUP)  
  These groups are allowed to update any datasets independently from the ownerhip.  
  Default: _#nogroup_  
  Special values:
  - _#DsCP_ : all groups listed in _Dataset Create Privileged_ are allowed to update any datasets.
- Dataset Delete Basic (DsDB)  
  These groups are allowed to delete only the datasets they own.  
  Default: _#nogroup_  
  Special values:
  - _#DsCB_ : all groups listed in _Dataset Create Basic_ are allowed to update the datasets they own.
  - _#DsCE_ : all groups listed in _Dataset Create Basic_ are allowed to update the datasets they own.
- Dataset Delete Privileged (DsDP)  
  These groups are allowed to delete any dataset independently of the ownership.  
  Default: _#nogroup_  
  Special values:
  - _#DsCP_ : all groups listed in _Dataset Create Privileged_ are allowed to update any datasets.

### Authorization special permissions groups

If a user belongs to one of the groups which is listed to any special permission, the permissions listed in this table override the standard permissions.  
When the cell is empty in the following table, the permissions listed in the standard users table are applied.
A user can belong to multiple groups listed in multiple special permissions. The union of all the permissions is applied.

| Operation | Endpoint Authorization | Dataset Read Privileged | Dataset Create Basic | Dataset Create Extended | Dataset Create Privileged | Dataset Update Basic | Dataset Update Privileged | Admin | Dataset Delete Basic | Dataset Delete Privilieged | Delete | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create | _DatasetCreate_ | | Owner, w/o PID<br/>_DatasetCreateOwnerNoPid_ | Owner, w/ PID<br/>_DatasetCreateOwnerWithPid_ | Any<br/>_DatasetCreateAny_ | | | Any<br/>_DatasetCreateAny_ | | | | |
| Read | _DatasetRead_ | Any<br/>_DatasetReadAny_ | | | | | Any<br/>_DatasetReadyAny_ | | |
| Update | _DatasetUpdate_ | | | | | Owner<br/>_DatasetUpdateOwner_ | Any<br/>_DatasetUpdateAny_ | Any<br/>_DatasetUpdateAny_ | | | | |
| | | | | | | | | |
| Delete | _DatasetDelete_ | | | | | | | | Own<br/>_DatasetDeleteOwner_ | Any<br/>_DatasetDeleteAny_ | Any<br/>_DatasetDeleteAny_ | |

## Priorities

This section lists the connected special permissions groups in order of importance.
A user will acquire the permissions from the special permissions groups to the most right in the list, he/she belongs to.

- Read
  - Anonymous -> Authenticated -> Dataset Read Privileged -> Admin
- Create
  - Anonymous -> Authenticated -> Dataset Create Basic -> Dataset Create Extended -> Dataset Create Privileged -> Admin
- Update
  - Anonymous -> Authenticated -> Dataset Update Basic -> Dataset Update Privileged -> Admin
- Delete
  - Anonymous -> Authenticated -> Dataset Delete Basic -> Dataset Delete Privileged -> Delete
