import { Request, Router } from 'express';
import { ServerError, UnprocessableEntity, isError } from '../errors.js';
import { SqlResults, getAgencies, getRoutes, getShapesAsGeoJSON, getStops } from 'gtfs';
import { area, bbox, bboxPolygon, convex, featureCollection, multiLineString } from '@turf/turf';
import { FeatureCollection, Feature, MultiLineString, Position } from 'geojson';
import { Route } from 'gtfs-types';
import { getPrefix, removePrefix } from '../utils.js';

const AgencyRouter = Router();

const getAgencyInfo = async (agency_id: string | undefined = undefined) => {
    const results = agency_id ? getAgencies({ agency_id: `${agency_id}_${agency_id}` }) : getAgencies();

    if (!results.length) throw new UnprocessableEntity('Agency not found.');

    const agencies = results.reduce((obj, agency) => {
        const agency_id = getPrefix(agency.agency_id);
        const info = { 
            ...agency, 
            agency_id
        };

        const routes = getRoutes({
            agency_id: agency.agency_id
        }).reduce((obj, route) => {
            const route_id = removePrefix(route.route_id);
            obj[route_id] = multiLineString(
                getShapesAsGeoJSON({ route_id: route.route_id })
                    .features
                    .map(feature => feature.geometry.coordinates as Position[]), {
                        ...route, 
                        agency_id: getPrefix(agency.agency_id),
                        route_id
                    } as Route
            );
            return obj;
        }, {})

        const routesCollection: FeatureCollection<MultiLineString, Route> = featureCollection(Object.values(routes));
    
        const box = bboxPolygon(bbox(routesCollection));
        box.properties = info;
    
        const area = convex(routesCollection);
        if (area) area.properties = info;

        obj[agency_id] = {
            info, routes,
            box, area
        };

        return obj;
    }, {});
    
    return agencies;
}

AgencyRouter.get('/', async (req, res, next) => {
    try {
        const agencies = await getAgencyInfo();
        res.json({
            agencies,
            bounds: bbox(featureCollection(Object.values(agencies).map(agency => agency.box)))
        });
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});

AgencyRouter.get('/:agency_id', async (req, res, next) => {
    const { agency_id } = req.params;

    try {
        res.json(await getAgencyInfo(agency_id));
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});

AgencyRouter.get('/:agency_id/vehicles', async (req, res, next) => {
    const { agency_id } = req.params;

    try {
        if (agency_id.length !== 2) 
            throw new UnprocessableEntity('Agency not found');

        const vehicles = req.db.prepare(`
            SELECT
                bearing, latitude, longitude, speed, vehicle_id, 
                trip_headsign, route_id, route_short_name, route_long_name, route_color, route_url,
                group_concat(departure_timestamp) AS departure_timestamps, 
                group_concat(arrival_timestamp) AS arrival_timestamps, 
                group_concat(stop_id) AS stop_ids
            FROM (
                SELECT 
                    bearing, latitude, longitude, speed, vehicle_positions.vehicle_id, 
                    trip_headsign, routes.route_id, route_short_name, route_long_name, route_color, route_url,
                    departure_timestamp, arrival_timestamp, stop_id
                FROM vehicle_positions
                JOIN trips ON trips.trip_id = ('${agency_id}_' || vehicle_positions.trip_id)
                JOIN routes ON routes.route_id = trips.route_id
                JOIN trip_updates ON trip_updates.trip_id = vehicle_positions.trip_id
                JOIN stop_times_updates ON stop_times_updates.trip_id = vehicle_positions.trip_id
                WHERE agency_id = '${agency_id}_${agency_id}'
                    AND (
                        datetime(departure_timestamp) > datetime('now') 
                            OR datetime(arrival_timestamp) > datetime('now') 
                    )
                ORDER BY stop_times_updates.stop_sequence ASC
            )
            GROUP BY vehicle_id
            ORDER BY vehicle_id
        `).all() as SqlResults;

        if (vehicles.length) {
            res.json(vehicles.reduce((obj, vehicle) => {
                const departure_timestamps = vehicle.departure_timestamps?.split(',');
                const arrival_timestamps = vehicle.arrival_timestamps?.split(',');
                const stops = (vehicle.stop_ids as string).split(',').map((id, i) => ({
                    id,
                    timestamp: arrival_timestamps?.[i] || departure_timestamps?.[i] || undefined
                }));

                delete vehicle.stop_ids;
                delete vehicle.departure_timestamps;
                delete vehicle.arrival_timestamps;

                const vehiclePayload = { 
                    ...obj, 
                    [vehicle.vehicle_id]: {
                        ...vehicle,
                        route_id: removePrefix(vehicle.route_id),
                        stops
                    } 
                };

                return vehiclePayload;
            }, {}));
        } else {
            throw new UnprocessableEntity('No vehicles found for agency');
        }
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});

AgencyRouter.get('/:agency_id/stops', async (req, res, next) => {
    const { agency_id } = req.params;

    try {
        const stops = req.db.prepare('SELECT * FROM stops WHERE stop_id LIKE ?').all(`${agency_id}_%`) as SqlResults;

        if (stops.length) {
            res.json(stops.reduce((obj, stop) => {
                const stop_id = removePrefix(stop.stop_id);

                return { 
                    ...obj, 
                    [stop_id]: { 
                        ...stop, 
                        stop_id 
                    } 
                };
            }, {}));
        } else {
            throw new UnprocessableEntity('No agency found');
        }
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});


export default AgencyRouter;