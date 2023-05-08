import express from 'express';
import { readFile } from 'fs/promises';
import { Feature, FeatureCollection, MultiLineString, multiLineString, Position } from '@turf/turf';
import { Database } from 'sqlite3';
import { join } from 'path';

const router = express.Router();

const all = (db: Database, sql: string, ...params: string[]): Promise<{ [key: string]: string }[]> => new Promise((resolve, reject) => db.all(sql, params, (err, rows: { [key: string]: string }[]) => err ? reject(err) : resolve(rows)));
const get = (db: Database, sql: string, ...params: string[]): Promise<{ [key: string]: string }> => new Promise((resolve, reject) => db.get(sql, params, (err, row: { [key: string]: string }) => err ? reject(err) : resolve(row)));

router.get('/routes/:routeId', async (req, res) => {
    const date = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const db = new Database(join(process.cwd(), 'feeds', `SF.db`));
    
    const rawTrips = await all(db, `
        SELECT stops.stop_id, stop_sequence, stop_name, stop_lat, stop_lon, stop_url
        FROM stop_times 
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN stops ON stops.stop_id = stop_times.stop_id
        JOIN routes ON routes.route_id = trips.route_id
        LEFT OUTER JOIN calendar ON trips.service_id = calendar.service_id
        WHERE routes.route_id = ? AND
            (
                trips.service_id IN (
                    SELECT service_id
                    FROM calendar_dates 
                    WHERE date = "${date.getFullYear() * 1e4 + (date.getMonth() + 1) * 100 + date.getDate()}"
                        AND exception_type = 1
                )
                OR (
                    trips.service_id NOT IN (
                        SELECT service_id
                        FROM calendar_dates 
                        WHERE date = "${date.getFullYear() * 1e4 + (date.getMonth() + 1) * 100 + date.getDate()}"
                            AND exception_type = 2
                    )
                    AND ${days[date.getDay()]} = 1
                )
            )
        GROUP BY stops.stop_id
        ORDER BY stop_sequence
    `, req.params.routeId);
    

    res.json(rawTrips);
});

export default router;
