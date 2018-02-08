export interface StringStringMap {
  [key: string]: string;
}

export interface StringAnyMap {
  [key: string]: any;
}

export interface IAuthScope {
  create(scope: string[]): string;
  parse(scope: string): string[];
}

export interface IAuthPayload {
  create(payload: StringAnyMap): StringAnyMap;
  parse(reversePayload: StringAnyMap): StringAnyMap;
}
