import { readFile } from "node:fs/promises";
import { FeatureCollection } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";

export async function GET(request: Request) {
    const agencies = await fetch(`https://api.511.org/transit/gtfsoperators?api_key=${process.env.API_KEY}`).then(res => res.json());

    return NextResponse.json(agencies);
}