// import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import Map, { NavigationControl, useControl, GeolocateControl, FullscreenControl, AttributionControl, SkyLayer, Source, Layer, useMap } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { LngLatBounds } from 'mapbox-gl';
import { BitmapLayer } from '@deck.gl/layers/typed';
import {load} from '@loaders.gl/core';
import { useMemo, useState } from 'react';
import { hexToRGB, tileXYToQuadKey } from '../../store/utils';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { Agencies, Agency } from '../../store/payloads/Agency';
import { Feature, Polygon } from 'geojson';
import CustomOverlay from '../SatelliteControl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowPointer, faHandPointer, faMap, faMountain, faSatellite } from '@fortawesome/free-solid-svg-icons';
import { renderToStaticMarkup } from 'react-dom/server';
import { area } from '@turf/turf';

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
    const [startSelection, setStartSelection] = useState(false);
    const [hovered, setHovered] = useState<Agency | undefined>();
    const [showSatellite, setShowSatellite] = useState(false);
    const [showTerrain, setShowTerrain] = useState(false);
    //[-123.0543893911,36.97474289,-120.94846,39.09982]

    const convexes = useMemo(() => agenciesData?.agencies.map(agency => agency.area).filter(area => area).sort((a, b) => area(b) - area(a)), [agenciesData]);

    const agenciesLayer = new GeoJsonLayer({
        id: 'agencies',
        data: convexes,
        pickable: startSelection,
        stroked: false,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        getFillColor: [245, 245, 245, 0],
        getText: ({ properties }: Feature<Polygon, Agency>) => properties.agency_name,
        getTextColor: [0, 0, 0],
        getTextSize: 16,
        onHover: pickingInfo => {
            const { properties }: Feature<Polygon, Agency> = pickingInfo.object ? pickingInfo.object : {};
            setHovered(properties)
        }
    });

    const routesLayer = new GeoJsonLayer({
        id: 'routes',
        data: agenciesData?.routes,
        pickable: true,
        lineWidthUnits: 'pixels',
        getLineColor: ({ properties }) => [...(hexToRGB(properties?.route_color ?? '') ?? [245, 245, 245]), hovered ? hovered.agency_id === properties?.agency_id ? 255 : 0 : 255],
        getLineWidth: 2,
        updateTriggers: {
            getLineColor: hovered
        }
    });

    return (
        <Map
            initialViewState={{ bounds: new LngLatBounds(agenciesData?.bounds) }}
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
            cursor='pointer'
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
                <button type='button' aria-label={'Toggle terrain view'} onClick={() => setShowTerrain(prev => !prev)}>
                    <span 
                        className='mapboxgl-ctrl-icon' 
                        aria-hidden='true' 
                        title={'Toggle terrain view'}
                        style={{
                            backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                <FontAwesomeIcon icon={faMountain} color='#333' fixedWidth transform='shrink-3' />
                            ))}')`
                        }}
                    />
                </button>
            </CustomOverlay>
            <CustomOverlay>
                <button type='button' aria-label={startSelection ? 'Move the map' : 'Select an agency'} onClick={() => setStartSelection(prev => !prev)}>
                    <span 
                        className='mapboxgl-ctrl-icon' 
                        aria-hidden='true' 
                        title={startSelection ? 'Move the map' : 'Select an agency'}
                        style={{
                            backgroundImage: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToStaticMarkup(
                                <FontAwesomeIcon icon={startSelection ? faHandPointer : faArrowPointer} color='#333' fixedWidth transform='shrink-3' />
                            ))}')`
                        }}
                    />
                </button>
            </CustomOverlay>
            {
                startSelection &&
                <CustomOverlay>
                    <div className='display'>
                        <h2>{hovered?.agency_name}</h2>
                        <a href={hovered?.agency_url} target='_blank' rel='noreferer'>{hovered?.agency_url}</a>
                        <p>{hovered?.agency_fare_url}</p>
                    </div>
                </CustomOverlay>
            }
            
            <AttributionControl customAttribution='Transit data from 511 SF Bay' />
            <DeckGLOverlay
                layers={[
                    // satelliteLayer,
                    routesLayer,
                    agenciesLayer,
                ]}
            />
        </Map>
    );
}

export default HomeMap;