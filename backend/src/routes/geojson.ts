import express from 'express';
import { readFile } from 'fs/promises';
import { Feature, FeatureCollection, MultiLineString, multiLineString, Position } from '@turf/turf';
import { join } from 'path';
const router = express.Router();

router.get('/geojson', async (req, res) => {
    const geojsonRaw = await readFile(join(process.env.NODE_PATH!, 'feeds', 'SF.geojson'), 'utf-8');
    const geojson = JSON.parse(geojsonRaw) as FeatureCollection;
    const newFeatures: Feature[] = [];

    geojson.features.forEach(f => {
        if (f.geometry.type !== 'LineString') return newFeatures.push(f);

        const existingFeature = newFeatures.find(newFeature => newFeature.properties!['route_id'] === f.properties!['route_id']) as Feature<MultiLineString> | undefined;
        if (!existingFeature) return newFeatures.push({
            type: 'Feature',
            properties: f.properties,
            geometry: {
                type: 'MultiLineString',
                coordinates: [ f.geometry.coordinates ]
            } as MultiLineString
        });

        existingFeature.geometry.coordinates.push(f.geometry.coordinates as Position[]);
    });

    geojson.features = newFeatures;

    res.json(geojson);
});

export default router;
