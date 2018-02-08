export interface StringStringMap {
  [key: string]: string;
}

export interface StringAnyMap {
  [key: string]: any;
}

export interface AuthScopeInterface {
  create(scope: string[]): string;
  parse(scope: string): string[];
}

export interface AuthPayloadInterface {
  create(payload: StringAnyMap): StringAnyMap;
  parse(reversePayload: StringAnyMap): StringAnyMap;
}
