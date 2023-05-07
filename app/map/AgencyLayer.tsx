import React, {ComponentProps, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ProjectionLike, fromLonLat, toLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry, MultiLineString, Point, Polygon} from 'ol/geom';
import 'ol/ol.css';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';

import {RMap, RLayerVector, RStyle, RenderEvent, VectorSourceEvent, MapBrowserEvent, RLayerBaseVector, RFeatureUIEvent, RPopup, RContext, RLayerVectorProps, RContextType} from 'rlayers';
import { Fill, Stroke, Style } from 'ol/style.js';
import MyOSM from './MyOSM';

import Arrow from '../../public/arrow.png';
import MapContext from './MapContext';
import { Extent, createEmpty, extend, getCenter } from 'ol/extent.js';
import { features } from 'process';
import { Coordinate } from 'ol/coordinate.js';
import InfoPanel from './Info';
import { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { FeatureCollection } from 'geojson';
import { emptyStyle } from './Map';

import { featureCollection, convex, point } from '@turf/turf';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// const { map } = useContext(RContext);

const getRadialExtent = function([lon, lat]: Coordinate, dist: number = 1) {
    const latDist = dist / 69;
    const lonDist = dist / (Math.cos(lat * Math.PI / 180) * 69.172);
    return [lon - lonDist, lat - latDist, lon + lonDist, lat + latDist];
}

const extendExtent = function(extent: Extent, dist: number = 1) {
    const [lon, lat] = toLonLat(getCenter(extent));
    const latDist = dist / 69;
    const lonDist = dist / (Math.cos(lat * Math.PI / 180) * 69.172);
    return [...fromLonLat([lon - lonDist, lat - latDist]), ...fromLonLat([lon + lonDist, lat + latDist])];
}


const PIXEL_OFFSET = 3;

export default function AgencyLayer({ agencyId, agencyName }: { agencyId: string, agencyName: string }) {
    const { data: vehicles, error: vehiclesError, isLoading: vehiclesIsLoading }: { data: FeatureCollection, error: any, isLoading: boolean } = useSWR('/api/feeds/rt/vehicles/SF', fetcher, { refreshInterval: 5000 });

    const {
        infoPanelRef,
        setAgencyFeatures,
        setRouteFeatures,
        setStopFeatures,
        setVehicleFeatures,
        selectedFeatures,
        routeFeatures
    } = useContext(MapContext)!;

    const convexLayer = useRef<RLayerVector>(null);
    const routeLayer = useRef<RLayerVector>(null);
    const vehicleLayer = useRef<RLayerVector>(null);
    const [selected, setSelected] = useState(false);
    const [routesLoaded, setRoutesLoaded] = useState(false);
    const [agencyRouteFeatures, setAgencyRouteFeatures] = useState<Feature<Geometry>[]>([]);

    useEffect(() => {
        if (vehicles && vehicleLayer.current) {
            const source = vehicleLayer.current.ol.getSource();
            if (source) {
                source.forEachFeature(feature => {
                    const update = vehicles.features.find(f => f.properties?.id === feature.get('id'));
                    if (update?.properties) {
                        update.properties.geometry = new GeoJSON().readGeometry(update.geometry);
                        update.properties.geometry.setCoordinates(fromLonLat(update.properties.geometry.getCoordinates()));
                        feature.setProperties(update.properties);
                    }
                });
            }
        }
    }, [vehicles]);

    const generateConvex = (features: Feature<MultiLineString>[]) => {
        const geoJSON = new GeoJSON();

        // @ts-expect-error
        const convexTurfFeature = convex(geoJSON.writeFeaturesObject(features));
        
        if (convexTurfFeature) {
            const convexFeature = geoJSON.readFeature(convexTurfFeature) as Feature<Polygon>;
            convexFeature.set('agency_id', agencyId);
            convexFeature.set('agency_name', agencyName);
            convexLayer.current?.ol.getSource()?.addFeature(convexFeature);
            setAgencyFeatures(prev => prev.concat(convexFeature));
        }
    }

    const routeFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => {
        const features = e.features! as Feature<MultiLineString>[];
        setRouteFeatures!(prev => prev.concat(features));
        setAgencyRouteFeatures(features);
        // e.features!.forEach(f => f.setStyle());
        generateConvex(features);
    };
    const stopFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => {
        const features = e.features! as Feature<Point>[];
        features.forEach(f => f.setStyle(emptyStyle));
        setStopFeatures!(prev => prev.concat(features));
    }
    const vehicleFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => {
        const features = e.features! as Feature<Point>[];
        features.forEach(f => f.setStyle(emptyStyle));
        setVehicleFeatures!(prev => prev.concat(features));
    };

    useEffect(() => {
        if (routesLoaded) {
            agencyRouteFeatures.forEach(f => f.get('agency_id') !== agencyId || (selected ? f.setStyle() : f.setStyle(emptyStyle)));
        } else {
            if (agencyRouteFeatures.length > 0) setRoutesLoaded(true);
        }
    }, [selected, agencyRouteFeatures]);
    
    return (
        <>
            <RLayerVector
                // @ts-expect-error
                className="features-layer"
                format={new GeoJSON({ featureProjection: "EPSG:3857" })}
                ref={convexLayer}
            >
                <RStyle.RStyle>
                    <RStyle.RStroke color='rgba(255, 255, 255, 0)' width={2} />
                    <RStyle.RFill color='rgba(255, 255, 255, 0)' />
                </RStyle.RStyle>
            </RLayerVector>
            <RLayerVector
                // @ts-expect-error
                className="features-layer"
                onFeaturesLoadEnd={useCallback(routeFeaturesLoaded, [])} 
                format={new GeoJSON({ featureProjection: "EPSG:3857" })} 
                url={`/api/feeds/gtfs/routes/${agencyId}`}
                ref={routeLayer}
            >
                <RStyle.RStyle
                    cacheSize={1024}
                    cacheId={useCallback((feature: Feature<Geometry>) => feature.get('route_id'), [])}
                    render={useCallback((feature: Feature<Geometry>) => {
                        const color = feature.get('route_color') && feature.get('route_color').length === 7 ? feature.get('route_color') : 'rgba(255, 255, 255, 0.8)';
                        return (
                            <>
                                <RStyle.RStroke color={color} width={2} />
                                <RStyle.RFill color={color} />
                            </>
                        )
                    }, [])}>
                </RStyle.RStyle>
            </RLayerVector>
            <RLayerVector
                // @ts-expect-error
                className="features-layer"
                onFeaturesLoadEnd={useCallback(stopFeaturesLoaded, [])} 
                format={new GeoJSON({ featureProjection: "EPSG:3857" })} 
                url={`/api/feeds/gtfs/stops/${agencyId}`}
            >
                <RStyle.RStyle
                    cacheSize={1024}
                    cacheId={useCallback((feature: Feature<Geometry>) => feature.get('stop_id'), [])}
                    render={useCallback((feature: Feature<Geometry>) => {
                        return (
                            <>
                                <RStyle.RCircle radius={2}>
                                    <RStyle.RFill color={'rgba(255, 255, 255, 0.8)'} />
                                    <RStyle.RStroke color={'rgba(255, 255, 255, 0.8)'} width={2} />
                                </RStyle.RCircle>
                            </>
                        )
                    }, [])}>
                </RStyle.RStyle>
            </RLayerVector>
            <RLayerVector
                ref={vehicleLayer}
                // @ts-expect-error
                className="features-layer"
                onFeaturesLoadEnd={useCallback(vehicleFeaturesLoaded, [])} 
                format={new GeoJSON({ featureProjection: "EPSG:3857" })} 
                url={`/api/feeds/rt/vehicles/${agencyId}`}
            >
                <RStyle.RStyle
                    cacheSize={1024}
                    cacheId={useCallback((feature: Feature<Geometry>) => feature.get('id'), [])}
                    render={useCallback((feature: Feature<Geometry>) => {
                        const color = feature.get('trip_id') ? 'rgba(50, 205, 50, 0.8)' : 'rgba(200, 8, 21, 0.8)';
                        if (feature.get('vehicle_bearing')) {
                            return (
                                <>
                                    <RStyle.RIcon src={Arrow.src} scale={0.01} color={color} rotation={feature.get('vehicle_bearing') * Math.PI / 180} />
                                </>
                            )
                        } else {
                            return (
                                <>
                                    <RStyle.RCircle radius={2}>
                                        <RStyle.RFill color={color} />
                                        <RStyle.RStroke color={color} width={2} />
                                    </RStyle.RCircle>
                                </>
                            )
                        }
                    }, [])}
                >
                </RStyle.RStyle>
            </RLayerVector>
        </>
    )
}