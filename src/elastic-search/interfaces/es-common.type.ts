export type searchType =
  | "text"
  | "keyword"
  | "long"
  | "integer"
  | "date"
  | "boolean"
  | "object"
  | "flattened"
  | "nested";

export type ObjectType = {
  begin: string;
  end: string;
};

export type NumberRangeType = {
  min: string;
  max: string;
};

export interface IShould {
  terms?: {
    [key: string]: string[] | undefined;
  };
  term?: {
    [key: string]: string | undefined;
  };
  range?: {
    [key: string]: {
      gte?: string | number;
      lte?: string | number;
    };
  };
}

export interface IBoolShould {
  bool: {
    should: IShould[];
    minimum_should_match?: number;
  };
}

export interface IFilter {
  terms?: {
    [key: string]: string[];
  };
  term?: {
    [key: string]: boolean | string;
  };
  range?: {
    [key: string]: {
      gte?: string | number;
      lte?: string | number;
    };
  };
  match?: {
    [key: string]: string | number;
  };
  nested?: {
    path: string;
    query: {
      bool: {
        must: (
          | { term?: { [key: string]: string } }
          | { range?: { [key: string]: { [key: string]: string | number } } }
        )[];
      };
    };
  };
  bool?: {
    should: IShould[];
    minimum_should_match?: number;
  };
}

export interface IFullFacets {
  [key: string]: {
    terms?: {
      field: string;
      order: {
        _key?: string;
        _count?: string;
      };
    };
    value_count?: {
      field: "pid";
    };
  };
}

export interface ITransformedFullFacets {
  [key: string]:
    | {
        _id: string;
        count: number;
      }
    | { totalSets: number };
}

export interface ScientificQuery {
  [key: string]: Record<string, string> | "$and" | "$or";
}

export interface nestedQueryObject {
  [key: string]: Record<string, string | { [key: string]: string }>;
}
