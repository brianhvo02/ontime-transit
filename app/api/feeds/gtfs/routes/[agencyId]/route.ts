import { readFile } from "node:fs/promises";
import { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const geojsonStr = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.geojson`), { encoding: 'utf8' });
    const geojson = JSON.parse(geojsonStr) as FeatureCollection;
    const newFeatures: Feature[] = [];
    
    geojson.features.forEach(f => {
        if (f.geometry.type !== 'LineString') return;

        const existingFeature = newFeatures.find(newFeature => newFeature.properties!['route_id'] === f.properties!['route_id']) as Feature<MultiLineString> | undefined;
        if (!existingFeature) return newFeatures.push({
            type: 'Feature',
            properties: f.properties,
            geometry: {
                type: 'MultiLineString',
                coordinates: [ f.geometry.coordinates ]
            } as MultiLineString
        });

        existingFeature.geometry.coordinates.push(f.geometry.coordinates);
    });

    geojson.features = newFeatures;

    return NextResponse.json(geojson);
}