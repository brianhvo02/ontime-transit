import { Tile3DLayer } from '@deck.gl/geo-layers/typed';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { faArrowLeft, faArrowPointer, faBuilding, faHandPointer, faMap, faMountain, faSatellite, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CesiumIonLoader } from '@loaders.gl/3d-tiles';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { area, bbox } from '@turf/turf';
import { Feature, Polygon } from 'geojson';
import { Agency as GTFSAgency } from 'gtfs-types';
import { LngLatBounds } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Map, { AttributionControl, FullscreenControl, GeolocateControl, Layer, MapRef, NavigationControl, SkyLayer, Source, useControl } from 'react-map-gl';
import { useGetVehiclesQuery } from '../../store/api/agency';
import { Agencies, Vehicle } from '../../store/payloads/Agency';
import { hexToRGB } from '../../store/utils';
import CustomOverlay from '../SatelliteControl';
import './Map.scss';

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

const HomeMap = ({ agenciesData }: { agenciesData: Agencies | undefined }) => {
    const map = useRef<MapRef>(null);
    const [cursor, setCursor] = useState(false);
    const [startSelection, setStartSelection] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<GTFSAgency | undefined>();
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
    const { data: vehicles } = useGetVehiclesQuery(selectedAgency?.agency_id ?? skipToken
        , { pollingInterval: 60000 }
    );
    const [hovered, setHovered] = useState<GTFSAgency | undefined>();
    const [showSatellite, setShowSatellite] = useState(false);
    const [showTerrain, setShowTerrain] = useState(false);
    const [show3D, setShow3D] = useState(false);
    //[-123.0543893911,36.97474289,-120.94846,39.09982]

    const convexes = useMemo(() => agenciesData?.agencies.map(agency => agency.area).filter(area => area).sort((a, b) => area(b) - area(a)), [agenciesData]);

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
            setHovered(properties);
            setCursor(!!pickingInfo.object);
        },
        onClick: (pickingInfo, event) => {
            const { properties }: Feature<Polygon, GTFSAgency> = pickingInfo.object ? pickingInfo.object : {};
            setSelectedAgency(properties);
            setHovered(undefined);
            map.current?.fitBounds(new LngLatBounds(bbox(pickingInfo.object) as [number, number, number, number]), { padding: 64, duration: 1000 });
        },
        visible: !selectedAgency,
        // extensions
    });

    const routesLayer = new GeoJsonLayer({
        id: 'routes',
        data: agenciesData?.routes,
        pickable: true,
        lineWidthUnits: 'pixels',
        getLineColor: ({ properties }) => [...(hexToRGB(properties?.route_color ?? '') ?? [245, 245, 245]), selectedAgency ? selectedAgency.agency_id === properties?.agency_id ? 255 : 0 : hovered ? hovered.agency_id === properties?.agency_id ? 255 : 0 : 255],
        getLineWidth: 2,
        updateTriggers: {
            getLineColor: [hovered, selectedAgency]
        },
        // extensions
    });

    const vehiclesLayer = new ScenegraphLayer({
        id: 'vehicles',
        data: vehicles ? Object.values(vehicles): undefined,
        pickable: true,
        // sizeScale: 0.1,
        scenegraph: '/bus.glb',
        sizeMaxPixels: 1,
        sizeMinPixels: 0.1,
        // _animations: {
        //     '*': { speed: 1 }
        // },
        // dataTransform: (data, prev) => {
        //     console.log(data, prev)
        //     return prev;
        // },
        getPosition: (vehicle: Vehicle) => [
            vehicle.longitude || 0,
            vehicle.latitude || 0,
        ],
        getOrientation: (vehicle: Vehicle)  => [0, 90 - (vehicle.bearing ?? 0), 90],
        _lighting: 'pbr',
        // transitions: {
        //     getPosition: 60000
        // },
        updateTriggers: {
            getPosition: vehicles,
            getOrientation: vehicles
        },
        onClick: pickingInfo => {
            const vehicle: Vehicle = pickingInfo.object;
            setSelectedVehicle(vehicle);
            if (vehicle) 
                map.current?.flyTo({ 
                    center: [vehicle.longitude, vehicle.latitude],
                    bearing: (vehicle.bearing ?? 0) - 90,
                    pitch: 65,
                    zoom: 17,
                    duration: 1000,
                });
        },
        // extensions
    });

    return (
        <Map
            ref={map}
            initialViewState={{ bounds: new LngLatBounds(agenciesData?.bounds), fitBoundsOptions: { padding: 64 } }}
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
            <Source
                id='mapbox-dem'
                type='raster-dem'
                url='mapbox://mapbox.mapbox-terrain-dem-v1'
                tileSize={512}
                maxzoom={14}
            />
            <Layer {...skyLayer} />
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
            {
                <CustomOverlay>
                    <button type='button' aria-label={selectedAgency ? 'Start over' : startSelection ? 'Move the map' : 'Select an agency'} onClick={() => {
                        if (selectedAgency) {
                            setSelectedAgency(undefined);
                            setStartSelection(false);
                            setHovered(undefined);
                            setSelectedVehicle(undefined);
                            map.current?.fitBounds(new LngLatBounds(agenciesData?.bounds), { padding: 64, duration: 1000 })
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
                            selectedVehicle &&
                            <FontAwesomeIcon icon={faArrowLeft} onClick={() => {
                                setSelectedVehicle(undefined);
                                const box = agenciesData?.agencies.find(agency => agency.info.agency_id === selectedAgency?.agency_id)?.box.bbox as [number, number, number, number];
                                if (box)
                                    map.current?.fitBounds(new LngLatBounds(box), { padding: 64, duration: 1000 });
                            }} />
                        }
                        <section className='agency-info'>
                            
                            {
                                selectedAgency ?
                                <>
                                    <h1>{selectedAgency.agency_name ?? 'Select an agency'}</h1>
                                    <a href={selectedAgency.agency_url} target='_blank' rel='noreferer'>{selectedAgency.agency_url}</a>
                                </>
                                :
                                <>
                                    <h1 style={{ textAlign: 'center' }}>Select an agency</h1>
                                    <ul>
                                        {
                                            agenciesData?.agencies.map(agency => 
                                                <li 
                                                    key={agency.info.agency_id}
                                                    onMouseEnter={() => setHovered(agency.info)}
                                                    onMouseLeave={() => setHovered(undefined)}
                                                    onClick={() => {
                                                        setSelectedAgency(agency.info);
                                                        setHovered(undefined);
                                                        map.current?.fitBounds(new LngLatBounds(agency.box.bbox as [number, number, number, number]), { padding: 64, duration: 1000 });
                                                    }}
                                                    style={{
                                                        textDecoration: hovered?.agency_id === agency.info.agency_id ? 'underline' : 'none',
                                                        fontWeight: hovered?.agency_id === agency.info.agency_id ? 'bold' : 'normal',
                                                    }}
                                                >{agency.info.agency_name}</li>    
                                            )
                                        }
                                    </ul>
                                </>
                            }
                        </section>
                        {
                            selectedVehicle && 
                            <section className='vehicle-info'>
                                <div>
                                    <h2>{selectedVehicle.trip_headsign}</h2>
                                    <p>{selectedVehicle.latitude.toFixed(3)}, {selectedVehicle.longitude.toFixed(3)}</p>
                                </div>
                                <div>
                                    <h4>Speed / Bearing</h4>
                                    <p>{Math.round(selectedVehicle.speed ?? 0)} mph / {selectedVehicle.bearing ?? 0}°</p>
                                </div>
                                <div>
                                    <h4>Route</h4>
                                    <h3 style={{ color: `#${selectedVehicle.route_color}` }}>{selectedVehicle.route_long_name} ({selectedVehicle.route_short_name})</h3>
                                </div>
                                <div>
                                    <h4>Next Stop</h4>
                                    <h3>{selectedVehicle.stop_name}</h3>
                                    <p>{selectedVehicle.latitude.toFixed(3)}, {selectedVehicle.longitude.toFixed(3)}</p>
                                    <h4>{(() => {
                                        const time = selectedVehicle.departure_timestamp || selectedVehicle.arrival_timestamp;
                                        return time ? `Estimated arrival time: ${new Date(time).toLocaleTimeString()}` : null;
                                    })()}</h4>
                                </div>
                            </section>
                        }
                    </div>
                </CustomOverlay>
            }
            <AttributionControl customAttribution='Transit data from 511 SF Bay' />
            <DeckGLOverlay
                layers={[
                    // terrainLayer,
                    layer3d,
                    routesLayer,
                    agenciesLayer,
                    vehiclesLayer,
                ]}
            />
        </Map>
    );
}

export default HomeMap;