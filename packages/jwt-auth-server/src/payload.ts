import { IAuthPayload, StringAnyMap, StringStringMap } from './interfaces';

export const isEmpty = (value: any) =>
  value === undefined ||
  value === null ||
  (typeof value === 'object' && Object.keys(value).length === 0) ||
  (typeof value === 'string' && value.trim().length === 0);

export type PayloadEntry = [string, string];

export default class AuthPayload implements IAuthPayload {
  private PAYLOAD: PayloadEntry[];
  private REVERSE_PAYLOAD: PayloadEntry[];

  constructor(payload: StringStringMap = {}) {
    this.PAYLOAD = Object.entries(payload);
    this.REVERSE_PAYLOAD = this.PAYLOAD.map(([pk, k]): PayloadEntry => [k, pk]);
  }
  /**
   * Replaces the keys of a payload
   */
  public reverse(keys: PayloadEntry[], payload: StringAnyMap): StringAnyMap {
    if (!keys.length) return payload;

    return keys.reduce((p: StringAnyMap, [k, pk]) => {
      const v = payload[k];

      if (!isEmpty(v)) p[pk] = v;

      return p;
    }, {});
  }
  public create(payload: StringAnyMap) {
    return this.reverse(this.REVERSE_PAYLOAD, payload);
  }
  public parse(payload: StringAnyMap) {
    return this.reverse(this.PAYLOAD, payload);
  }
}
