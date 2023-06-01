import DeckGL from '@deck.gl/react/typed';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import {Tile3DLayer, TileLayer} from '@deck.gl/geo-layers/typed';
import Map, { useControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { LayersList } from '@deck.gl/core/typed';
import { LngLatBounds } from 'mapbox-gl';
import { BitmapLayer } from '@deck.gl/layers/typed';
import {load} from '@loaders.gl/core';
import { useEffect, useMemo, useState } from 'react';
import { layer } from '@fortawesome/fontawesome-svg-core';
import { tileXYToQuadKey } from '../../store/utils';

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

const HomeMap = ({ initialBounds, layers }: { initialBounds: LngLatBounds, layers: LayersList }) => {
    const [satelliteData, setSatelliteData] = useState<{
        minZoom: number,
        maxZoom: number,
        tileSize: number,
        data: string[]
    }>();
    
    useEffect(() => {
        fetch('https://dev.virtualearth.net/REST/v1/Imagery/Metadata/Aerial?key=AuAOUjlm2IJ09Ytc-cfQqjAXya4as2lPScgwaexKFv9ZDTorjj0Bvio6YlsZ-qLu')
            .then(res => res.json())
            .then(data => {
                const resource = data.resourceSets[0].resources[0];
                setSatelliteData({
                    minZoom: resource.zoomMin,
                    maxZoom: resource.zoomMax - 1,
                    tileSize: resource.imageWidth,
                    data: resource.imageUrlSubdomains.map((subdomain: string) => resource.imageUrl.replace('{subdomain}', subdomain))
                });
            });
    }, []);

    const satelliteLayer = useMemo(() => satelliteData ? new TileLayer({
        ...satelliteData,
        maxRequests: 0,
        getTileData: tile => {
            const { x, y, z } = tile.index;
            return load(tile.url?.replace('{quadkey}', tileXYToQuadKey(x, y, z)) ?? 'https://ecn.t4.tiles.virtualearth.net/tiles/a0.jpeg');
        },
        renderSubLayers: props => {
            const {
                boundingBox: [[west, south], [east, north]]
            } = props.tile;
      
            return new BitmapLayer(props, {
                data: undefined,
                image: props.data,
                bounds: [west, south, east, north]
            });
        }
    }) : undefined, [satelliteData]);

    return (
        <Map
            initialViewState={{ bounds: initialBounds }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{
                position: 'absolute',
                zIndex: 0,
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh'
            }}
        >
            <DeckGLOverlay
                layers={[satelliteLayer, ...layers]} 
                // getTooltip={
                //     ({ object }) => {
                //         if (!object) return null;
                //         if (object.cid) return getFlightInfo(object);

                //         switch (object.properties.type) {
                //             case 'vatsim':
                //                 return getFlightInfo(object.properties);
                //             case 'waypoint':
                //                 return iapSelected(object.properties)
                //                     ? getWaypointInfo(object.properties, object.geometry)
                //                     : null
                //             default:
                //                 return null;
                //         }
                //     }
                // } 
            />
        </Map>
        // <DeckGL 
        // controller={true}
        // initialViewState={{
        //     longitude: -122.4,
        //     latitude: 37.8,
        //     zoom: 10,
        //     pitch: 0,
        //     bearing: 0
        // }}
        // layers={[layer]} />
    );
}

export default HomeMap;