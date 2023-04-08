import { readFile } from "node:fs/promises";
import { FeatureCollection } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const geojsonStr = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.geojson`), { encoding: 'utf8' });
    const geojson = JSON.parse(geojsonStr) as FeatureCollection;

    return NextResponse.json(geojson);
}