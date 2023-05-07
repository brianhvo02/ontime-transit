import { readFile } from "node:fs/promises";
import { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const geojsonStr = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.geojson`), { encoding: 'utf8' });
    const geojson = JSON.parse(geojsonStr) as FeatureCollection;

    geojson.features = geojson.features.filter(feature => feature.geometry.type === 'Point');
    geojson.features.forEach(f => f.properties = { ...f.properties, agency_id: params.agencyId });

    return NextResponse.json(geojson);
}