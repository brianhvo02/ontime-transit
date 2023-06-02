import { Request, Response, NextFunction } from 'express';
import { openDb } from 'gtfs';
import { __dirname } from '../utils.js';
import { gtfsConfig } from '../config.js';

export const gtfsLoader = async (req: Request, res: Response, next: NextFunction) => {
    req.db = openDb(gtfsConfig);
    next();
}