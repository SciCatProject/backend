# Frontend Configuration Guide

## Overview

This guide documents frontend configuration options that control various UI behaviors and features in SciCat. These settings are defined in the configuration file specified by the `FRONTEND_CONFIG_FILE` environment variable (default `src/config/frontend.config.json`).

## Configuration Options

| **Configuration Options** | **Type** | **Default Value** | **Description** |
|------------------------|----------|-------------------|-----------------|
| **`defaultMainPage`** | object | | Defines the default landing page for authenticated and non-authenticated users. |
| &nbsp;&nbsp;&nbsp;&nbsp;`nonAuthenticatedUser` | string | `"DATASETS"` | Default landing page for non-authenticated users. |
| &nbsp;&nbsp;&nbsp;&nbsp;`authenticatedUser` | string | `"PROPOSALS"` | Default landing page for authenticated users. |
| `checkBoxFilterClickTrigger` | boolean | `false` | Enable/disable automatic filter application when clicking checkboxes in filters. |
| `accessTokenPrefix` | string | `"Bearer "` | Set the backend token prefix. Should be empty string for old backend or "Bearer " if using scicat-backend-next. |
| `addDatasetEnabled` | boolean | `false` | Show/hide the "Create Dataset" button in the Datasets Dashboard. |
| `archiveWorkflowEnabled` | boolean | `false` | Enable/disable the archive/retrieve workflow. |
| `datasetReduceEnabled` | boolean | `true` | Show/hide the "Reduce" tab. |
| `datasetJsonScientificMetadata` | boolean | `true` | Show/hide the "Scientific Metadata (JSON)" tab. |
| `editDatasetEnabled` | boolean | `true` | Show/hide the "Edit" buttons in the Datasets Details page |
| `editDatasetSampleEnabled` | boolean | `true` | **Deprecated** Enable/disable editing of which Sample a Dataset belongs to. |
| `editMetadataEnabled` | boolean | `true` | Enable/disable editing of Scientific Metadata. |
| `addSampleEnabled` | boolean | `false` | Show/hide the "Create Sample" button in the Sample Dashboard |
| `externalAuthEndpoint` | string | `"/api/v3/auth/msad"` | Endpoint used for third party authentication, e.g., LDAP. |
| `facility` | string | `"SciCat Vanilla"` | Facility running the SciCat instance. |
| `siteIcon` | string | `""` | **Deprecated** Path to the site icon/logo image file. |
| `siteTitle` | string | `""` | Title displayed in the header. |
| `siteSciCatLogo` | string | `""` | **Deprecated** Set to `"icon"` for icon-only display; full logo shown otherwise. |
| `loginFacilityLabel` | string | `""` | Label for the facility login option. |
| `loginLdapLabel` | string | `""` | Label for the LDAP login option. |
| `loginLocalLabel` | string | `""` | Label for the local login option. |
| `loginFacilityEnabled` | boolean | `true` | Enable/disable facility login option. |
| `loginLdapEnabled` | boolean | `true` | Enable/disable LDAP login option. |
| `loginLocalEnabled` | boolean | `true` | **Deprecated** Enable/disable local login option. |
| `fileColorEnabled` | boolean | `true` | **Deprecated** Enable/disable file size color representation in the Datasets Dashboard. |
| `fileDownloadEnabled` | boolean | `true` | Enable/disable download workflow for Dataset datafiles. |
| `gettingStarted` | string | `null` | URL to Getting Started guide for SciCat, displayed on the Help page. |
| `ingestManual` | string | `null` | URL to Ingest Manual for SciCat, displayed on the Help page. |
| `jobsEnabled` | boolean | `true` | Enable/disable Job workflow. |
| `jsonMetadataEnabled` | boolean | `true` | Show/hide the "Show Metadata" button on the details pages, allowing users to see the JSON representation of the current document. |
| `jupyterHubUrl` | string | `""` | URL to Jupyter Hub instance used for data analysis. |
| `landingPage` | string | `""` | URL to the facility's Landing Page for Published Data. |
| `lbBaseURL` | string | `""` | URL to the SciCat Backend. |
| `logbookEnabled` | boolean | `true` | Enable/disable SciChat Logbook integration. |
| `loginFormEnabled` | boolean | `true` | Enable/disable the local Login form. Should be disabled if using oAuth2 for authentication. |
| `metadataPreviewEnabled` | boolean | `true` | Enable/disable Scientific Metadata preview on the Datasets Dashboard. |
| `metadataStructure` | string | `""` | Allow tree structure for Scientific Metadata. Set to empty string for flat structure, or "tree" for tree structure. |
| `multipleDownloadAction` | string | `""` | URL to service handling direct download of datafiles. |
| `multipleDownloadEnabled` | boolean | `true` | Enable/disable ability to download multiple datafiles. |
| `oAuth2Endpoints` | array | `[]` | List of endpoints used for oAuth2 authentication. Each endpoint should have `authURL` and `displayText` properties. |
| `policiesEnabled` | boolean | `true` | Enable/disable Dataset Policies workflow. |
| `retrieveDestinations` | array | `[]` | List of destinations for Dataset retrievals. |
| `riotBaseUrl` | string | `""` | URL to SciChat client. |
| `scienceSearchEnabled` | boolean | `true` | Enable/disable filtering documents on Scientific Metadata. |
| `scienceSearchUnitsEnabled` | boolean | `true` | Enable/disable filtering documents on Scientific Metadata using units. |
| `searchPublicDataEnabled` | boolean | `true` | **Deprecated** Enable/disable filtering Datasets on public or non-public data. |
| `searchSamples` | boolean | `true` | Enable/disable searching Samples on Samples Dashboard. |
| `sftpHost` | string | `""` | URL to SFTP service used for downloading files exceeding maximum allowed file size. |
| `sourceFolder` | string | `""` | Default source folder path for datasets. |
| `maxDirectDownloadSize` | number | `0` | Set a maximum allowed file size for downloading datafiles over HTTP (in bytes). |
| `maxFileSizeWarning` | string | `""` | Warning message displayed when files exceed the maximum direct download size. Supports placeholders: `<maxDirectDownloadSize>`, `<sftpHost>`, `<sourceFolder>`. |
| `shareEnabled` | boolean | `true` | Enable/disable workflow for sharing Datasets with other users using their email address. |
| `shoppingCartEnabled` | boolean | `true` | Enable/disable the Dataset cart used for bulk actions. |
| `shoppingCartOnHeader` | boolean | `true` | Toggle Dataset cart placement, either on header or to the left on the Datasets Dashboard. |
| `tableSciDataEnabled` | boolean | `true` | Enable/disable Scientific Metadata table view on details pages. If disabled, Scientific Metadata is displayed as raw JSON. |
| `datasetDetailsShowMissingProposalId` | boolean | `false` | Show/hide the ProposalId property even when the proposal no longer exists |
| `notificationInterceptorEnabled` | boolean | `true` | Enable/disable a snackbar when creating, updating or deleting entities |
| `metadataEditingUnitListDisabled` | boolean | `true` | Enable/disable the unitlist dropdown in metadata edit view |
| `hideEmptyMetadataTable` | boolean | `false` | Show/hide metadata tables when it is empty |
| `datafilesActionsEnabled` | boolean | `true` | Enable/disable custom datafile actions configuration. |
| `datafilesActions` | array | `[]` | Array of custom action configurations for datafiles. Each action can define download, notebook generation, or other custom behaviors. |
| `labelsLocalization` | object | `{}` | Localization configuration for labels in datasets and proposals. Maps field names to display labels. |
| `dateFormat` | string | `"yyyy-MM-dd HH:mm"` | Default date format used throughout the application. |
| **`mainMenu`** | object | | Configuration for main menu visibility based on user authentication status. |
| &nbsp;&nbsp;&nbsp;&nbsp;**`nonAuthenticatedUser`** | object | | Menu configuration for non-authenticated users. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`datasets` | boolean | `true` | Show/hide datasets menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`files` | boolean | `false` | Show/hide files menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`instruments` | boolean | `true` | Show/hide instruments menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`jobs` | boolean | `false` | Show/hide jobs menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`policies` | boolean | `false` | Show/hide policies menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`proposals` | boolean | `true` | Show/hide proposals menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`publishedData` | boolean | `true` | Show/hide published data menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`samples` | boolean | `false` | Show/hide samples menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;**`authenticatedUser`** | object | | Menu configuration for authenticated users. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`datasets` | boolean | `true` | Show/hide datasets menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`files` | boolean | `true` | Show/hide files menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`instruments` | boolean | `true` | Show/hide instruments menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`jobs` | boolean | `true` | Show/hide jobs menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`policies` | boolean | `false` | Show/hide policies menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`proposals` | boolean | `true` | Show/hide proposals menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`publishedData` | boolean | `true` | Show/hide published data menu item. |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`samples` | boolean | `true` | Show/hide samples menu item. |
| **`defaultTab`** | object | | Specifies which tab is shown by default when viewing different entities. |
| &nbsp;&nbsp;&nbsp;&nbsp;`proposal` | string | `"details"` | Default tab for proposals. Valid values: `"details"`, `"datasets"`, `"relatedProposals"`, `"logbook"`. |

## See Also

- [Default List Settings Configuration](./default-list-settings.md)
- [Dynamic Dataset Detail Component Configuration](./dynamic-dataset-detail-component.md)