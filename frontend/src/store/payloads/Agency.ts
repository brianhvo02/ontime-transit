import { Agency as GTFSAgency, Route, VehicleUpdate } from 'gtfs-types';
import { Feature, FeatureCollection, Polygon } from 'geojson';

export interface Agency {
    box: Feature<Polygon, GTFSAgency>;
    area: Feature<Polygon, GTFSAgency>;
    info: GTFSAgency;
}

export interface Agencies {
    agencies: Agency[];
    bounds: [number, number, number, number];
    routes: FeatureCollection<Polygon, Route>;
}

export interface Vehicle {
    vehicle_id: string;
    latitude: number;
    longitude: number;
    bearing: number | null;
    speed: number | null;
    trip_headsign: string;
    route_short_name: string;
    route_long_name: string;
    route_color: string;
    departure_timestamp: string | null;
    arrival_timestamp: string | null;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    stop_url: string;
}

export interface VehiclePayload extends Map<string, Vehicle> {};