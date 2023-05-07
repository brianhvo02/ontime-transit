import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ProjectionLike, fromLonLat, toLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry, MultiLineString, Point, Polygon} from 'ol/geom';
import 'ol/ol.css';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';

import {RMap, RLayerVector, RStyle, RenderEvent, VectorSourceEvent, MapBrowserEvent, RLayerBaseVector, RFeatureUIEvent, RPopup, RContext, RLayerVectorProps, RContextType} from 'rlayers';
import { Style } from 'ol/style.js';
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
import AgencyLayer from './AgencyLayer';
import { Size } from 'ol/size.js';

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
    const { data: agencies, error: agenciesError, isLoading: agenciesAreLoading } = useSWRImmutable('/api/agencies', fetcher);

    const {
        infoPanelRef,
        mapRef,
        selectedFeatures,
        setSelectedFeatures,
        vehicleFeatures,
        agencyFeatures,
        routeFeatures,
        stopFeatures
    } = useContext(MapContext)!;

    const [firstRender, setFirstRender] = useState(false);

    const agencyLayers = (agencies || []).filter((agency: { [key: string]: string | boolean }) => agency['GTFS']).map((agency: { [key: string]: string }) => <AgencyLayer key={agency['Id']} agencyId={agency['Id']} agencyName={agency['Name']}></AgencyLayer>)

    const getCurrentSelect = () => (
        selectedFeatures ? 
            selectedFeatures.vehicles.length > 0 ? selectedFeatures.vehicles : 
                selectedFeatures.stops.length > 0 ? selectedFeatures.stops : 
                    selectedFeatures.routes.length > 0 ? selectedFeatures.routes : 
                        selectedFeatures.agencies.length > 0 ? selectedFeatures.agencies : 
                            []
        : []
    )

    const handleMove = function(this: RMap, e: MapBrowserEvent<UIEvent>) {
        if (selectedFeatures.agencies.length === 0) {
            const agencies: string[] = [];
            agencyFeatures.forEach(f => f.getStyle() === emptyStyle || !f.getGeometry()?.intersectsCoordinate(e.coordinate) || agencies.push(f.get('agency_id')));
            if (agencies.length > 0) {
                routeFeatures.forEach(f => agencies.includes(f.get('agency_id')) ? f.setStyle() : f.setStyle(emptyStyle));
            } else {
                routeFeatures.forEach(f => f.setStyle());
            }

            return;
        }

        if (selectedFeatures.routes.length === 0 && selectedFeatures.vehicles.length === 0) {
            const agencyId = selectedFeatures.agencies[0].get('agency_id');
            const vehicles: Feature[] = [];
            const routes: Feature[] = [];
            const [x, y] = e.pixel;

            vehicleFeatures.forEach(f => {
                const [closestX, closestY] = this.ol.getPixelFromCoordinate(f.getGeometry()?.getClosestPoint(e.coordinate)!);
                if (f.getStyle() !== emptyStyle && (Math.abs(x - closestX) < 3 && Math.abs(y - closestY) < 3)) vehicles.push(f);
            });

            routeFeatures.forEach(f => {
                const [closestX, closestY] = this.ol.getPixelFromCoordinate(f.getGeometry()?.getClosestPoint(e.coordinate)!);
                if (f.getStyle() !== emptyStyle && (Math.abs(x - closestX) < 3 && Math.abs(y - closestY) < 3)) routes.push(f);
            });

            if (vehicles.length > 0) {
                vehicleFeatures.forEach(f => vehicles.includes(f) ? f.setStyle() : f.setStyle(emptyStyle));
                routeFeatures.forEach(f => vehicles.find(vehicle => vehicle.get('route_id') === f.get('route_id')) ? f.setStyle() : f.setStyle(emptyStyle));
            } else {
                if (routes.length > 0) {
                    routeFeatures.forEach(f => routes.includes(f) ? f.setStyle() : f.setStyle(emptyStyle));
                    vehicleFeatures.forEach(f => routes.find(route => route.get('route_id') === f.get('route_id')) ? f.setStyle() : f.setStyle(emptyStyle))
                } else {
                    routeFeatures?.forEach(f => f.get('agency_id') !== agencyId || f.setStyle());
                    vehicleFeatures?.forEach(f => f.get('agency_id') !== agencyId || f.setStyle());
                }
            }
        }
    }

    const agencyClick = (coordinate: Coordinate, map: Map) => {
        const selectedAgencies: Feature<Polygon>[] = [];
        const extent = createEmpty();

        agencyFeatures.forEach(feature => {
            if (feature.getGeometry()?.intersectsCoordinate(coordinate) && feature.getStyle() !== emptyStyle) {
                selectedAgencies.push(feature)
                extend(extent, feature.getGeometry()!.getExtent());
            }
        });

        if (selectedAgencies.length > 0) {
            console.log('clicked on agency');
            if (selectedAgencies.length === 1) {
                map.getView().fit(selectedAgencies[0].getGeometry()?.getExtent()!, {
                    padding: [10, 10, 10, 10],
                    duration: 1000,
                    size: map.getSize()
                });
                selectedAgencies[0].setStyle(emptyStyle);
                // routeFeatures.forEach(f => f.get('agency_id') === selectedAgencies[0].get('agency_id') ? f.setStyle() : f.setStyle(emptyStyle));
                vehicleFeatures.forEach(f => f.get('agency_id') === selectedAgencies[0].get('agency_id') ? f.setStyle() : f.setStyle(emptyStyle));
                setSelectedFeatures(prev => {
                    return { 
                        ...prev,
                        agencies: selectedAgencies
                    }
                });
                return;
            }

            agencyFeatures.forEach(f => selectedAgencies.includes(f) || f.setStyle(emptyStyle));
            setSelectedFeatures(prev => {
                return { 
                    ...prev,
                    agencies: selectedAgencies
                }
            });
        } else {
            console.log('clicked on nothing');
            map.getView().fit([-13698351.966894459, 4435586.85631716, -13463920.979430618, 4735980.033863289], {
                padding: [10, 10, 10, 10],
                duration: 1000,
                size: map.getSize()
            });
            return;
        }
    }

    const handleMapClick = function(this: RMap, e: MapBrowserEvent<UIEvent>) {
        const extent = createEmpty();
        const map = e.target as Map
        const mapDiv = map.getTargetElement();

        if (selectedFeatures.agencies.length === 0) {
            agencyClick(e.coordinate, e.map);
        } else if (selectedFeatures.vehicles.length === 0 && selectedFeatures.routes.length === 0) {
            const selectedVehicles: Feature<Point>[] = [];
            vehicleFeatures.forEach(feature => {
                const [x, y] = e.pixel;
                e.coordinate
                const [posX, posY] = e.map.getPixelFromCoordinate((feature.getGeometry() as Point).getCoordinates());
                if (
                    (
                        Math.abs(posX - x) < PIXEL_OFFSET 
                            && Math.abs(posY - y) < PIXEL_OFFSET 
                            && feature.getStyle() !== emptyStyle
                    )
                ) {
                    selectedVehicles.push(feature);
                    extend(extent, feature.getGeometry()!.getExtent());
                    feature.setStyle();
                } else {
                    feature.setStyle(emptyStyle);
                }
            });

            if (selectedVehicles.length > 0) {
                console.log('clicked on vehicle');
                if (selectedVehicles.length === 1) {
                    console.log(selectedVehicles[0])
                    const newExtent = extendExtent(extent, 0.5);
                    extent.length = 0;
                    extent.push(...newExtent);
                    const currentStopSequence = selectedVehicles[0].get('stop_sequence');
                    const currentStop = selectedVehicles[0].get('stops')[currentStopSequence - 1];
                    stopFeatures.find(f => f.get('agency_id') === selectedVehicles[0].get('agency_id') && f.get('stop_id') === currentStop['stop_id'])?.setStyle();
                }

                setSelectedFeatures(prev => {
                    return { 
                        ...prev,
                        vehicles: selectedVehicles
                    }
                });
            } else {
                const selectedRoutes: Feature<MultiLineString>[] = [];
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
                        selectedRoutes.push(feature);
                        extend(extent, feature.getGeometry()!.getExtent());
                        feature.setStyle();
                    } else {
                        feature.setStyle(emptyStyle);
                    }
                });

                if (selectedRoutes.length > 0) {
                    console.log('clicked on route');
                } else {
                    console.log('clicked on nothing');
                    routeFeatures.forEach(f => f.get('agency_id') === selectedFeatures.agencies[0].get('agency_id') ? f.setStyle() : f.setStyle(emptyStyle));
                    vehicleFeatures.forEach(f => f.get('agency_id') === selectedFeatures.agencies[0].get('agency_id') ? f.setStyle() : f.setStyle(emptyStyle));
                    e.map.getView().fit(selectedFeatures.agencies[0].getGeometry()?.getExtent()!, {
                        padding: [10, 10, 10, 10],
                        duration: 1000,
                        size: e.map.getSize()
                    });
                    return;
                }
            }
        } else {
            getCurrentSelect().forEach(f => {
                const newExtent = f.getGeometry()?.getType() === 'Point' ? extendExtent(f.getGeometry()?.getExtent()!, 0.5) : f.getGeometry()?.getExtent()!;
                extend(extent, newExtent);
            });
        }

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

    return (
        <RMap
            className='map'
            initial={useMemo(() => ({center: [-13581136.47316254, 4585783.445090225], zoom: 2}), [])}
            noDefaultControls={true}
            onRenderComplete={useCallback(function (this: RMap, e: RenderEvent) {
                if (!firstRender) {
                    this.ol.getView().fit([-13698351.966894459, 4435586.85631716, -13463920.979430618, 4735980.033863289], {
                        padding: [10, 10, 10, 10],
                        duration: 2000,
                        size: this.ol.getSize()
                    });
                    setFirstRender(true);
                }
                
            }, [firstRender])}
            onClick={useCallback(handleMapClick, [agencyFeatures, vehicleFeatures, routeFeatures, selectedFeatures])}
            onPointerMove={useCallback(handleMove, [agencyFeatures, routeFeatures, selectedFeatures])}
            ref={mapRef}
        >
            <MyOSM />
            {agencyLayers}
            
        </RMap>
    )
}