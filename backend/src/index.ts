import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { join } from 'path';
// import TestRouter from './routes/test';
import { PORT } from './config.js';
import { ServerError } from './errors.js';
import { gtfsLoader } from './middleware/gtfs.js';
import { __dirname } from './utils.js';
import AgencyRouter from './routes/agencies.js';
import RouteRouter from './routes/routes/index.js';

const app = express();

app.use(bodyParser.json());
app.use(gtfsLoader);

// app.use('/api/test', TestRouter);
app.use('/api/agencies', AgencyRouter);
app.use('/api/routes', RouteRouter);

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
})