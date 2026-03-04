//Tokenizers
export const autocomplete_tokenizer = {
  type: "edge_ngram",
  min_gram: 2,
  max_gram: 40,
  token_chars: ["letter", "digit", "symbol", "punctuation"],
};

//Filters
export const special_character_filter = {
  pattern: "[^A-Za-z0-9]",
  type: "pattern_replace",
  replacement: "",
};

//Index Settings
export const defaultOpensearchSettings = {
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
        type: "custom",
        tokenizer: "autocomplete",
        filter: ["lowercase"],
      },
      autocomplete_search: {
        type: "custom",
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
};
