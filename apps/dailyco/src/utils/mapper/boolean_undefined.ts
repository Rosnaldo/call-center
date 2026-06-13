import _ from "lodash";

export const mapBooleanUndefined = (v?: string): boolean | undefined => _.isNil(v) ? undefined : v === 'true';
