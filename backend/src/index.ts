import { PORT, BING_MAPS_KEY, gtfsConfig } from './config.js';
import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { join } from 'path';
import { ServerError } from './errors.js';
import { gtfsLoader } from './middleware/gtfs.js';
import { __dirname } from './utils.js';
import AgencyRouter from './routes/agencies.js';
import RouteRouter from './routes/routes/index.js';
import { updateGtfsRealtime } from 'gtfs';

const app = express();

app.use(bodyParser.json());
app.use(gtfsLoader);

// app.use('/api/test', TestRouter);
app.use('/api/agencies', AgencyRouter);
app.use('/api/routes', RouteRouter);

app.get('/api/mapStyle', async (req, res) => {
    const resource = await fetch(`https://dev.virtualearth.net/REST/v1/Imagery/Metadata/Aerial?key=${BING_MAPS_KEY}`)
        .then(res => res.json())
        .then(data => data.resourceSets[0].resources[0]);
    res.json({
        version: 8,
        name: 'Bing Maps Aerial',
        sprite: 'mapbox://sprites/mapbox/satellite-v9',
        glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
        sources: {
            'bing': {
                type: 'raster',
                tiles: resource.imageUrlSubdomains.map((subdomain: string) => resource.imageUrl.replace('{subdomain}', subdomain)),
                tileSize: resource.imageWidth
            },
        },
        layers: [
            {
                id: 'background', 
                type: 'background', 
                paint: {
                    'background-color': 'rgb(4,7,14)'
                }
            },
            {
                id: 'simple-tiles',
                type: 'raster',
                source: 'bing',
                minzoom: resource.zoomMin,
                maxzoom: resource.zoomMax - 1
            },
        ],
    });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `${req.method} ${req.baseUrl} is not a valid path` });
})

app.use('/static', express.static(join(__dirname, '../../frontend/build/static')));

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../frontend/build/index.html'));
});

app.use((err: ServerError, req: Request, res: Response, next: NextFunction) => {
    res.status(err.statusCode).json({ error: err.message });
});

app.listen(PORT || 5000, () => {
    console.log(`App listening on port ${PORT || 5000}`);
    setInterval(() => updateGtfsRealtime(gtfsConfig), 60000);
})