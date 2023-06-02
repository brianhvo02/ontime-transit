import './Map.scss';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import Map, { NavigationControl, useControl, GeolocateControl, FullscreenControl, AttributionControl, SkyLayer, Source, Layer, useMap, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { LngLatBounds } from 'mapbox-gl';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { useEffect, useMemo, useRef, useState } from 'react';
import { hexToRGB, tileXYToQuadKey } from '../../store/utils';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { Agencies, Agency, Vehicle, VehiclePayload } from '../../store/payloads/Agency';
import { Feature, Polygon } from 'geojson';
import CustomOverlay from '../SatelliteControl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowPointer, faBuilding, faHandPointer, faMap, faMountain, faSatellite, faX } from '@fortawesome/free-solid-svg-icons';
import { renderToStaticMarkup } from 'react-dom/server';
import { area, bbox } from '@turf/turf';
import { Agency as GTFSAgency } from 'gtfs-types';
import { useGetVehiclesQuery } from '../../store/api/agency';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { Tile3DLayer } from '@deck.gl/geo-layers/typed';

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
    const { data: vehicles } = useGetVehiclesQuery(selectedAgency?.agency_id ?? skipToken, { pollingInterval: 60000 });
    const [hovered, setHovered] = useState<GTFSAgency | undefined>();
    const [showSatellite, setShowSatellite] = useState(false);
    const [showTerrain, setShowTerrain] = useState(false);
    const [show3D, setShow3D] = useState(false);
    //[-123.0543893911,36.97474289,-120.94846,39.09982]

    const convexes = useMemo(() => agenciesData?.agencies.map(agency => agency.area).filter(area => area).sort((a, b) => area(b) - area(a)), [agenciesData]);

    const [tilesetUrl, setTilesetUrl] = useState<string | undefined>();

    useEffect(() => {
        fetch('https://api.cesium.com/v1/assets/96188/endpoint', {
            headers: {
                'Authorization': `Bearer ${process.env.REACT_APP_CESIUM_ACCESS_TOKEN}`
            }
        }).then(res => res.json()).then(data => setTilesetUrl(data.url)); 
    }, []);

    const layer3d = new Tile3DLayer({
        id: 'tile-3d-layer',
        // data: 'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_Bldgs/SceneServer/layers/0',
        // loader: I3SLoader,
        data: tilesetUrl,
        loader: CesiumIonLoader,
        loadOptions: {
            'cesium-ion': { accessToken: process.env.REACT_APP_CESIUM_ACCESS_TOKEN }
        },
        // _subLayerProps: {
        //     scenegraph: {_lighting: 'flat'}
        // }
        visible: show3D
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
        visible: !selectedAgency
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
        }
    });

    const vehiclesLayer = new ScenegraphLayer({
        id: 'vehicles',
        data: vehicles ? Object.values(vehicles): undefined,
        pickable: true,
        sizeScale: 0.4,
        scenegraph: '/bus.glb',
        sizeMaxPixels: 3,
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
            terrain={showTerrain ? {source: 'mapbox-dem', exaggeration: 1.5} : undefined}
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
            <NavigationControl style={{ marginTop: 'calc(8vh + 10px)' }} />
            <GeolocateControl />
            <FullscreenControl />
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
                        <h2>{(hovered || selectedAgency)?.agency_name ?? 'Select an agency.'}</h2>
                        <a href={(hovered || selectedAgency)?.agency_url} target='_blank' rel='noreferer'>{(hovered || selectedAgency)?.agency_url}</a>
                    </div>
                </CustomOverlay>
            }
            <AttributionControl customAttribution='Transit data from 511 SF Bay' />
            <DeckGLOverlay
                layers={[
                    routesLayer,
                    agenciesLayer,
                    vehiclesLayer,
                    layer3d,
                ]}
            />
        </Map>
    );
}

export default HomeMap;