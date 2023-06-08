import { Agency as GTFSAgency, Route } from 'gtfs-types';
import { Feature, MultiLineString, Polygon } from 'geojson';

export interface Agency {
    box: Feature<Polygon, GTFSAgency>;
    area: Feature<Polygon, GTFSAgency>;
    info: GTFSAgency;
    routes: { [key: string]: Feature<MultiLineString, Route> };
}

export interface Agencies {
    agencies: { [key: string]: Agency; };
    bounds: [number, number, number, number];
}

export interface Vehicle {
    vehicle_id: string;
    latitude: number;
    longitude: number;
    bearing: number | null;
    speed: number | null;
    trip_headsign: string;
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    route_color: string;
    route_url: string;
    stops: {
        id: string;
        timestamp?: string;
    }[];
}

export interface VehiclePayload { [key: string]: Vehicle };

export interface Stop {
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    stop_url: string;
    route_ids: string[];
}

export interface StopPayload { [key: string]: Stop };