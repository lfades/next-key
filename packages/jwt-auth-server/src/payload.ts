import { isEmpty } from 'lodash';
import { IAuthPayload, StringAnyMap, StringStringMap } from './interfaces';

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