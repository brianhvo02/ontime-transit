import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import CircularProgress from '@mui/material/CircularProgress';
import { Box, List, ListItem, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import Map, { NavigationControl, useControl, type MapRef } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { DeckProps, Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { GeoJsonLayer } from 'deck.gl';
import { useEffect, useMemo, useRef, useState } from 'react';

function DeckGLOverlay(props: DeckProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const databaseWorker = new ComlinkWorker<
  typeof import('./workers/database.ts')
>(new URL('./workers/database.ts', import.meta.url), {
  name: 'databaseComlink',
  type: 'module',
});

export default function App() {
  const mapRef = useRef<MapRef>(null);

  const [hoverAid, setHoverAid] = useState<string | null>(null);
  const [selectedAid, setSelectedAid] = useState<string | null>(null);
  
  const { data } = useQuery({
    queryKey: ['ensureDatabase'],
    queryFn: async () => databaseWorker.ensureDatabase(),
    staleTime: Infinity,
  });

  const routeCollection = useMemo(
    () => selectedAid ? data?.routes[selectedAid] : 
      hoverAid ? data?.routes[hoverAid] : data?.routes.all, 
    [data, hoverAid, selectedAid]
  );

  const layers: Layer[] = data ? [
    new GeoJsonLayer({
      id: 'routes',
      data: routeCollection,
      getLineWidth: 16,
      lineWidthMinPixels: (selectedAid || hoverAid) ? 2 : 0.5,
      lineWidthMaxPixels: 16,
      getLineColor: (f: Feature<any, any>) => {
        const color: string | undefined = f.properties['route_color'];
        const rgb = color?.slice(color.indexOf('#') + 1)
          .match(/[0-9a-f]{2}/g)
          ?.map(x => parseInt(x, 16))
        if (!color || color.length < 6 || !rgb) return [0, 0, 0];
        return [rgb[0], rgb[1], rgb[2]];
      },
    }),
    new GeoJsonLayer({
      id: 'stops',
      data: (data && selectedAid) ? data.stops[selectedAid] : [],
      pointType: 'circle',
      getPointRadius: 16,
      pointRadiusMinPixels : 2,
      pointRadiusMaxPixels : 16,
    }),
  ]: [];

  useEffect(() => {
    const bbox = routeCollection?.bbox;
    if (!mapRef.current || !bbox)
      return;

    mapRef.current.fitBounds([
      bbox[0], bbox[1],
      bbox[2], bbox[3],
    ], { padding: 64 });
  }, [routeCollection]);

  return (
    <main>
      <Box component={Paper} sx={{
        minWidth: '32rem', minHeight: '6rem',
        position: 'absolute',
        top: 0, left: 0, zIndex: 5,
        padding: '1rem', margin: '1rem',
        display: 'flex', gap: '1rem',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Box sx={{
          display: 'flex', gap: '1rem',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          maxHeight: 'calc(100vh - 4rem)',
        }}>
          <Typography variant='h6'>OnTime Transit</Typography>
          { data ?
          <List sx={{ overflowY: 'auto' }}>
            {data.agencies.map(agency => (
          <ListItem key={agency.agency_id}>
            <ListItemButton 
              selected={selectedAid === agency.agency_id}
              onMouseEnter={() => agency.agency_id && setHoverAid(agency.agency_id)} 
              onMouseLeave={() => agency.agency_id && setHoverAid(prev => prev === agency.agency_id ? null : prev)} 
              onClick={() => setSelectedAid(prev => (!agency.agency_id ||prev === agency.agency_id) ? null : agency.agency_id)}
            >
              <ListItemText primary={agency.agency_name} />
            </ListItemButton>
          </ListItem>
            ))}
          </List> : 
          <CircularProgress size={24} /> }
        </Box>
      </Box>
      <Map
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          bounds: [
            -124.7844079, 24.7433195, 
            -66.9513812, 49.3457868,
          ],
          fitBoundsOptions: { padding: 64 },
        }}
        mapStyle='mapbox://styles/mapbox/standard'
        projection={'mercator'}
        // config={{ basemap: { lightPreset: 'night' } }}
        // terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        ref={mapRef}
      >
        {/* <Source
          id='mapbox-dem' type='raster-dem' 
          url='mapbox://mapbox.mapbox-terrain-dem-v1' 
          tileSize={512} maxzoom={14}
        /> */}
        <NavigationControl />
        <DeckGLOverlay layers={layers} />
      </Map>
    </main>
  );
}