import { Tile3DLayer } from '@deck.gl/geo-layers/typed';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { faArrowLeft, faArrowPointer, faArrowRight, faBuilding, faFlask, faHandPointer, faMap, faMountain, faSatellite, faShareFromSquare, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CesiumIonLoader } from '@loaders.gl/3d-tiles';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { area, bbox } from '@turf/turf';
import { Feature, MultiLineString, Polygon } from 'geojson';
import { Agency as GTFSAgency, Route } from 'gtfs-types';
import { LngLatBounds } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Map, { AttributionControl, FullscreenControl, GeolocateControl, Layer, MapRef, NavigationControl, SkyLayer, Source, useControl } from 'react-map-gl';
import { useGetAgenciesQuery, useGetStopsQuery, useGetVehiclesQuery } from '../../store/api/agency';
import { Vehicle, Stop } from '../../store/payloads/Agency';
import { convertApiError, hexToRGB } from '../../utils';
import CustomOverlay from '../SatelliteControl';
import './Map.scss';
import { createPortal } from 'react-dom';
import Modal from '../Modal';
import Loading from '../Modal/Loading';
import _ from 'lodash';
import { useLocation, useParams } from 'react-router-dom';

const DeckGLOverlay = (props: MapboxOverlayProps & {
    interleaved?: boolean;
}) => {
    const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
    overlay.setProps(props);
    return null;
}

// const layer = new Tile3DLayer({
//     id: 'tile-3d-layer',
//     // tileset json file url
//     data: 'https://api.cesium.com/v1/assets/96188/endpoint',
//     loader: CesiumIonLoader,
//     // https://cesium.com/docs/rest-api/
//     loadOptions: {
//       'cesium-ion': { accessToken: process.env.REACT_APP_CESIUM_ACCESS_TOKEN }
//     },
//     onTilesetLoad: (tileset) => {
//     //   // Recenter to cover the tileset
//     //   const {cartographicCenter, zoom} = tileset;
//     //   this.setState({
//     //       viewState: {
//     //         ...this.state.viewState,
//     //         longitude: cartographicCenter[0],
//     //         latitude: cartographicCenter[1],
//     //         zoom
//     //       }
//     //   });
//     },
//     // override scenegraph subLayer prop
//     _subLayerProps: {
//       scenegraph: {_lighting: 'flat'}
//     }
// });

const skyLayer: SkyLayer = {
    id: 'sky',
    type: 'sky',
    paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15
    }
};

