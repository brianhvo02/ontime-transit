// import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import { TileLayer } from '@deck.gl/geo-layers/typed';
import Map, { NavigationControl, useControl, GeolocateControl, FullscreenControl, AttributionControl, SkyLayer, Source, Layer, useMap } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { LngLatBounds } from 'mapbox-gl';
import { BitmapLayer } from '@deck.gl/layers/typed';
import {load} from '@loaders.gl/core';
import { useEffect, useMemo, useState } from 'react';
import { hexToRGB, tileXYToQuadKey } from '../../store/utils';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { Agencies, Agency } from '../../store/payloads/Agency';
import { Feature, Polygon } from 'geojson';
import SatelliteControl from '../SatelliteControl';
import CustomOverlay from '../SatelliteControl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap, faSatellite } from '@fortawesome/free-solid-svg-icons';
import { renderToStaticMarkup } from 'react-dom/server';

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
    const [hovered, setHovered] = useState<string[]>([]);
    const [showSatellite, setShowSatellite] = useState(true);
    //[-123.0543893911,36.97474289,-120.94846,39.09982]

    const convexes = useMemo(() => agenciesData?.agencies.map(agency => agency.area).filter(area => area), [agenciesData]);

    const agenciesLayer = new GeoJsonLayer({
        id: 'agencies',
        data: convexes,
        pickable: true,
        stroked: false,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        getFillColor: [0, 0, 0, 0],
        getText: ({ properties }: Feature<Polygon, Agency>) => properties.agency_name,
        getTextColor: [0, 0, 0],
        getTextSize: 16,
        onHover: pickingInfo => {
            const { properties }: Feature<Polygon, Agency> = pickingInfo.object ? pickingInfo.object : {};
        },
        // autoHighlight: true,
    });

    const routesLayer = new GeoJsonLayer({
        id: 'routes',
        data: agenciesData?.routes,
        pickable: true,
        lineWidthUnits: 'pixels',
        getLineColor: ({ properties }) => [...(hexToRGB(properties?.route_color ?? '') ?? [245, 245, 245]), hovered.length ? (hovered.includes(properties?.agency_id ?? '') ? 255 : 0) : 255],
        getLineWidth: 2
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
            terrain={{source: 'mapbox-dem', exaggeration: 1.5}}
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
                <button type='button' aria-label='Enter fullscreen' onClick={() => setShowSatellite(prev => !prev)}>
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