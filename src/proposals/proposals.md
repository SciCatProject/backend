# Information on Proposals folder

This folder contains all the information and files related to Proposals models and their endpoints .

## V4 query relationships

Proposal v4 `include` supports the following relationship options:

- `samples`: related records from the `Sample` collection matched by `proposalId`.
- `instruments`: related records from the `Instrument` collection matched by the proposal's `instrumentIds`.
- `datasets`: related records from the `Dataset` collection whose `proposalIds` contains the proposal ID.
- `all`: returns `samples`, `instruments`, and `datasets`.

The `all` option is independent of the order of include values and does not produce duplicate relationship results.

## Data Models

### __Proposal__
This object define all the Proposal class models and dtos.

__Definition__

```yaml
item: Proposal
dto: 
  file: proposals/dto/create-proposal.dto.ts
  name: CreateProposalDto
  extends: OwnableDto
model:
  file: proposals/schemas/proposal.schema.ts
  names: 
    class: ProposalClass
    schema: ProposalSchema
  extends: OwnableClass
  database:
    collection: Proposal
    toJson:
      getters: true
legacy:
  file: common/models/proposal.json
fields:
  - name: proposalId
    type: string
    legacy:
      type: string
      id: true
      required: true
      description: "Globally unique identifier of a proposal, eg. PID-prefix/internal-proposal-number. PID prefix is auto prepended"
    dto:
      type: string
      readonly: true
      validation: 
        IsString: true
      swagger:
        type: String
        required: true
        description: "Globally unique identifier of a proposal, eg. PID-prefix/nternal-proposal-number. PID prefix is auto prepended" 
    schema:
      type: string
      swagger:
        type: String
        required: true
        description: "Globally unique identifier of a proposal, eg. PID-prefix/nternal-proposal-number. PID prefix is auto prepended"
      database:
        type: String
        unique: true
        required: true
  - name: _id
    type: string
    schema:
      type: string
      database:
        type: String
  - name: pi_email
    type: string
    optional: true
    legacy:
      type: string
      index: true
      description: "Email of principal investigator"
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String,
        required: false,
        description: "Email of principal investigator"      
    schema:
      type: string
      swagger:
        type: String,
        required: false,
        description: "Email of principal investigator"
      database:
        type: String,
        required: false,
        index: true,
  - name: pi_firstname
    type: string
    optional: true
    legacy:
      type: string
      description: "First name of principal investigator"
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String,
        required: false,
        description: "First name of principal investigator"
    schema:
      type: string
      swagger:
        type: String,
        required: false,
        description: "First name of principal investigator"
      database:
        type: String,
        required: false
  - name: pi_lastname
    type: string
    optional: true
    legacy: 
      type: string
      description: "Last name of principal investigator"
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String
        required: false
        description: "Last name of principal investigator"
    schema:
      swagger:
        type: String
        required: false
        description: "Last name of principal investigator"
      database:
        type: String,
        required: false
  - name: email
    type: string
    legacy:
      type: string
      required: true,
      description: "Email of main proposer"
    dto:
      type: string
      readonly: true
      validation:
        IsEmail: true
      swagger:
        type: String
        required: true
        description: "Email of main proposer"
    schema:
      swagger:
        type: String
        required: true
        description: "Email of main proposer"
      database:
        type: String 
        required: true 
  - name: firstname
    type: string
    optional: true
    legacy:
      type: string
      description: "First name of main proposer"
    dto:
      type: string
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String
        required: false
        description: "First name of main proposer" 
    schema:
      swagger:
        type: String
        required: false
        description: "First name of main proposer" 
      database:
        type: String, 
        required: false 
  - name: lastname
    type: string
    optional: true
    legacy:
      type: string
      description: "Last name of main proposer"      
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String
        required: false
        description: "Last name of main proposer"
    schema:
      swagger:
        type: String
        required: false
        description: "Last name of main proposer"
      database:
        type: String
        required: false 
  - name: title
    type: string
    legacy:
      type: string
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
      swagger:
        type: String
        required: true
        description: "The title of the proposal"
    schema:
      swagger:
        type: String
        required: true
        description: "The title of the proposal"
      database:
        type: String 
        required: true 
  - name: abstract
    type: string
    optional: true
    legacy:
      type: string
    dto:
      type: string
      readonly: true
      validation:
        IsString: true
        IsOptional: true
      swagger:
        type: String
        required: true
        description: "The proposal abstract"
    schema:
      swagger:
        type: String 
        required: false
        description: "The proposal abstract" 
      database:
        type: String
        required: false 
  - name: startTime
    type: Date
    optional: true
    legacy:
      type: Date
    dto:
      type: Date
      readonly: true
      required: false
      validation:
        IsDateString: true
        IsString: true
      swagger:
        type: Date
        required: false
        description: "The date when the data collection starts"
    schema:
      swagger:
        type: Date
        required: false
        description: "The date when the data collection starts"
      database:
        type: Date, 
        required: false 
  - name: endTime
    type: Date
    optional: true
    legacy:
      type: Date
    dto:
      type: Date
      readonly: true
      optional: true
      validation:
        IsDateString: true
        IsString: true
      swagger:
        type: Date
        required: false
        description: "The date when data collection finishes"
    schema:
      swagger:
        type: Date
        required: false
        description: "The date when data collection finishes"
      database:
        type: Date 
        required: false 
  - name: MeasurementPeriodList
    type: MeasurementPeriod
    optional: true
    array: true
    legacy:
      relationship: measurementPeriod
      type: embedsMany
      model: MeasurementPeriod
      property: MeasurementPeriodList
      options:
        validate: false
        forceId: false
        persistent: true
    dto:
      type: Record<string, unknown>
      readonly: true
      optional: true
      validation:
        IsOptional: true
        IsArray: true
        ValidateNested: 
          each: true
        Type: CreateMeasurementPeriodDto
      swagger:
        type: MeasurementPeriod
        isArray: true
        required: false
        description: "Embedded information used inside proposals to define which type of experiment as to be pursued where (at which intrument) and when."
    schema:
      swagger:
        type: MeasurementPeriod
        isArray: true
        required: false
        description: "Embedded information used inside proposals to define which type of experiment as to be pursued where (at which intrument) and when."
      database:
        type: MeasurementPeriodSchema
        array: true
        required: false
  - name: Attachements
    legacy:
      type: hasMany
      model: Attachment
```