const HomeMap = () => {
    const { agencyId, routeId, vehicleId, stopId } = useParams();
    const agenciesData = useGetAgenciesQuery();
    const map = useRef<MapRef>(null);
    const [cursor, setCursor] = useState(false);
    const [startSelection, setStartSelection] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<GTFSAgency | undefined>();
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
    const [selectedStop, setSelectedStop] = useState<Stop | undefined>();
    const [selectedRoute, setSelectedRoute] = useState<Route | undefined>();
    const [routePage, setRoutePage] = useState(0);
    const vehicleData = useGetVehiclesQuery(selectedAgency?.agency_id ?? skipToken, { pollingInterval: 60000 });
    const stopData = useGetStopsQuery(selectedAgency?.agency_id ?? skipToken);
    const [hoveredAgency, setHoveredAgency] = useState<GTFSAgency | undefined>();
    const [hoveredRoute, setHoveredRoute] = useState<Route | undefined>();
    const [hoveredStop, setHoveredStop] = useState<Stop | undefined>();
    const [showSatellite, setShowSatellite] = useState(false);
    const [showTerrain, setShowTerrain] = useState(false);
    const [show3D, setShow3D] = useState(false);
    const [showExperimental, setShowExperimental] = useState(false)

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!agencyId && !loaded) setLoaded(true);
        if (agencyId && agenciesData.data) {
            const agency = agenciesData.data.agencies[agencyId];
            if (agency && !loaded) {
                const agencyInfo = agency.info;
                if (agencyInfo) {
                    setSelectedAgency(agencyInfo);
                    setStartSelection(true);
                }
            }

            if (routeId) {
                if (!loaded) {
                    const route = agency.routes[routeId]?.properties;
                    if (route) setSelectedRoute(route);
                }
            } else if (vehicleId) {
                if (vehicleData.data && !loaded) {
                    const vehicle = vehicleData.data[vehicleId];
                    if (vehicle) setSelectedVehicle(vehicle);
                }
            }
            
            if (stopId) {
                if (stopData.data && !loaded) {
                    const stop = stopData.data[stopId];
                    if (stop) setSelectedStop(stop);
                    setLoaded(true);
                }
            } else {
                setLoaded(true);
            }
        }
    }, [agencyId, vehicleId, stopId, agenciesData, vehicleData, stopData]);

    const convexes = useMemo(() => agenciesData.data ? Object.values(agenciesData.data.agencies).map(agency => agency.area).filter(area => area).sort((a, b) => area(b) - area(a)) : undefined, [agenciesData.data]);

    const [shareLink, setShareLink] = useState<string | undefined>();
    const [tilesetUrl, setTilesetUrl] = useState<string | undefined>();
    const [satelliteUrls, setSatelliteUrls] = useState<string[]>([]);

    useEffect(() => {
        fetch('https://api.cesium.com/v1/assets/96188/endpoint', {
            headers: {
                'Authorization': `Bearer ${process.env.REACT_APP_CESIUM_ACCESS_TOKEN}`
            }
        }).then(res => res.json()).then(data => setTilesetUrl(data.url)); 

        // fetch(`https://dev.virtualearth.net/REST/v1/Imagery/Metadata/Aerial?key=${process.env.REACT_APP_BING_MAPS_KEY}`)
        //     .then(res => res.json())
        //     .then(data => {
        //         const resource = data.resourceSets[0].resources[0];
        //         const urls = resource.imageUrlSubdomains.map((subdomain: string) => `{z}|{x}|{y}|${resource.imageUrl.replace('{subdomain}', subdomain)}`);
        //         setSatelliteUrls(urls);
        //     });
    }, []);

    useEffect(() => {
        if (map.current && vehicleData.isSuccess && selectedVehicle) {
            const vehicle = vehicleData.data[selectedVehicle.vehicle_id]
            if (!vehicle) setSelectedVehicle(undefined)
            else if (!_.isEqual(vehicle, selectedVehicle)) {
                setSelectedVehicle(vehicle);
                if (!selectedStop) {
                    map.current.flyTo({ 
                        center: [vehicle.longitude, vehicle.latitude],
                        bearing: vehicle.bearing ?? 0,
                        pitch: 75,
                        zoom: 17,
                        duration: 1000,
                    });
                }
            }
        }
    }, [vehicleData, selectedVehicle, map, selectedStop]);

    // const terrainLayer = new TerrainLayer({
    //     id: 'terrain',
    //     minZoom: 0,
    //     strategy: 'no-overlap',
    //     elevationDecoder: {
    //         rScaler: 6553.6,
    //         gScaler: 25.6,
    //         bScaler: 0.1,
    //         offset: -10000
    //     },
    //     elevationData: `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.png?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`,
    //     texture: satelliteUrls,
    //     operation: 'terrain',
    //     fetch: (url, context) => {
    //         if (context.propName === 'elevationData')
    //             return load(url, [TerrainLoader], context.loadOptions);

    //         const [z, x, y, bingUrl] = url.split('|');
    //         const quadkey = tileXYToQuadKey(parseInt(x), parseInt(y), parseInt(z));
                
    //         return load(bingUrl.replace('{quadkey}', quadkey), [ImageLoader], context.loadOptions);
    //     },
    //     visible: !!satelliteUrls.length && showTerrain
    // });

    // const extensions = showTerrain ? [new TerrainExtension()] : [];

    const layer3d = new Tile3DLayer({
        id: 'tile-3d-layer',
        data: tilesetUrl,
        loader: CesiumIonLoader,
        loadOptions: {
            'cesium-ion': { accessToken: process.env.REACT_APP_CESIUM_ACCESS_TOKEN }
        },

        visible: show3D,
        // extensions
    });

    const agenciesLayer = new GeoJsonLayer({
        id: 'agencies',
        data: convexes,
        pickable: startSelection,
        stroked: false,
        getFillColor: [245, 245, 245, 0],
        onHover: pickingInfo => {
            const { properties }: Feature<Polygon, GTFSAgency> = pickingInfo.object ? pickingInfo.object : {};
            setHoveredAgency(properties);
            setCursor(!!pickingInfo.object);
        },
        onClick: (pickingInfo, event) => {
            const { properties }: Feature<Polygon, GTFSAgency> = pickingInfo.object ? pickingInfo.object : {};
            setSelectedAgency(properties);
            setHoveredAgency(undefined);
            map.current?.fitBounds(new LngLatBounds(bbox(pickingInfo.object) as [number, number, number, number]), { pitch: 55, padding: 64, duration: 1000 });
        },
        visible: !selectedAgency,
        // extensions
    });

    const routes = useMemo(() => 
        agenciesData.data && (
            (hoveredAgency || selectedAgency) 
                ? (selectedRoute || hoveredRoute || selectedVehicle) 
                    ? [agenciesData.data.agencies[selectedAgency?.agency_id || hoveredAgency?.agency_id || ''].routes[selectedRoute?.route_id || hoveredRoute?.route_id || selectedVehicle?.route_id || '']]
                    : Object.values<Feature<MultiLineString, Route>>(agenciesData.data.agencies[selectedAgency?.agency_id || hoveredAgency?.agency_id || ''].routes ?? {})
                : Object.values(agenciesData.data.agencies).map(agency => Object.values(agency.routes)).flat()
        ), [agenciesData, hoveredAgency, selectedAgency, selectedVehicle, hoveredRoute, selectedRoute]
    );

    const vehicles = useMemo(() =>
        vehicleData.data && (
            selectedVehicle
                ? [vehicleData.data[selectedVehicle.vehicle_id]] 
                : (selectedRoute || hoveredRoute)
                    ? Object.values(vehicleData.data).filter(vehicle => vehicle.route_id === selectedRoute?.route_id || vehicle.route_id === hoveredRoute?.route_id)
                    : Object.values(vehicleData.data)
        ), [vehicleData, selectedVehicle, selectedRoute, hoveredRoute]
    );

    const agencyRoutes = useMemo(() => 
        agenciesData.data && selectedAgency?.agency_id 
            ? Object.values<Feature<MultiLineString, Route>>(
                agenciesData.data.agencies[selectedAgency.agency_id].routes
                ).sort((a, b) => a.properties.route_id.localeCompare(b.properties.route_id)) 
            : undefined, [selectedAgency, agenciesData]
    );

    const routesLayer = new GeoJsonLayer({
        id: 'routes',
        data: routes,
        pickable: true,
        lineWidthUnits: 'pixels',
        getLineColor: ({ properties }) => hexToRGB(properties?.route_color ?? '') ?? [254, 135, 20],
        getLineWidth: 2,
    });

    const vehiclesLayer = new ScenegraphLayer({
        id: 'vehicles',
        data: vehicles,
        pickable: true,
        // sizeScale: 0.1,
        scenegraph: '/bus.glb',
        sizeMaxPixels: 1,
        getPosition: (vehicle: Vehicle) => [
            vehicle.longitude || 0,
            vehicle.latitude || 0,
        ],
        getOrientation: (vehicle: Vehicle)  => [0, 90 - (vehicle.bearing ?? 0), 90],
        _lighting: 'pbr',
        updateTriggers: {
            getPosition: vehicleData,
            getOrientation: vehicleData
        },
        onClick: pickingInfo => {
            const vehicle: Vehicle = pickingInfo.object;
            setSelectedStop(undefined);
            setSelectedVehicle(vehicle);
            if (vehicle) 
                map.current?.flyTo({ 
                    center: [vehicle.longitude, vehicle.latitude],
                    bearing: vehicle.bearing ?? 0,
                    pitch: 75,
                    zoom: 17,
                    duration: 1000,
                });
        },
    });

    const selectedVehicleStops = useMemo(() => (selectedVehicle && stopData.data) ? selectedVehicle.stops.map(({ id, timestamp }) => ({ ...stopData.data?.[id], timestamp })) : undefined, [selectedVehicle, stopData]);

    const selectedRouteStops = useMemo(() => 
        (selectedRoute && stopData.data) 
            ? Object.values(stopData.data)
                .filter(stop => stop.route_ids.includes(selectedRoute.route_id))
                .sort((a, b) => a.stop_name.localeCompare(b.stop_name)) 
            : undefined, [selectedRoute, stopData, hoveredStop]
    );

    const stopsLayer = new ScenegraphLayer({
        id: 'stops',
        data: selectedVehicleStops || selectedRouteStops?.filter(stop => stop.stop_id === (hoveredStop?.stop_id ?? selectedStop?.stop_id ?? stop.stop_id)),
        pickable: true,
        sizeScale: 10,
        sizeMaxPixels: 20,
        scenegraph: '/bus_stop.glb',
        onClick: pickingInfo => {
            const stop: Stop = pickingInfo.object;
            setSelectedStop(stop);
            if (stop) 
                map.current?.flyTo({ 
                    center: [stop.stop_lon ?? 0, stop.stop_lat ?? 0],
                    pitch: 75,
                    zoom: 17,
                    duration: 1000,
                });
        },
        getPosition: (stop: Stop) => [
            stop.stop_lon || 0,
            stop.stop_lat || 0,
        ],
        getOrientation: [0, -(selectedVehicle?.bearing ?? map.current?.getBearing() ?? 0), 90],
        _lighting: 'pbr',
        updateTriggers: {
            getOrientation: selectedVehicle
        },
    });

    if (agenciesData.isLoading || !loaded) return (
        <Modal>
            <Loading />
        </Modal>
    );

    if (agenciesData.isError) return (
        <Modal>
            <h2>Error: {convertApiError(agenciesData.error)}</h2>
        </Modal>
    );

    const shareHandler = () => {
        let link = window.location.origin;
        if (selectedAgency?.agency_id) {
            link += `/agencies/${selectedAgency.agency_id}`;

            if (selectedRoute)
                link += `/routes/${selectedRoute.route_id}`;

            if (selectedVehicle)
                link += `/vehicles/${selectedVehicle.vehicle_id}`;

            if (selectedStop) 
                link += `/stops/${selectedStop.stop_id}`;
        }

        navigator.clipboard.writeText(link);
        setShareLink(link);
    }

    return (
        <Map
            ref={map}
            initialViewState={(() => {
                const coordinates = (
                    selectedStop
                        ? [selectedStop.stop_lon ?? 0, selectedStop.stop_lat ?? 0]
                        : selectedVehicle
                            ? [selectedVehicle.longitude, selectedVehicle.latitude]
                            : null
                );

                if (coordinates)  {
                    return { 
                        longitude: coordinates[0],
                        latitude: coordinates[1],
                        bearing: selectedVehicle?.bearing ?? 0,
                        pitch: 75,
                        zoom: 17
                    };
                } else {
                    if (routes && selectedRoute) {
                        return {
                            bounds: new LngLatBounds(bbox(routes[0]) as [number, number, number, number]),
                            fitBoundsOptions: { pitch: 55, padding: 64 } 
                        }
                    } else {
                        const box = agenciesData.data?.agencies[selectedAgency?.agency_id ?? '']?.box.bbox as [number, number, number, number];
                        return {
                            bounds: selectedAgency ? box : new LngLatBounds(agenciesData.data?.bounds), 
                            fitBoundsOptions: { padding: 64 } 
                        };
                    }
                }
            })()}
            maxPitch={85}
            mapStyle={showSatellite ? '/api/mapStyle' : 'mapbox://styles/mapbox/dark-v11'}
            style={{
                position: 'absolute',
                zIndex: 0,
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh'
            }}
            attributionControl={false}
            cursor={cursor ? 'pointer' : 'default'}
            terrain={showTerrain ? { source: 'mapbox-dem' } : undefined}
            maxZoom={19}
        >
            {
                vehicleData.isLoading &&
                createPortal(
                    <Modal>
                        <Loading />
                    </Modal>,
                    document.body
                )
            }
            {
                shareLink &&
                createPortal(
                    <Modal closeModal={() => setShareLink(undefined)}>
                        <div className='share-link'>
                            <h2>Link copied to clipboard!</h2>
                            <input onClick={e => e.currentTarget.select()} value={shareLink} readOnly />
                        </div>
                    </Modal>,
                    document.body
                )
            }
            <Source
                id='mapbox-dem'
                type='raster-dem'
                url='mapbox://mapbox.mapbox-terrain-dem-v1'
                tileSize={512}
                maxzoom={14}
            />
            {
                showSatellite &&
                <Layer {...skyLayer} />
            }
            <NavigationControl position='top-left' />
            <GeolocateControl position='top-left' />
            <FullscreenControl position='top-left' />
            <CustomOverlay>
                <button type='button' aria-label={showSatellite ? 'Switch to map view' : 'Switch to satellite/terrain view'} onClick={() => setShowSatellite(prev => !prev)}>
                    <span 
                        className='mapboxgl-ctrl-icon' 
                        aria-hidden='true' 
                        title={showSatellite ? 'Switch to map view' : 'Switch to satellite/terrain view'}
                        style={{
                            backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                <FontAwesomeIcon icon={showSatellite ? faSatellite : faMap} color='#333' fixedWidth transform='shrink-3' />
                            ))}')`
                        }}
                    />
                </button>
            </CustomOverlay>
            {
                <CustomOverlay>
                    <button type='button' aria-label={selectedAgency ? 'Start over' : startSelection ? 'Move the map' : 'Select an agency'} onClick={() => {
                        if (selectedAgency) {
                            setSelectedAgency(undefined);
                            setStartSelection(false);
                            setHoveredAgency(undefined);
                            setHoveredRoute(undefined);
                            setSelectedVehicle(undefined);
                            setSelectedStop(undefined);
                            setSelectedRoute(undefined);
                            setRoutePage(0);
                            map.current?.fitBounds(new LngLatBounds(agenciesData.data?.bounds), { pitch: 55, padding: 64, duration: 1000 })
                        } else {
                            setStartSelection(prev => !prev)
                        }
                    }}>
                        <span 
                            className='mapboxgl-ctrl-icon' 
                            aria-hidden='true' 
                            title={selectedAgency ? 'Start over' : startSelection ? 'Move the map' : 'Select an agency'}
                            style={{
                                backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                    <FontAwesomeIcon icon={selectedAgency ? faX : startSelection ? faHandPointer : faArrowPointer} color='#333' fixedWidth transform='shrink-3' />
                                ))}')`
                            }}
                        />
                    </button>
                </CustomOverlay>
            }
            {
                startSelection &&
                <CustomOverlay>
                    <div className='display'>
                        {
                            (selectedVehicle || selectedStop || selectedAgency || selectedRoute) &&
                            <nav
                                style={{
                                    justifyContent: (selectedVehicle || selectedStop || selectedRoute)
                                        ? 'space-between'
                                        : 'flex-end'
                                }} 
                            >
                                {
                                    (selectedVehicle || selectedStop || selectedRoute) &&
                                    <FontAwesomeIcon 
                                        icon={faArrowLeft} 
                                        onClick={() => {
                                            if (selectedStop) {
                                                setSelectedStop(undefined);
                                                if (selectedVehicle) {
                                                    map.current?.flyTo({ 
                                                        center: [selectedVehicle.longitude, selectedVehicle.latitude],
                                                        bearing: selectedVehicle.bearing ?? 0,
                                                        pitch: 75,
                                                        zoom: 17,
                                                        duration: 1000,
                                                    });
                                                } else if (selectedRoute && routes) {
                                                    map.current?.fitBounds(new LngLatBounds(bbox(routes[0]) as [number, number, number, number]), { pitch: 55, padding: 64, duration: 1000 });
                                                }
                                            } else if (selectedVehicle || selectedRoute) {
                                                if (selectedVehicle) {
                                                    setSelectedVehicle(undefined);
                                                    if (selectedRoute && routes)
                                                        return map.current?.fitBounds(new LngLatBounds(bbox(routes[0]) as [number, number, number, number]), { pitch: 55, padding: 64, duration: 1000 });
                                                } else setSelectedRoute(undefined);

                                                const box = agenciesData.data?.agencies[selectedAgency?.agency_id ?? '']?.box.bbox as [number, number, number, number];
                                                if (box)
                                                    map.current?.fitBounds(new LngLatBounds(box), { pitch: 45, padding: 64, duration: 1000 });
                                            }
                                        }} 
                                    />
                                }
                                <FontAwesomeIcon 
                                    icon={faShareFromSquare} 
                                    onClick={shareHandler} 
                                />
                            </nav>
                        }
                        <section className='agency-info'>
                            {
                                selectedAgency ?
                                <>
                                    <h1>{selectedAgency.agency_name}</h1>
                                    <a href={selectedAgency.agency_url} target='_blank' rel='noreferer'>{selectedAgency.agency_url}</a>
                                    <p>{ (vehicleData.data && vehicleData.isSuccess) ? `There are currently ${Object.keys(vehicleData.data).length} vehicles total.` : 'Vehicle data is currently not available for this agency.' }</p>
                                </>
                                :
                                <>
                                    <h1 style={{ textAlign: 'center' }}>Select an agency</h1>
                                    <ul onMouseLeave={() => setHoveredAgency(undefined)}>
                                        {
                                            agenciesData.data && 
                                            Object.values(agenciesData.data.agencies).map(agency => 
                                                <li 
                                                    key={agency.info.agency_id}
                                                    onMouseEnter={() => setHoveredAgency(agency.info)}
                                                    onClick={() => {
                                                        setSelectedAgency(agency.info);
                                                        setHoveredAgency(undefined);
                                                        map.current?.fitBounds(new LngLatBounds(agency.box.bbox as [number, number, number, number]), { pitch: 55, padding: 64, duration: 1000 });
                                                    }}
                                                    style={{
                                                        textDecoration: hoveredAgency?.agency_id === agency.info.agency_id ? 'underline' : 'none',
                                                        fontWeight: hoveredAgency?.agency_id === agency.info.agency_id ? 'bold' : 'normal',
                                                    }}
                                                >{agency.info.agency_name}</li>    
                                            )
                                        }
                                    </ul>
                                </>
                            }
                        </section>
                        {
                            agencyRoutes && !selectedRoute && !selectedVehicle && !selectedStop &&
                            <>
                                <nav
                                    style={{
                                        justifyContent: routePage === 0
                                            ? 'flex-end'
                                            : 'space-between'
                                    }} 
                                >
                                    {
                                        routePage > 0 &&
                                        <FontAwesomeIcon 
                                            icon={faArrowLeft} 
                                            onClick={() => 
                                                routePage > 0 &&
                                                setRoutePage(prev => prev - 1)
                                            }
                                        />
                                    }
                                    {
                                        (routePage + 1) * 15 < agencyRoutes.length &&
                                        <FontAwesomeIcon 
                                            icon={faArrowRight} 
                                            onClick={() => 
                                                (routePage + 1) * 15 < agencyRoutes.length &&
                                                setRoutePage(prev => prev + 1)
                                            }
                                        />
                                    }
                                </nav>
                                <section className='select-routes'>
                                    <ul onMouseLeave={() => setHoveredRoute(undefined)}>
                                        {
                                            agencyRoutes.slice(routePage * 15, (routePage + 1) * 15).map(routeFeature => 
                                                <li key={routeFeature.properties.route_id}>
                                                    <p
                                                        title={`There are currently ${vehicles?.length || 0} vehicle(s) on this route.`}
                                                        onMouseEnter={() => setHoveredRoute(routeFeature.properties)}
                                                        onClick={() => {
                                                            setHoveredRoute(undefined);
                                                            setSelectedRoute(routeFeature.properties);
                                                            map.current?.fitBounds(new LngLatBounds(bbox(routeFeature) as [number, number, number, number]), { pitch: 55, padding: 64, duration: 1000 });
                                                        }}
                                                        style={{ color: '#' + (routeFeature.properties.route_color ?? 'FE8714') }}
                                                    >{routeFeature.properties.route_long_name} - {routeFeature.properties.route_short_name}</p>
                                                </li>    
                                            )
                                        }
                                    </ul>
                                </section>
                            </>
                        }
                        {
                            selectedRoute && !selectedVehicle && !selectedStop &&
                            <section className='route-info'>
                                <div style={{
                                    color: '#' + (selectedRoute.route_color ?? 'FE8714')
                                }}>
                                    <h2>{selectedRoute.route_long_name}</h2>
                                    <h3>{selectedRoute.route_short_name}</h3>
                                </div>
                                <p>{selectedRoute.route_desc}</p>
                                {
                                    selectedRoute.route_url &&
                                    <a href={selectedRoute.route_url} target='_blank' rel='noreferer'>{selectedRoute.route_url}</a>
                                }
                                <p>{ vehicles ? `There are currently ${vehicles.length} vehicles on this route.` : null }</p>
                                <h4>Stops</h4>
                                <ul onMouseLeave={() => setHoveredStop(undefined)}>
                                    {
                                        selectedRouteStops?.map(stop => 
                                            <li>
                                                <p
                                                    onMouseEnter={() => setHoveredStop(stop)}
                                                    onClick={() => {
                                                        setHoveredStop(undefined);
                                                        setSelectedStop(stop);
                                                        map.current?.flyTo({ 
                                                            center: [stop.stop_lon, stop.stop_lat],
                                                            pitch: 75,
                                                            zoom: 17,
                                                            duration: 1000,
                                                        });
                                                    }}
                                                >{stop.stop_name}</p>
                                            </li>    
                                        )
                                    }
                                </ul>
                            </section>
                        }
                        {
                            selectedVehicle && !selectedStop && 
                            <section className='vehicle-info'>
                                <div>
                                    <h2>{selectedVehicle.trip_headsign} ({selectedVehicle.vehicle_id})</h2>
                                    <p>{selectedVehicle.latitude.toFixed(3)}, {selectedVehicle.longitude.toFixed(3)}</p>
                                </div>
                                <div>
                                    <h4>Speed / Bearing</h4>
                                    <p>{Math.round(selectedVehicle.speed ?? 0)} mph / {selectedVehicle.bearing ?? 0}°</p>
                                </div>
                                <div>
                                    <h4>Route</h4>
                                    <h3 style={{ color: `#${selectedVehicle.route_color}` }}>{selectedVehicle.route_long_name} ({selectedVehicle.route_short_name})</h3>
                                    <a href={selectedVehicle.route_url} target='_blank' rel='noreferer'>{selectedVehicle.route_url}</a>
                                </div>
                                {
                                    selectedVehicleStops &&
                                    <div>
                                        <h4>Next Stop</h4>
                                        <h3>{selectedVehicleStops[0]?.stop_name}</h3>
                                        <p>{selectedVehicleStops[0]?.stop_lat?.toFixed(3)}, {selectedVehicleStops[0]?.stop_lon?.toFixed(3)}</p>
                                        <h4>{(() => {
                                            const time = selectedVehicleStops[0]?.timestamp;
                                            return time ? `Estimated arrival time: ${new Date(time).toLocaleTimeString()}` : null;
                                        })()}</h4>
                                    </div>
                                }
                            </section>
                        }
                        {
                            selectedStop && 
                            <section className='vehicle-info'>
                                <div>
                                    <h2>{selectedStop.stop_name} ({selectedStop.stop_id})</h2>
                                    <p>{selectedStop.stop_lat?.toFixed(3)}, {selectedStop.stop_lon?.toFixed(3)}</p>
                                    <a href={selectedStop.stop_url} target='_blank' rel='noreferer'>{selectedStop.stop_url}</a>
                                    <h4>{(() => {
                                        const time = selectedVehicle?.stops.find(stop => stop.id === selectedStop.stop_id)?.timestamp;
                                        return time ? `Estimated arrival time: ${new Date(time).toLocaleTimeString()}` : null;
                                    })()}</h4>
                                </div>
                            </section>
                        }
                    </div>
                </CustomOverlay>
            }
            {
                !startSelection &&
                <CustomOverlay>
                    <button type='button' aria-label='Show experimental controls' onClick={() => {
                        if (showExperimental) {
                            setShowTerrain(false);
                            setShow3D(false);
                        }
                        setShowExperimental(prev => !prev);
                    }}>
                        <span 
                            className='mapboxgl-ctrl-icon' 
                            aria-hidden='true' 
                            title='Show experimental controls'
                            style={{
                                backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                    <FontAwesomeIcon icon={faFlask} color='#333' fixedWidth transform='shrink-3' />
                                ))}')`
                            }}
                        />
                    </button>
                </CustomOverlay>
            }
            {
                showExperimental &&
                <>
                    <CustomOverlay>
                        <button type='button' aria-label='Toggle terrain view' onClick={() => setShowTerrain(prev => !prev)}>
                            <span 
                                className='mapboxgl-ctrl-icon' 
                                aria-hidden='true' 
                                title='Toggle terrain view'
                                style={{
                                    backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                        <FontAwesomeIcon icon={faMountain} color='#333' fixedWidth transform='shrink-3' />
                                    ))}')`
                                }}
                            />
                        </button>
                    </CustomOverlay>
                    <CustomOverlay>
                        <button type='button' aria-label='Toggle 3D buildings' onClick={() => setShow3D(prev => !prev)}>
                            <span 
                                className='mapboxgl-ctrl-icon' 
                                aria-hidden='true' 
                                title='Toggle 3D buildings'
                                style={{
                                    backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                        <FontAwesomeIcon icon={faBuilding} color='#333' fixedWidth transform='shrink-3' />
                                    ))}')`
                                }}
                            />
                        </button>
                    </CustomOverlay>
                </>
            }
            <AttributionControl customAttribution='Transit data from 511 SF Bay' />
            <DeckGLOverlay
                getTooltip={({object}) => {
                    if (!object || object.type === 'Feature') return null;
                    if (object.vehicle_id && !selectedVehicle) return (
`${object.trip_headsign} (${object.vehicle_id})
${object.route_short_name} - ${object.route_long_name}

${object.latitude.toFixed(3)}, ${object.longitude.toFixed(3)}`
                    );
                    if (object.stop_id) return (
`${object.stop_name}

${object.stop_lat.toFixed(3)}, ${object.stop_lon.toFixed(3)}`
                    )
                    return null;
                }}
                layers={[
                    // terrainLayer,
                    layer3d,
                    routesLayer,
                    agenciesLayer,
                    vehiclesLayer,
                    stopsLayer,
                ]}
            />
        </Map>
    );
}

export default HomeMap;