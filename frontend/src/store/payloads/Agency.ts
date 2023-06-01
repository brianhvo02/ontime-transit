import { Agency as GTFSAgency, Route } from 'gtfs-types';
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