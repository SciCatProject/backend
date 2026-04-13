import {
  AnalysisEdgeNGramTokenizer,
  AnalysisPatternReplaceCharFilter,
  IndicesIndexSettingsAnalysis,
  MappingDynamicTemplate,
} from "@elastic/elasticsearch/lib/api/types";

//Tokenizers
export const autocomplete_tokenizer: AnalysisEdgeNGramTokenizer = {
  type: "edge_ngram",
  min_gram: 2,
  max_gram: 40,
  token_chars: ["letter", "digit", "symbol", "punctuation"],
};

//Filters
export const special_character_filter: AnalysisPatternReplaceCharFilter = {
  pattern: "[^A-Za-z0-9]",
  type: "pattern_replace",
  replacement: "",
};

//Dynamic templates
export const dynamic_template: Record<string, MappingDynamicTemplate>[] = [
  // NOTE: date as keyword is temporary solution for date format inconsistency issue in the scientificMetadata field
  {
    date_as_keyword: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "date",
      mapping: {
        type: "keyword",
      },
    },
  },
  {
    long_as_double: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "long",
      mapping: {
        type: "double",
        coerce: true,
        ignore_malformed: true,
      },
    },
  },
  {
    double_as_double: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "double",
      mapping: {
        type: "double",
        coerce: true,
        ignore_malformed: true,
      },
    },
  },
  {
    string_as_keyword_level2: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "string",
      mapping: {
        type: "text",
        analyzer: "case_sensitive",
        search_analyzer: "case_sensitive",
        fields: {
          keyword: {
            type: "keyword",
            ignore_above: 256,
          },
        },
      },
    },
  },
  {
    string_as_keyword_level1: {
      path_match: "scientificMetadata.*",
      match_mapping_type: "string",
      mapping: {
        type: "text",
        analyzer: "case_sensitive",
        search_analyzer: "case_sensitive",
        fields: {
          keyword: {
            type: "keyword",
            ignore_above: 256,
          },
        },
      },
    },
  },
];

//Index Settings
export const defaultElasticSettings = {
  index: {
    max_result_window: process.env.ES_MAX_RESULT || 2000000,
    number_of_replicas: 0,
    mapping: {
      total_fields: {
        limit: process.env.ES_FIELDS_LIMIT || 2000000,
      },
      nested_fields: {
        limit: 1000,
      },
    },
  },
  analysis: {
    analyzer: {
      autocomplete: {
        tokenizer: "autocomplete",
        filter: ["lowercase"],
      },
      autocomplete_search: {
        tokenizer: "lowercase",
      },
      case_sensitive: {
        type: "custom",
        tokenizer: "standard",
        filter: [],
      },
    },
    tokenizer: {
      autocomplete: autocomplete_tokenizer,
    },
  },
} as IndicesIndexSettingsAnalysis;
