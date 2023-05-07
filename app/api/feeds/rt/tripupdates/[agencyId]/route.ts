import { readFile, writeFile } from "node:fs/promises";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { Database } from "sqlite3";

// const all = (db: Database, sql: string): Promise<{ [key: string]: string | number }[]> => new Promise((resolve, reject) => db.all(sql, (err, rows: { [key: string]: string | number }[]) => err ? reject(err) : resolve(rows)));
// const get = (db: Database, sql: string): Promise<{ [key: string]: string | number }> => new Promise((resolve, reject) => db.get(sql, (err, row: { [key: string]: string | number }) => err ? reject(err) : resolve(row)));

interface Checksum {
    rtVehicles: {
        lastUpdated: number;
    }

    rtTripUpdates: {
        lastUpdated: number;
    }
}

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const rtUpdate = JSON.parse(await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.json`), { encoding: 'utf-8' })) as Checksum;

    let rtBuffer;
    if (new Date(rtUpdate.rtTripUpdates.lastUpdated + 60000) < new Date()) {
        console.log('Updating trips');
        rtBuffer = await fetch(`http://api.511.org/Transit/TripUpdates?agency=${params.agencyId}&api_key=${process.env.API_KEY}`).then(res => res.arrayBuffer());
        await writeFile(join(process.cwd(), 'feeds', `${params.agencyId}.rtTripUpdates`), Buffer.from(rtBuffer));
        rtUpdate.rtTripUpdates.lastUpdated = Date.now();
        await writeFile(join(process.cwd(), 'feeds', `${params.agencyId}.json`), JSON.stringify(rtUpdate), { encoding: 'utf-8' });
    } else {
        rtBuffer = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.rtTripUpdates`));
    }

    
    // 
    const feedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(rtBuffer));
    const limit = feedMessage.entity.slice(0, 5);
    
    // const db = new Database(join(process.cwd(), 'feeds', `${params.agencyId}.db`));

    return NextResponse.json(limit);
}