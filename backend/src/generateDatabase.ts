import { config } from "dotenv";
config();
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { importGtfs } from 'gtfs';
import { writeFile } from "node:fs/promises";
import { __dirname } from "./utils.js";
// @ts-ignore
import gtfsToGeoJSON from 'gtfs-to-geojson';

const api_key = process.env.SF_511_API_KEY_01;
if (!api_key)
    throw new Error('SF_511_API_KEY_01 required');

const {
    values: { include, exclude, help }
} = parseArgs({
    options: {
        include: {
            type: 'string',
            short: 'i',
            multiple: true
        },
        exclude: {
            type: 'string',
            short: 'x',
            multiple: true
        },
        help: {
            type: 'boolean',
            short: 'h'
        }
    }
});

if (help) {
    console.log(
`generate-database
    -i, --include - Only grab the agency ids listed. ex: npm run generate -i SF BA GF
    -x, --exclude - Grab all BUT the agency ids listed. ex: npm run generate -x SF BA GF
`
    );
    process.exit(0);
}
interface Agency {
    Id: string;
    Name: string;
    LastGenerated: string;
}

const sf511Fetch = async <ReturnType>(
    endpoint: string, 
    params: URLSearchParams,
    json = true
): Promise<ReturnType> => 
    fetch(`https://api.511.org/transit${endpoint}?${params.toString()}`)
        .then(res => json ? res.json() : res.arrayBuffer());

(async () => {
    console.log('Getting agency information');
    const agencies = await sf511Fetch<Agency[]>('/gtfsoperators', new URLSearchParams({ api_key }))
        .then(data => data.filter(agency => 
            include
                ? include.includes(agency.Id)
                : exclude
                    ? !exclude.includes(agency.Id)
                    : agency.Id !== 'RG'
        ));

    const apiKeys = agencies.map(({ Id }) => process.env[`SF_511_API_KEY_${Id}`]);
    if (!apiKeys.every(key => key))
        throw new Error('Missing API key(s): ' + agencies.filter((_, i) => !apiKeys[i]).map(agency => agency.Id).join(', '));

    const gtfsConfig = {
        agencies: agencies.map(({ Id }) => ({
            agency_key: Id,
            url: `https://api.511.org/transit/datafeeds?api_key=${process.env[`SF_511_API_KEY_${Id}`]}&operator_id=${Id}`,
            prefix: `${Id}_`,
            exclude: ['attributions']
        })),
        sqlitePath: join(__dirname, '../data.s3db'),
        ignoreDuplicates: true
    };

    await writeFile(join(__dirname, '../gtfsConfig.json'), JSON.stringify(gtfsConfig, null, 4));
    
    // await importGtfs(gtfsConfig);
    await gtfsToGeoJSON({
        ...gtfsConfig,
        outputFormat: 'envelope',
        skipImport: true
    });

    await gtfsToGeoJSON({
        ...gtfsConfig,
        outputFormat: 'convex',
        skipImport: true
    });
})();