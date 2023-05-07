import { readFile, writeFile } from "node:fs/promises";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { join } from "node:path";
import { NextResponse } from "next/server.js";
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { Database } from "sqlite3";

const all = (db: Database, sql: string): Promise<{ [key: string]: string | number }[]> => new Promise((resolve, reject) => db.all(sql, (err, rows: { [key: string]: string | number }[]) => err ? reject(err) : resolve(rows)));
const get = (db: Database, sql: string): Promise<{ [key: string]: string | number }> => new Promise((resolve, reject) => db.get(sql, (err, row: { [key: string]: string | number }) => err ? reject(err) : resolve(row)));

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
    const info: FeatureCollection = {
        type: 'FeatureCollection',
        features: []
    };
    
    const agency = JSON.parse(await readFile(join(process.cwd(), 'feeds', '_agencies.json'), { encoding: 'utf8' })).find((agency: { [key: string]: string | boolean }) => agency['Id'] === params.agencyId);
    if (!agency['Monitored']) return NextResponse.json(info);
    const agencyName = agency['Name'];

    const rtBufferVehicles = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.rtVehicle`));
    const rtBufferTripUpdates = await readFile(join(process.cwd(), 'feeds', `${params.agencyId}.rtTripUpdates`));
    
    const feedMessageVehicles = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(rtBufferVehicles));
    const feedMessageTripUpdates = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(rtBufferTripUpdates));
    
    const db = new Database(join(process.cwd(), 'feeds', `${params.agencyId}.db`));

    // const date = new Date('2023-04-08 02:18:00 PM');
    const date = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const queries: {
        trip_id: string;
        stop_sequence: number;
    }[] = [];

    const features = await Promise.all(feedMessageVehicles.entity.map(async entity => {
        if (!entity.vehicle || !entity.vehicle.position) return;

        const feature: Feature = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [entity.vehicle.position.longitude, entity.vehicle.position.latitude]
            }
        }

        feature.properties!['agency_id'] = params.agencyId;
        feature.properties!['agency_name'] = agencyName;

        if (entity.vehicle.currentStopSequence) {
            const tripUpdate = feedMessageTripUpdates.entity.find(entity => entity.tripUpdate?.vehicle?.id === entity.id);
            if (entity.vehicle.trip) {
                const ids = {
                    trip_id: entity.vehicle.trip.tripId!,
                    stop_sequence: entity.vehicle.currentStopSequence!
                };
                queries.push(ids);
                Object.entries(ids).forEach(([k, v]) => feature.properties![k] = v);
            } else {
                const ids = {
                    trip_id: tripUpdate?.tripUpdate?.trip.tripId!,
                    stop_sequence: entity.vehicle.currentStopSequence!
                };
                queries.push(ids);
                Object.entries(ids).forEach(([k, v]) => feature.properties![k] = v);
            }

            if (entity.vehicle.currentStatus) feature.properties!['current_status'] = entity.vehicle.currentStatus;
        }
        
        feature.properties!['id'] = entity.id;
        if (entity.vehicle.position.bearing) feature.properties!['vehicle_bearing'] = entity.vehicle.position.bearing;
        if (entity.vehicle.occupancyStatus) feature.properties!['occupancy_status'] = entity.vehicle.occupancyStatus;

        return feature;
    }));

    if (queries.length > 0) {
        const trips = await all(db, `
            SELECT group_concat(time(stop_times.departure_timestamp, 'unixepoch')) as stop_scheduled_departure_times, group_concat(stops.stop_id) as stop_ids, group_concat(stops.stop_name) as stop_names, group_concat(stop_times.stop_sequence) as stop_sequences, trip_headsign, stop_headsign, trips.trip_id, routes.route_id, routes.route_short_name, routes.route_long_name
            FROM stop_times 
            JOIN trips ON trips.trip_id = stop_times.trip_id
            JOIN stops ON stops.stop_id = stop_times.stop_id
            JOIN routes ON routes.route_id = trips.route_id
            LEFT OUTER JOIN calendar ON trips.service_id = calendar.service_id
            WHERE ${queries.length > 0 ? `(${queries.map(query => `
                stop_times.trip_id = "${query.trip_id}"
            `).join(' OR ')}) AND ` : ''}
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
            GROUP BY trips.trip_id
            ORDER BY trips.trip_id
        `);

        trips.map(trip => {
            const stopIds = (trip.stop_ids as string).split(',');
            const stopNames = (trip.stop_names as string).split(',');
            const departureTimes = (trip.stop_scheduled_departure_times as string).split(',');
            const stopSequences = (trip.stop_sequences as string).split(',').map(stopSequence => parseInt(stopSequence));

            delete trip.stop_ids;
            delete trip.stop_names;
            delete trip.stop_scheduled_departure_times;
            delete trip.stop_sequences;

            return {
                ...trip,
                stops: stopSequences.map((stopSequence, i) => {
                    const stopTime = feedMessageTripUpdates.entity.find(entity => entity.tripUpdate?.trip.tripId === trip?.trip_id)?.tripUpdate?.stopTimeUpdate?.find(update => update.stopSequence! === stopSequence);
                    return {
                        stop_id: stopIds[i],
                        stop_name: stopNames[i],
                        stop_scheduled_departure_time: departureTimes[i],
                        stop_sequence: stopSequence,
                        stop_actual_departure_time: stopTime ? new Date(parseInt(`${stopTime?.departure ? stopTime.departure.time?.toString() : stopTime?.arrival?.time?.toString()}000`)).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null                    }
                }).sort((s1, s2) => s1.stop_sequence - s2.stop_sequence)
            }
        })
        .forEach((t: any, i) => Object.entries(t).forEach(([k, v]) => features.find(f => f?.properties?.trip_id === t.trip_id)!.properties![k] = v));
    }

    info.features = features as Feature<Geometry, GeoJsonProperties>[];

    return NextResponse.json(info);
}