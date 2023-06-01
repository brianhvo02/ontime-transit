import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import { openDb } from 'gtfs';
import { join } from 'path';
import { __dirname } from '../utils.js';

export const gtfsLoader = async (req: Request, res: Response, next: NextFunction) => {
    const config = JSON.parse(
        await readFile(join(__dirname, '../gtfsConfig.json'), 'utf-8')
    );
    
    req.db = openDb(config);
    next();
}