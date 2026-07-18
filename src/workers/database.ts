import type { FeatureCollection } from 'geojson';
import { bbox } from "@turf/bbox";
import { getItem, setItem } from 'localforage';
import sqlite3InitModule, { type OpfsDatabase } from '@sqlite.org/sqlite-wasm';
import type { Agency } from 'gtfs-types';

let db: OpfsDatabase;
export const ensureDatabase = async () => {
  const opfs = await navigator.storage.getDirectory();
  const remoteHash = await fetch('https://ontime-feeds.brianhuyvo.com/hashes/RG.hash')
    .then(res => res.text());
  const localHash = await getItem<string>('hash');
  const fh = localHash !== remoteHash ? await opfs.getFileHandle('gtfs.s3db', { create: true }) : null;
  const ah = await fh?.createSyncAccessHandle();
  const collection = await (ah ? Promise.all([
    fetch('https://ontime-feeds.brianhuyvo.com/feeds/RG.db')
      .then(res => {
        const reader = res.body?.getReader();
        // read() returns a promise that resolves when a value has been received
        reader?.read().then(async function pump({ done, value }): Promise<void> {
          if (done) {
            if (value)
              ah.write(value);
            ah.flush();
            ah.close();
            await setItem<string>('hash', remoteHash)
            return;
          }
          ah.write(value);

          // Read some more, and call this function again
          return reader.read().then(pump);
        });
      }),
    fetch('https://ontime-feeds.brianhuyvo.com/geojson/RG/RG.geojson')
      .then(res => res.json())
      .then(data => setItem<FeatureCollection>('geojson', data)),
  ]).then(([, geojson]) => geojson) : getItem<FeatureCollection>('geojson'));

  if (!collection) return collection;

  const sqlite3 = await sqlite3InitModule();
  db = new sqlite3.oo1.OpfsDb('gtfs.s3db');
  const agencies: Agency[] = db.selectObjects('SELECT * FROM agency') as any;
  agencies.sort((a, b) => a.agency_name.localeCompare(b.agency_name));

  const routes = collection.features.reduce((map: Record<string, FeatureCollection>, f) => {
    if (f.geometry.type !== 'MultiLineString' || !f.properties)
      return map;

    map[f.properties['agency_id']] ??= {
      type: 'FeatureCollection',
      features: [],
    };
    map[f.properties['agency_id']].features.push(f);
    map.all.features.push(f);

    return map;
  }, {
    all: {
      type: 'FeatureCollection',
      features: [],
    }
  });
  Object.values(routes).forEach(c => {
    c.bbox = bbox(c);
  });

  const stops = collection.features.reduce((map: Record<string, FeatureCollection>, f) => {
    if (f.geometry.type !== 'Point' || !f.properties)
      return map;

    f.properties['routes']?.forEach(({ agency_id }: any) => {
      map[agency_id] ??= {
        type: 'FeatureCollection',
        features: [],
      };
      map[agency_id].features.push(f);
    });

    return map;
  }, {});
  Object.values(routes).forEach(c => {
    c.bbox = bbox(c);
  });

  return { agencies, routes, stops };
}