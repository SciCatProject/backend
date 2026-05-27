# SciCat FindAll V4: Scientific Query Search with Unit Handling and Strict Mode Plan

FindAll V4 does not support scientific queries. Our goal is to add this, but not in the old Fullquery V3 style (lhs, rhs, relation, unit). Instead, we want a MongoDB friendly approach using direct MongoDB operators ($eq, $gt, $lt, etc.).
We also want to support SI unit conversion for scientific fields, controlled by a new strictMode flag (default: false), which will be a top-level field in the query.


### New V4 style

```
{
  "strictMode": "false",
  "where": {
    "$and": [
      {
        "$and": [
          { "scientificMetadata.distance.value": { "$eq": 1 } },
          { "scientificMetadata.distance.unit": { "$eq": "km" } }
        ]
      },
      {
        "$and": [
          { "scientificMetadata.temperature.value": { "$eq": 10 } },
          { "scientificMetadata.temperature.unit": { "$eq": "celsius" } }
        ]
      }
    ]
  }
}
```

### If only one of the conditions should match

```
{
  "strictMode": "false",
  "where": {
    "$or": [
      {
        "$and": [
          { "scientificMetadata.distance.value": { "$eq": 1 } },
          { "scientificMetadata.distance.unit": { "$eq": "km" } }
        ]
      },
      {
        "$and": [
          { "scientificMetadata.temperature.value": { "$eq": 10 } },
          { "scientificMetadata.temperature.unit": { "$eq": "celsius" } }
        ]
      }
    ]
  }
} 
```

### Unit Handling & SI Conversion

If strictMode is false (default), the backend will:

 * Check if each $and array contains exactly two objects ending with value and unit.
 * Check if both objects share the same scientificMetadata key.
 
 If both checks pass, use the existing convertToSI utility to also match SI-equivalent values. But if checks fail, it should skip the SI conversion.
 
 If strictMode is true, only exact value/unit matches are returned (SI conversion is skipped).

### Final Query Example

Before being sent to the aggregation pipeline, the query looks like this:

```
[
  {
    "$match": {
      "$and": [
        { "datasetName": { "$regex": "someName", "$options": "i" } },
        {
          "$and": [
            { "scientificMetadata.distance.value": { "$eq": 1 } },
            { "scientificMetadata.distance.unit": { "$eq": "km" } }
          ]
        },
        {
          "$and": [
            { "scientificMetadata.temperature.value": { "$eq": 25 } },
            { "scientificMetadata.testing_unit2.unit": { "$eq": "celcius" } }
          ]
        }
      ]
    }
  },
  { "$sort": { "createdAt": -1 } },
  { "$skip": 0 },
  { "$limit": 10 }
]
```

With SI conversion, the final query looks like this:

```
[
  {
    "$match": {
      "$and": [
        { "datasetName": { "$regex": "someName", "$options": "i" } },
        {
          "$and": [
            { "scientificMetadata.distance.valueSI": { "$eq": 1000 } },
            { "scientificMetadata.distance.unitSI": { "$eq": "m" } }
          ]
        },
        {
          "$and": [
            { "scientificMetadata.temperature.valueSI": { "$eq": 77 } },
            { "scientificMetadata.testing_unit2.unitSI": { "$eq": "fahrenheit" } }
          ]
        }
      ]
    }
  },
  { "$sort": { "createdAt": -1 } },
  { "$skip": 0 },
  { "$limit": 10 }
]
```