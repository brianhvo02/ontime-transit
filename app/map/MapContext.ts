import { Map } from 'ol';
import Feature from 'ol/Feature.js';
import { Geometry, MultiLineString, Point, Polygon } from 'ol/geom.js';
import { SetStateAction, createContext, Dispatch, RefObject } from 'react';
import { RMap } from 'rlayers';

export interface SelectedFeatures {
    agencies: Feature<Polygon>[];
    routes: Feature<MultiLineString>[];
    stops: Feature<Point>[];
    vehicles: Feature<Point>[];
}

export interface MapContextObject {
    selectedFeatures: SelectedFeatures;
    setSelectedFeatures: Dispatch<SetStateAction<SelectedFeatures>>;
    routeFeatures: Feature<MultiLineString>[];
    setRouteFeatures: Dispatch<SetStateAction<Feature<MultiLineString>[]>>;
    stopFeatures: Feature<Point>[];
    setStopFeatures: Dispatch<SetStateAction<Feature<Point>[]>>;
    vehicleFeatures: Feature<Point>[];
    setVehicleFeatures: Dispatch<SetStateAction<Feature<Point>[]>>;
    agencyFeatures: Feature<Polygon>[];
    setAgencyFeatures: Dispatch<SetStateAction<Feature<Polygon>[]>>;
    infoPanelRef: RefObject<HTMLDivElement>;
    mapRef: RefObject<RMap>;
    getCurrentSelect: () => Feature<Polygon>[] | Feature<MultiLineString>[] | Feature<Point>[];
}

const MapContext = createContext<MapContextObject | null>(null);

export default MapContext;