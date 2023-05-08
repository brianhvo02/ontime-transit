import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON'
import { RLayerBaseVector, RLayerVector, RMap, VectorSourceEvent } from 'rlayers';
import './index.scss';
import 'ol/ol.css';
import MyOSM from './MyOSM';
import Geometry from 'ol/geom/Geometry';
import { Style } from 'ol/style';
import { RStyle, RCircle, RFill, RStroke } from 'rlayers/style';
import { MouseEvent, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feature, Map as OlMap, MapBrowserEvent } from 'ol';
import _ from 'lodash';
import { useAppDispatch } from '../../store/hooks';
import { Extent, createEmpty, extend, getTopRight } from 'ol/extent';
import { RLayerBaseVectorProps } from 'rlayers/layer/RLayerBaseVector';
import { createPortal } from 'react-dom';
import RouteInfo from './RouteInfo.modal';
// import { addFeatures } from '../../store/Features';

export interface RouteProperties {
    agency_name: string;
    agency_id: string;
    route_id: string;
    route_short_name: string;
    route_long_name: string;
    route_desc: string;
    route_type: string;
    route_url: string;
    route_color: string;
    route_text_color: string;
    geometry?: Geometry;
}

export const emptyStyle = new Style({});

const Map = () => {
    const organizedFeatures: MutableRefObject<{
        [key: string]: Feature<Geometry>;
    }> = useRef({});
    const features: MutableRefObject<Feature[]> = useRef([]);
    const [selectedFeatures, setSelectedFeatures] = useState<{ [key: string]: RouteProperties }>({});
    const [showRouteInfo, setShowRouteInfo] = useState<RouteProperties | null>(null);
    
    const generateExtent = (features: Feature[]) => features.reduce((extent: Extent, feature) => extend(extent, feature.getGeometry()?.getExtent()!), createEmpty());
    const zoomToFeatures = (map: OlMap, features: Feature[], modal = false) => map.getView().fit(generateExtent(features), {
        padding: [20, 20, 20, modal ? window.innerWidth * 0.35 : 20],
        duration: 1000,
        size: map.getSize()
    });

    const showFeatures = (conditional: (feature: Feature) => boolean) => features.current.forEach(feature =>
        conditional(feature) ? feature.setStyle() : feature.setStyle(emptyStyle));

    const handleFeaturesLoad = function(this: RLayerBaseVector<RLayerBaseVectorProps>, e: VectorSourceEvent<Geometry>) {
        const loadedFeatures = e.features;
        if (loadedFeatures) {
            loadedFeatures.forEach(f => f.getGeometry()?.getType() === 'Point' && f.setStyle(emptyStyle));
            features.current = loadedFeatures;
            organizedFeatures.current = Object.fromEntries(
                loadedFeatures.map(
                    feature => [
                        (
                            feature.get('route_id') && `route_${feature.get('route_id')}`
                        ) || (
                            feature.get('stop_id') && `route_${feature.get('stop_id')}`
                        ),
                        feature
                    ]
                )
            );

            const map = this.context.map;
            if (map) zoomToFeatures(map, loadedFeatures);
        }
    }

    const handlePointerMove = (e: MapBrowserEvent<UIEvent>) => {
        if (showRouteInfo) return;
        const map = e.target as OlMap;
        const pointedFeatures = map.getFeaturesAtPixel(e.pixel) as Feature[];
        if (pointedFeatures.length > 0) {
            showFeatures(
                feature => (
                    pointedFeatures.includes(feature)
                        &&
                    (
                        _.isEmpty(selectedFeatures) 
                            ? true 
                            : !!selectedFeatures[feature.get('route_id')]
                    )
                )
            )
        } else {
            showFeatures(
                feature => (
                    feature.getGeometry()?.getType() === 'MultiLineString' 
                        &&
                    (_.isEmpty(selectedFeatures) ? true : !!selectedFeatures[feature.get('route_id')])
                )
            )
        }
    }

    const handleClick = (e: MapBrowserEvent<UIEvent>) => {
        const map = e.target as OlMap;
        const clickedFeatures = map.getFeaturesAtPixel(e.pixel) as Feature[];
        if (clickedFeatures.length === 1 && !showRouteInfo) {
            setSelectedFeatures({});
            showFeatures(feature => clickedFeatures.includes(feature));
            if (map) zoomToFeatures(map, clickedFeatures, true);
            setShowRouteInfo(clickedFeatures[0].getProperties() as RouteProperties);
        } else if (clickedFeatures.length > 0 && !showRouteInfo) {
            setShowRouteInfo(null);
            showFeatures(feature => clickedFeatures.includes(feature));
            const info = clickedFeatures.map(feature => [`route_${feature.get('route_id')}`, feature.getProperties()]);
            if (map) zoomToFeatures(map, clickedFeatures);
            
            const [right, top] = e.pixel;
            resultsRef.current!.style.top = `${top}px`;
            resultsRef.current!.style.left = `${right}px`;

            setSelectedFeatures(Object.fromEntries(info));
        } else {
            setShowRouteInfo(null);
            showFeatures(feature => feature.getGeometry()?.getType() === 'MultiLineString')
            setSelectedFeatures({});
            if (map) zoomToFeatures(map, features.current);
        }
    }

    const handleResultEnter = (e: MouseEvent<HTMLParagraphElement>) => {
        const routeId = e.currentTarget.dataset.id;
        const routeColor = e.currentTarget.dataset.color;
        
        e.currentTarget.style.color = routeColor || '#48a137';
        showFeatures(feature => feature.get('route_id') === routeId);
    }

    const handleResultExit = (e: MouseEvent<HTMLParagraphElement>) => {
        showFeatures(feature => !!selectedFeatures[feature.get('route_id')]);
        e.currentTarget.style.color = '';
    }

    const handleResultClick = (e: MouseEvent<HTMLParagraphElement>) => {
        setSelectedFeatures({});
        showFeatures(feature => feature.get('route_id') === e.currentTarget.dataset.id);
        zoomToFeatures(mapRef.current!.ol, [organizedFeatures.current[`route_${e.currentTarget.dataset.id}`]], true);
        setShowRouteInfo(selectedFeatures[`route_${e.currentTarget.dataset.id}`]);
    }

    const resultsRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<RMap>(null);

    return (
            <main className='map-container'>
                {
                    showRouteInfo && createPortal(
                        <RouteInfo features={features} feature={showRouteInfo} />,
                        document.body
                    )
                }
                <div className='results' ref={resultsRef}>
                    {
                        Object.values(selectedFeatures)
                            .sort((a, b) => a['route_short_name'].localeCompare(b['route_short_name']))
                            .map(feature => 
                                <p 
                                    key={feature['route_id']}
                                    data-id={feature['route_id']}
                                    data-color={feature['route_color']}
                                    onMouseEnter={handleResultEnter}
                                    onMouseLeave={handleResultExit}
                                    onClick={handleResultClick}
                                >
                                    {feature['route_short_name']} ({feature['route_long_name']})
                                </p>
                            )
                    }
                </div>
                <RMap 
                    className='map' 
                    initial={useMemo(() => ({
                        center: fromLonLat([-122.416389, 37.7775]), 
                        zoom: 13
                    }), [])}
                    noDefaultControls={true}
                    onPointerMove={handlePointerMove}
                    onClick={handleClick}
                    ref={mapRef}
                >
                    <MyOSM />
                    <RLayerVector
                        // @ts-expect-error
                        className='features'
                        format={new GeoJSON({ featureProjection: "EPSG:3857" })}
                        url='/api/geojson'
                        onFeaturesLoadEnd={handleFeaturesLoad}
                    >
                        <RStyle
                            cacheSize={1024}
                            cacheId={useCallback((feature: Feature<Geometry>) => feature.get('route_id') || feature.get('stop_id'), [])}
                            render={useCallback((feature: Feature<Geometry>) => (
                                <>
                                    <RCircle radius={5}>
                                        <RFill color='blue' />
                                    </RCircle>
                                    <RStroke
                                        color={
                                            feature.get('route_color')
                                                ? feature.get('route_color')
                                                : 'blue'
                                        }
                                        width={2}
                                    />
                                </>
                            ), [])}
                        />
                    </RLayerVector>
                </RMap>
            </main>
    )
}

export default Map;