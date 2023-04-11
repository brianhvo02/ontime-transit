import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ProjectionLike, fromLonLat, toLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry, Point} from 'ol/geom';
import 'ol/ol.css';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';

import {RMap, RLayerVector, RStyle, RenderEvent, VectorSourceEvent, MapBrowserEvent, RLayerBaseVector, RFeatureUIEvent, RPopup, RContext, RLayerVectorProps, RContextType} from 'rlayers';
import { Style } from 'ol/style.js';
import MyOSM from './MyOSM';

import Arrow from '../../public/arrow.png';
import { InfoPanelRef, MapRef, RouteFeaturesContext, RouteFeaturesDispatchContext, SelectedFeaturesContext, SelectedFeaturesDispatchContext, StopFeaturesContext, StopFeaturesDispatchContext, VehicleFeaturesContext, VehicleFeaturesDispatchContext } from './FeaturesContext';
import { Extent, createEmpty, extend, getCenter } from 'ol/extent.js';
import { features } from 'process';
import { Coordinate } from 'ol/coordinate.js';
import InfoPanel from './Info';
import { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { FeatureCollection } from 'geojson';

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
export const emptyStyle = new Style({});

export default function MapComponent() {
    // const { data: geojson, error: geojsonError, isLoading: geojsonIsLoading } = useSWRImmutable('/api/feeds/gtfs/SF', fetcher);
    const { data: vehicles, error: vehiclesError, isLoading: vehiclesIsLoading }: { data: FeatureCollection, error: any, isLoading: boolean } = useSWR('/api/feeds/rt/vehicles/SF', fetcher, { refreshInterval: 60000 });
    // const { data: vehicles, error: vehiclesError, isLoading: vehiclesIsLoading }: { data: FeatureCollection, error: any, isLoading: boolean } = useSWR('/api/feeds/rt/vehicles/SF', fetcher);
    // const mapRef = useContext(MapRef);
    const infoPanelRef = useContext(InfoPanelRef);

    const selectedFeatures = useContext(SelectedFeaturesContext);
    const setSelectedFeatures = useContext(SelectedFeaturesDispatchContext);
    const vehicleFeatures = useContext(VehicleFeaturesContext);
    const setVehicleFeatures = useContext(VehicleFeaturesDispatchContext);
    // const [vehicleFeatures, setVehicleFeatures] = useState<Feature[]>([]);
    const routeFeatures = useContext(RouteFeaturesContext);
    const setRouteFeatures = useContext(RouteFeaturesDispatchContext);
    const stopFeatures = useContext(StopFeaturesContext);
    const setStopFeatures = useContext(StopFeaturesDispatchContext);
    const vehicleLayer = useRef<RLayerVector>(null);

    useEffect(() => {
        if (vehicles && vehicleLayer.current) {
            const source = vehicleLayer.current.ol.getSource();
            if (source) {
                console.log('Updating vehicles...')
                source.forEachFeature(feature => {
                    // if (feature.get('id') === '8921') {
                        const update = vehicles.features.find(f => f.properties?.id === feature.get('id'));
                        if (update?.properties) {
                            update.properties.geometry = new GeoJSON().readGeometry(update.geometry);
                            update.properties.geometry.setCoordinates(fromLonLat(update.properties.geometry.getCoordinates()));
                            feature.setProperties(update.properties);
                        }
                    // }
                });
            }
        }
    }, [vehicles])

    function handleMapClick(this: RMap, e: MapBrowserEvent<UIEvent>) {
        if (!routeFeatures || !vehicleFeatures || !setSelectedFeatures || !infoPanelRef || !stopFeatures) return;

        const mapFeatures: Feature[] = [];
        const extent = createEmpty();
        const map = e.target as Map
        const mapDiv = map.getTargetElement();
        
        vehicleFeatures.forEach(feature => {
            const [x, y] = e.pixel;
            const [posX, posY] = e.map.getPixelFromCoordinate((feature.getGeometry() as Point).getCoordinates());
            if (
                (
                    Math.abs(posX - x) < PIXEL_OFFSET 
                        && Math.abs(posY - y) < PIXEL_OFFSET 
                        && feature.getStyle() !== emptyStyle
                )
            ) {
                mapFeatures.push(feature);
                extend(extent, feature.getGeometry()!.getExtent());
            } else {
                feature.setStyle(emptyStyle);
            }
        });

        if (mapFeatures.length > 0) {
            const newExtent = extendExtent(extent, 0.5);
            extent.length = 0;
            extent.push(...newExtent);
        } else {
            routeFeatures.forEach(feature => {
                const closestPoint = feature.getGeometry()?.getClosestPoint(e.coordinate);
                if (!closestPoint) return;
                const [x, y] = e.pixel;
                const [closestX, closestY] = e.map.getPixelFromCoordinate(closestPoint);
                if (
                    (
                        Math.abs(closestX - x) < PIXEL_OFFSET 
                            && Math.abs(closestY - y) < PIXEL_OFFSET 
                            && feature.getStyle() !== emptyStyle
                    )
                ) {
                    mapFeatures.push(feature);
                    extend(extent, feature.getGeometry()!.getExtent());
                    feature.setStyle();
                } else {
                    feature.setStyle(emptyStyle);
                }
            });
        }

        if (mapFeatures.length === 0) {
            routeFeatures.concat(vehicleFeatures).forEach(f => f.setStyle());
            stopFeatures.forEach(f => f.setStyle(emptyStyle));
            if (!mapDiv.classList.contains('reveal')) return;
            if (infoPanelRef.current) {
                infoPanelRef.current.classList.remove('reveal');
                mapDiv.classList.remove('reveal');
            }

            const [mapX, mapY] = e.map.getSize()!;

            const layer = e.map.getAllLayers()[1] as VectorLayer<VectorSource<Geometry>>;
            e.map.getView().fit(layer.getSource()?.getExtent()!, {
                padding: [10, 10, 10, 10],
                duration: 1000,
                size: mapDiv.classList.contains('reveal') ? [mapX, mapY] : [mapX, mapY * 2]
            });
            
            return;
        }

        setSelectedFeatures(mapFeatures);

        const [mapX, mapY] = e.map.getSize()!;
        e.map.getView().fit(extent, {
            padding: [10, 10, 10, 10],
            duration: 1000,
            size: mapDiv.classList.contains('reveal') ? [mapX, mapY] : [mapX, mapY / 2]
        });

        if (infoPanelRef.current) {
            mapDiv.classList.add('reveal');
            infoPanelRef.current.classList.add('reveal');
        }
    }

    const routeFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => setRouteFeatures!(e.features!);
    const stopFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => {
        e.features!.forEach(f => f.setStyle(emptyStyle));
        setStopFeatures!(e.features!);
    }
    const vehicleFeaturesLoaded = (e: VectorSourceEvent<Geometry>) => {
        // e.features!.forEach(f => f.get('id') === '1516' || f.setStyle(emptyStyle))
        setVehicleFeatures!(e.features!);
    }
    
    
    return (
        <>
            <RMap
                className='map'
                initial={useMemo(() => ({center: fromLonLat([-122.45284, 37.75523]), zoom: 13}), [])}
                noDefaultControls={true}
                onRenderComplete={useCallback(function (this: RMap, e: RenderEvent) {}, [])}
                onClick={useCallback(handleMapClick, [vehicleFeatures, routeFeatures])}
            >
                <MyOSM />
                <RLayerVector
                    // @ts-expect-error
                    className="features-layer"
                    onFeaturesLoadEnd={useCallback(routeFeaturesLoaded, [])} 
                    format={new GeoJSON({ featureProjection: "EPSG:3857" })} 
                    url='/api/feeds/gtfs/routes/SF'
                >
                    <RStyle.RStyle
                        cacheSize={1024}
                        cacheId={useCallback((feature: Feature<Geometry>) => feature.get('route_id'), [])}
                        render={useCallback((feature: Feature<Geometry>) => {
                            const color = feature.get('route_color').length === 7 ? feature.get('route_color') : 'rgba(255, 255, 255, 0.8)';
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
                    url='/api/feeds/gtfs/stops/SF'>
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
                    url='/api/feeds/rt/vehicles/SF'>
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
            </RMap>
        </>
    )
}