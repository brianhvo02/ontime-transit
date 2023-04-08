'use client'

import './style.css';
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import { useEffect, useRef } from 'react';
import { useGeographic } from 'ol/proj.js';
import GeoJSON from 'ol/format/GeoJSON.js'
import { createEmpty, extend } from 'ol/extent.js';
import { createXYZ } from 'ol/tilegrid.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import Stroke from 'ol/style/Stroke.js';
import Fill from 'ol/style/Fill.js';
import Circle from 'ol/style/Circle.js';

export default function MapComponent() {
    const mapRef = useRef(null);
    useGeographic();

    useEffect(() => {
        (async () => {
            const source = new OSM();

            const osm = new TileLayer({ source });
    
            osm.on('postrender', (evt) => {
                if (evt.context) {
                    const ctx = evt.context as CanvasRenderingContext2D;
                    ctx.globalCompositeOperation = 'color';
                    ctx.fillStyle = 'rgba(0, 0, 0,' + 1.0 + ')';
                    ctx.fillRect(0, 0, evt.context.canvas.width, evt.context.canvas.height);
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.fillStyle = 'rgb(' + [200, 200, 200].toString() + ')';
                    ctx.fillRect(0, 0, evt.context.canvas.width, evt.context.canvas.height);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.canvas.style.filter = "invert(99%)";
                }
            });

            const routes = await fetch('/api/routes/SF').then(res => res.json());
            const geojson = await fetch('/api/feeds/SF').then(res => res.json());
            const features = new GeoJSON().readFeatures(geojson);

            const layer = new VectorLayer({
                className: 'BA',
                source: new VectorSource({
                    features: features
                }),
                style: feature => {
                    if (feature.getGeometry()!.getType() === 'LineString') {
                        return new Style({
                            stroke: new Stroke({
                                color: feature.get('route_color'),
                                width: 2
                            }),
                            fill: new Fill({
                                color: feature.get('route_color')
                            })
                        })
                    }
                    return new Style({
                        stroke: new Stroke({
                            color: 'rgba(255, 255, 255, 0.8)',
                            width: 2
                        }),
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 0.8)'
                        }),
                        image: new Circle({
                            stroke: new Stroke({
                                color: 'rgba(255, 255, 255, 0.8)',
                                width: 2
                            }),
                            fill: new Fill({
                                color: 'rgba(255, 255, 255, 0.8)'
                            }),
                            radius: 2
                        })
                    });
                }
            });

            features.forEach(f => f.getGeometry()!.getType() === 'LineString' || f.setStyle(new Style({})));
    
            const map = new Map({
                target: mapRef.current || undefined,
                layers: [
                    osm,
                    layer
                ],
                view: new View({
                    center: [-122.2711639, 37.9743514],
                    zoom: 9.5,
                }),
            });

            map.on('click', e => {
                const mapFeatures = map.getFeaturesAtPixel(e.pixel);
                if (mapFeatures.length === 0) {
                    features.forEach(f => mapFeatures.includes(f) || f.setStyle());
                    return;
                }
                const extent = createEmpty();
                features.forEach(f => {
                    mapFeatures.find(mf => 
                        mf.get('route_id') === f.get('route_id') 
                            && mf.get('stop_id') === f.get('stop_id')
                    ) || f.setStyle(new Style({}));
                    extend(extent, f.getGeometry()!.getExtent());
                });
            });
        })();
      }, []);
    
    return (
        <div id='map' ref={mapRef}></div>
    )
}