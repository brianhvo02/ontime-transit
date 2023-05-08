import express from 'express';
import geojsonRouter from './routes/geojson';
import routesRouter from './routes/routes';
import { join } from 'path';

const app = express();
const port = 5000;

app.use(express.static(join(process.env.NODE_PATH!, 'public')));
app.use('/api', geojsonRouter);
app.use('/api', routesRouter);

// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});