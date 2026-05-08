# Datasets Authorization

This is the list of the permissions available for datasets and all their endpoints

## Endpoint authorization

- DatasetCreate
- DatasetRead
- DatasetUpdate
- DatasetDelete

## Instance authorization

- DatasetCreateOwnerNoPid
- DatasetCreateOwnerWithPid
- DatasetCreateAny
- DatasetReadManyPublic
- DatasetReadManyAccess
- DatasetReadAny
- DatasetUpdateOwner
- DatasetUpdateAny
- DatasetDeleteOwner
- DatasetDeleteAny

## Implementation

How the different levels of authorization translate into data conditions applied by the backend.

- Public
  - isPublished = true
- Access (conditions are applied in logical _or_)
  - isPublished = true
  - the user belongs to the group listed in the _ownerGroup_ field
  - the user belongs to one of the groups listed in the _accessGroups_ field
  - _sharedWith contains the user's email_ (obsolete, it will removed)
- Owner
  - the user belongs to the group listed in the _ownerGroup_ field
- Any
  - User can perform the action to any dataset

## Operation to endpoints map

- Create
  - POST Datasets
  - POST Datasets/isValid
- Read
  - GET Datasets
  - GET Datasets/fullquery
  - GET Datasets/fullfacets
  - GET Datasets/metadataKeys
  - GET Datasets/count
  - GET Datasets/findOne
  - GET Datasets/_pid_
  - GET Datasets/_pid_/datasetlifecycle
  - GET Datasets/_pid_/logbook
- Update
  - PATCH Datasets/_pid_
  - PUT Datasets/_pid_
  - POST Datasets/_pid_/appendToArrayField
  - PATCH Datasets/_pid_/datasetlifecycle
- Delete
  - DELETE Datasets/_pid_

## Authorization standard users

| Operation | Endpoint Authorization | Anonymous | Authenticated User | Notes |
| --------- | ---------------------- | --------- | ------------------ | ----- |
| Create | _DatasetCreate_ | __no__ | __no__ | |
| Read | _DatasetRead_ | Public<br/>_DatasetReadPublic_ | Has Access<br/>_DatasetReadAccess_ | |
| Update | _DatasetUpdate_ | __no__ | __no__ | |
| | | | | |
| DELETE | _DatasetDelete_ | __no__ | __no__ | |

## Special permissions groups

- Dataset Create Basic (DsCB)  
  These groups are allowed to create datasets for any of the groups they belong to, although they are not allowed to assign the pid to the new dataset.
  Default: _#nogroup_  
  Special values:
  - _#all_ : all groups are allowed to create datasets with pid assigned by the system.
- Dataset Create Extended (DsCE)  
  These groups are allowed to create datasets for any of the groups they belong to, and they can assign the pid to the new dataset.  
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
  These groups are allowed to update any datasets independently from the ownership.  
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

## Authorization special permissions groups

If a user belongs to one of the groups which is listed in any special permission, the permissions listed in this table override the standard permissions.  
When the cell is empty in the following table, the permissions listed in the standard users table are applied.
A user can belong to multiple groups listed in multiple special permissions. The union of all the permissions is applied.

| Operation | Endpoint Authorization | Dataset Read Privileged | Dataset Create Basic | Dataset Create Extended | Dataset Create Privileged | Dataset Update Basic | Dataset Update Privileged | Admin | Dataset Delete Basic | Dataset Delete Privileged | Delete | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create | _DatasetCreate_ | | Owner, w/o PID<br/>_DatasetCreateOwnerNoPid_ | Owner, w/ PID<br/>_DatasetCreateOwnerWithPid_ | Any<br/>_DatasetCreateAny_ | | | Any<br/>_DatasetCreateAny_ | | | | |
| Read | _DatasetRead_ | Any<br/>_DatasetReadAny_ | | | | | Any<br/>_DatasetReadAny_ | | |
| Update | _DatasetUpdate_ | | | | | Owner<br/>_DatasetUpdateOwner_ | Any<br/>_DatasetUpdateAny_ | Any<br/>_DatasetUpdateAny_ | | | | |
| | | | | | | | | | | | | |
| Delete | _DatasetDelete_ | | | | | | | | Own<br/>_DatasetDeleteOwner_ | Any<br/>_DatasetDeleteAny_ | Any<br/>_DatasetDeleteAny_ | |

## Priorities

This section lists the connected special permissions groups in order of importance.
A user will acquire the permissions from the special permissions groups up to the rightmost group in the list they belong to.

- Read
  - Anonymous -> Authenticated -> Dataset Read Privileged -> Admin
- Create
  - Anonymous -> Authenticated -> Dataset Create Basic -> Dataset Create Extended -> Dataset Create Privileged -> Admin
- Update
  - Anonymous -> Authenticated -> Dataset Update Basic -> Dataset Update Privileged -> Admin
- Delete
  - Anonymous -> Authenticated -> Dataset Delete Basic -> Dataset Delete Privileged -> Delete

## Environmental Variables

The following list present the environmental variables that should be configured to setup the special groups listed in the previous sections.
Each variable is a comma separated list of the users' groups that acquired the special permissions linked to the special group.

