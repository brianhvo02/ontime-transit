import { readFile } from "node:fs/promises";
import { FeatureCollection } from "geojson";
import { join } from "node:path";
import { NextResponse, NextRequest } from "next/server.js";
import { Database } from "sqlite3";

const all = (db: Database, sql: string) => new Promise((resolve, reject) => db.all(sql, (err, rows) => err ? reject(err) : resolve(rows)));

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const db = new Database(join(process.cwd(), 'feeds', `${params.agencyId}.db`));
    const routes = await all(db, 'SELECT * FROM routes');

    return NextResponse.json(routes);
}