# Default List & Filter Configuration Pattern - Frontend Configuration Guide

## Overview

This guide explains how to configure the List & Side-Panel Configuration Pattern used on the frontend.
It allows customizing how list-based components (e.g., datasets, proposals) display table columns, side-panel filters, and optional query conditions.

The configuration should be defined or mounted at the location specified by the environment variable `FRONTEND_CONFIG_FILE` (default: `src/config/frontend.config.json`).

## Configuration Details

### **Columns**

Defines how each field is displayed in the list table.

| **Property** | **Type**  | **Description**                                                                                                                                                                                                                       | **Example / Notes** |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `name`       | `string`  | Object key whose value will be displayed in the column.                                                                                                                                                                               | `"datasetName"`     |
| `order`      | `number`  | Position of the column in the table.                                                                                                                                                                                                  | `2`                 |
| `type`       | `string`  | How the value is rendered:<br>• `standard` – plain text (default)<br>• `hoverContent` – shows icon with popup/modal when mouseover (for long text)<br>• `date` – formats ISO date strings; can include a `format` (e.g. `yyyy-MM-dd`) | `"date"`            |
| `width`      | `number`  | Default width of the column.                                                                                                                                                                                                          | `200`               |
| `format`     | `string`  | Optional property used **only** when `type` is set to `date`. Defines how ISO date strings are displayed (e.g. `yyyy-MM-dd`). <br> it fallsback to `dateFormat` or `yyyy-MM-dd HH:mm` for dataset and `yyyy-MM-dd` for proposal       | `"yyyy-MM-dd"`      |
| `enabled`    | `boolean` | Whether the column is displayed by default.                                                                                                                                                                                           | `true`              |

---

### **Filters**

Defines which filters appear in the side panel and how they behave.

| **Property**  | **Type**  | **Description**                                                                                                                                                                                                                                                                                                         | **Example / Notes**        |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `key`         | `string`  | Object key used for filtering.                                                                                                                                                                                                                                                                                          | `"creationTime"`           |
| `label`       | `string`  | Custom label for the filter. If not provided, it falls back to `labelLocalization` or `key`.                                                                                                                                                                                                                            | `"Creation Time"`          |
| `type`        | `string`  | Filter input type:<br>• `text` – _deprecated_ (use search box)<br>• `multiSelect` – dropdown with multiple options; supports `checkBoxFilterClickTrigger` for auto-apply<br>• `dateRange` – calendar or manual from–to input<br>• `checkbox` – pre-populated list; supports `checkBoxFilterClickTrigger` for auto-apply | `"multiSelect"`            |
| `description` | `string`  | Tooltip text for the filter.                                                                                                                                                                                                                                                                                            | `"Filter by dataset type"` |
| `enabled`     | `boolean` | Whether the filter is active by default.                                                                                                                                                                                                                                                                                | `true`                     |

---

### **Conditions**

Defines predefined condition filter in the side panel (currently supported only for the dataset table)

Each condition object has two properties:

| **Property** | **Type**  | **Description**                                   | **Example / Notes** |
| ------------ | --------- | ------------------------------------------------- | ------------------- |
| `condition`  | `object`  | Contains the filter logic (see sub-properties below) | —                |
| `enabled`    | `boolean` | Whether the condition is active by default        | `false`              |

**Condition Object Properties:**

| **Property** | **Type** | **Description**                                   | **Example / Notes** |
| ------------ | -------- | ------------------------------------------------- | ------------------- |
| _–_          | _–_      | Currently supported **only for dataset filters**. | —                   |
| `lhs`        | `string` | Metadata key to filter on                         | `"outgassing_values_after_1h"` |
| `relation`   | `string` | Comparison operator:<br>• `GREATER_THAN`<br>• `GREATER_THAN_OR_EQUAL`<br>• `LESS_THAN`<br>• `LESS_THAN_OR_EQUAL`<br>• `EQUAL_TO`<br>• `RANGE` | `"EQUAL_TO"` |
| `rhs`        | `string` | Value to compare against                          | `"3.1e4"`           |
| `unit`       | `string` | **Optional** unit for the value                       | `"mbar l/s/cm^2"`   | 
| `unitsOptions`| `string[]`| **Optional** A list of allowed units for this condition. When provided, the unit dropdown will be restricted to only these options   | `["mbar l/s/cm^2", "Pa m^3/s/m^2"]`