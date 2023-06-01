import _ from 'lodash';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const groups = <Type>(arr: Type[], num = 10) => arr.reduce((arr: Type[][], val) => {
    const group = arr[arr.length - 1].length === num ? arr.length : arr.length - 1;
    if (!arr[group]) arr[group] = [];
    arr[group].push(val);
    return arr;
}, [[]]);

export const camelizeRecord = (record: Record<string, any>): Record<string, any> => Object.keys(record).reduce((obj, key) => ({ ...obj, [_.camelCase(key)]: record[key] }), {});