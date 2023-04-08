import { join } from 'node:path';
import { NextResponse } from 'next/server.js';
import { Database } from 'sqlite3';

const all = (db: Database, sql: string) => new Promise((resolve, reject) => db.all(sql, (err, rows) => err ? reject(err) : resolve(rows)));

export async function GET(request: Request) {
    const db = new Database(join(process.cwd(), 'feeds', 'BA.db'));
    const routes = await all(db, 'SELECT * FROM routes');
    // const extent = createEmpty();
    // features.forEach(feature => extend(extent, feature.getGeometry()!.getExtent()));
    return NextResponse.json(routes);
}  