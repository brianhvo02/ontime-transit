import { Agency as GTFSAgency, Route, VehicleUpdate } from 'gtfs-types';
import { Feature, FeatureCollection, Polygon } from 'geojson';

export interface Agency extends GTFSAgency {
    box: Feature<Polygon, GTFSAgency>;
    area: Feature<Polygon, GTFSAgency>;
}

export interface Agencies {
    agencies: Agency[];
    bounds: [number, number, number, number];
    routes: FeatureCollection<Polygon, Route>;
}

export interface Vehicle {
    vehicle_id: string;
    update_id: string;
    latitude: number;
    longitude: number;
    bearing: number | null;
    speed: number | null;
    route_short_name: string;
    route_long_name: string;
}

export interface VehiclePayload extends Map<string, Vehicle> {};