- DATASET_READ_PRIVILEGED_GROUPS: groups with __Dataset Read Privileged__ permissions
- DATASET_CREATE_BASIC_GROUPS: groups with __Dataset Create Basic__ permissions
- DATASET_CREATE_EXTENDED_GROUPS: groups with __Dataset Create Extended__ permissions
- DATASET_CREATE_PRIVILEGED_GROUPS: groups with __Dataset Create Privileged__ permissions
- DATASET_UPDATE_BASIC_GROUPS: groups with __Dataset Update Basic__ permissions
- DATASET_UPDATE_PRIVILEGED_GROUPS: groups with __Dataset Update Privileged__ permissions
- DATASET_DELETE_BASIC_GROUPS: groups with __Dataset Delete Basic__ permissions
- DATASET_DELETE_PRIVILEGED_GROUPS: groups with __Dataset Delete Privileged__ permissions
- ADMIN_GROUPS: groups with __Admin__ permissions. This variable effects all the sub-systems.
- DELETE_GROUPS: groups with __Delete__ permissions. This variable effects all the sub-systems.

## Legacy

The legacy datasets special permissions environment variables are marked obsolete and will be removed in the future.
In the meantime, they are mapped to the matching new variable.
Here is the map:

- Create Dataset Groups ( CREATE_DATASET_GROUP ) -> Dataset Create Basic
- Create Dataset with PID Group ( CREATE_DATASET_WITH_PID_GROUP ) -> Dataset Create Extended
- Create Dataset Privileged ( CREATE_DATASET_PRIVIELEGED_GROUP ) -> Dataset Create Privileged

## Use cases and configuration examples

This section includes few of the many use cases that the community as come across, found them informative.
Each use case provides the settings for each special permissions groups in isolation. 
In a production setup, each special permissions groups will contain a list of multiple group that is the union of each individual case.

### Data ingestion with creation only

#### Description

We need a functional account that allows the ingestion process to create datasets for any group so it can ingest datasets independently from who owns them.  

#### Configuration

##### Accounts

- username: ingestor
- group: ingestor

##### Special permissions groups

- DATASET_READ_PRIVILEGED_GROUPS = ""
- DATASET_CREATE_BASIC_GROUPS = ""
- DATASET_CREATE_EXTENDED_GROUPS = ""
- DATASET_CREATE_PRIVILEGED_GROUPS = "ingestor"
- DATASET_UPDATE_BASIC_GROUPS = ""
- DATASET_UPDATE_PRIVILEGED_GROUPS = ""
- DATASET_DELETE_BASIC_GROUPS = ""
- DATASET_DELETE_PRIVILEGED_GROUP = ""
- ADMIN_GROUPS = ""
- DELETE_GROUPS = ""

### Data ingestion with creation and update

#### Description

We need a functional account that allows the ingestion process to create and update datasets for any group so it can ingest datasets independently from who owns them and also perform additional updates at a later time.  

#### Configuration

##### Accounts

- username: ingestor
- group: ingestor

##### Special permissions groups

- DATASET_READ_PRIVILEGED_GROUPS = ""
- DATASET_CREATE_BASIC_GROUPS = ""
- DATASET_CREATE_EXTENDED_GROUPS = ""
- DATASET_CREATE_PRIVILEGED_GROUPS = "ingestor"
- DATASET_UPDATE_BASIC_GROUPS = ""
- DATASET_UPDATE_PRIVILEGED_GROUPS = "ingestor"
- DATASET_DELETE_BASIC_GROUPS = ""
- DATASET_DELETE_PRIVILEGED_GROUP = ""
- ADMIN_GROUPS = ""
- DELETE_GROUPS = ""

### Post Ingestion tasks workflow

#### Description

We need to set up a workflow to run post ingestions task. The process needs to be able to list any dataset that has a specific value in their keywords field independently from the group who owns the dataset. Once the list is retrieved, the process will perform the set tasks (like determining end of embargo period, performing some aggregation or statistic on the data) and save the results back in the dataset as additional scientific metadata.

##### Accounts

- username: post_ingestion_tasks
- group: post_ingestion_tasks

##### Special permissions groups

- DATASET_READ_PRIVILEGED_GROUPS = "post_ingestion_tasks"
- DATASET_CREATE_BASIC_GROUPS = ""
- DATASET_CREATE_EXTENDED_GROUPS = ""
- DATASET_CREATE_PRIVILEGED_GROUPS = ""
- DATASET_UPDATE_BASIC_GROUPS = ""
- DATASET_UPDATE_PRIVILEGED_GROUPS = "post_ingestion_tasks"
- DATASET_DELETE_BASIC_GROUPS = ""
- DATASET_DELETE_PRIVILEGED_GROUP = ""
- ADMIN_GROUPS = ""
- DELETE_GROUPS = ""

### Automatic workflow to delete obsolete datasets

#### Description

We need to set up a workflow to delete datasets that are more than 10 years old and are marked with the keyword _obsolete_.
The process needs to list all datasets that contains the valu e_obsolete_ in the keywords field and have creation time older than 10 years from today. Once the list has been retrieved, it has to iterate through and execute a delte command on each dataset.

##### Accounts

- username: delete_obsolete_datasets
- group: delete_obsolete_datasets

##### Special permissions groups

- DATASET_READ_PRIVILEGED_GROUPS = "delete_obsolete_datasets"
- DATASET_CREATE_BASIC_GROUPS = ""
- DATASET_CREATE_EXTENDED_GROUPS = ""
- DATASET_CREATE_PRIVILEGED_GROUPS = ""
- DATASET_UPDATE_BASIC_GROUPS = ""
- DATASET_UPDATE_PRIVILEGED_GROUPS = ""
- DATASET_DELETE_BASIC_GROUPS = ""
- DATASET_DELETE_PRIVILEGED_GROUP = "delete_obsolete_datasets"
- ADMIN_GROUPS = ""
- DELETE_GROUPS = ""
