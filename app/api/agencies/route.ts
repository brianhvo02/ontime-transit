import { join } from 'node:path';
import { NextResponse } from 'next/server.js';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
    return NextResponse.json(JSON.parse(await readFile(join(process.cwd(), 'feeds', '_agencies.json'), { encoding: 'utf-8' })));
}  