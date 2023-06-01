import { Database } from 'better-sqlite3';

declare module "express-serve-static-core" {
    export interface Request {
        db: Database;
    }
}