import _ from "lodash";

type Props = {
    v?: boolean | string | null; // must include string if you want to call toLowerCase
    defaultV: boolean;
};

export const mapBoolean = ({ v, defaultV }: Props): boolean => {
    if (_.isNil(v)) return defaultV;

    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.toLowerCase() === 'true';

    return defaultV; // fallback for unexpected types
};