### __MeasurementPeriood__
This object define the Measurement Period object

__Definition__

```yaml
item: 
dto: 
  file: proposals/dto/create-proposal.dto.ts
  name: ProposalDto
  extends: OwnableDto
model:
  file: proposals/schemas/measurement-period.schema.ts
  names: 
    class: MeasurementPeriodClass
    schema: MeasurementPeriodSchema
  extends: QueryableClass
legacy:
  file: common/models/measurement-period.json
fields:
  - name: id
    legacy:
      type: string
      id: true
      required: true
      description: "id currently needed by limitation in embedsmany"
      defaultFn: "uuidv4"
  - name: instrument
    type: string
    legacy:
      type: string
      index: true
      required: true
      description: "Instrument or beamline identifier where measurement was pursued, e.g. /PSI/SLS/TOMCAT"
    dto:
      type: string
      readonly: true
      validation: 
        IsString: true
      swagger:
        type: String
        required: true
        description: "Instrument or beamline identifier where measurement was pursued, e.g. /PSI/SLS/TOMCAT", 
    schema:
      type: string
      swagger:
        type: String
        required: true
        description: "Instrument or beamline identifier where measurement was pursued, e.g. /PSI/SLS/TOMCAT",
      database:
        type: String
        index: true
        required: true
  - name: start
    type: Date
    legacy:
      type: "Date"
      index: true
      description: "Time when measurement period started, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
    dto:
      type: Date
      readonly: true
      validation: 
        IsDateString: true
      swagger:
        type: Date
        description: "Time when measurement period started, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
    schema:
      type: Date
      swagger:
        type: Date
        description: "Time when measurement period started, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
      database:
        type: Date
        index: true
  - name: end
    type: Date
    legacy:
      type: "Date"
      index: true
      description: "Time when measurement period ended, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
    dto:
      type: Date
      readonly: true
      validation: 
        IsDateString: true
      swagger:
        type: Date
        description: "Time when measurement period ended, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
    schema:
      type: Date
      swagger:
        type: Date
        description: "Time when measurement period ended, format according to chapter 5.6 internet date/time format in RFC 3339. Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server"
      database:
        type: Date
        index: true
  - name: comment
    type: string
    optional: true
    legacy:
      type: string
      description: "Additional information relevant for this measurement period, e.g. if different accounts were used for data taking"
    dto:
      type: string
      readonly: true
      optional: true
      validation: 
        IsString: true
        IsOptional: true
      swagger:
        type: String
        description: "Additional information relevant for this measurement period, e.g. if different accounts were used for data taking"
    schema:
      type: string
      swagger:
        type: String
        description: "Additional information relevant for this measurement period, e.g. if different accounts were used for data taking"
      database:
        type: String
```
