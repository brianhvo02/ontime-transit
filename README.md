# OnTime Transit - Bay Area Transit Data Visualizer

## Background

OnTime Transit is a data visualization project to allow users to translate data given by California's [Metropolitan Transportation Commission (MTC)](https://mtc.ca.gov) to a human-readable format in the browser using JavaScript and third-party libraries. Uses the [General Transit Feed Specification (GTFS)](https://gtfs.org/documentation/overview) feeds consolidated by [511 SF Bay](https://511.org/open-data/transit) from all feeds provided transit services.

[Try it now!](https://ontime-transit.vercel.app/ontime-transit)

## Overview

With OnTime, users will be able to:
- See what transit authorities are in the Bay Area with GTFS feeds available to consume
- TODO: Find lines, stops, timetables, and scheduled departures for all provided transit services
- TODO: Find realtime data of current trips, vehicle locations, and updated departure times
- TODO: Generate statistics based on static and realtime data

<!-- ## Instructions

- The train logo in the top of the screen is your home button! Use it to come back to the initial agency selection screen.
- The back button will take you one layer back up (i.e. routes -> agencies, stops -> routes).
- The Github icon will take you to the Github repository this app is stored in.
- The pause button will pause the transit alerts banner that scrolls through the screen.
- The marker button will take you to your current location.
- The map button will make the top layer disappear so you can explore the map.
- The info button will show you the welcome screen with instructions.
- Click on a space of the map with no features and it will take you to an overview of the layer you're in.
- Click on a feature to bring up the relevant data for that feature.
- Hover over a link to highlight the feature on the map.
- Right-click on a link to zoom to that specific feature. -->

## Libraries and APIs

- [TypeScript](https://www.typescriptlang.org/docs) - a language that adds optional types to JavaScript that support tools for large-scale JavaScript applications for any browser, for any host, on any OS
  - [GitHub Repo](https://github.com/microsoft/typescript)
  - [Apache 2.0 License](https://github.com/microsoft/typescript/blob/main/LICENSE.txt)
- [React](https://react.dev/) - a JavaScript library for building user interfaces
  - [GitHub Repo](https://github.com/react/react)
  - [MIT License](https://github.com/react/react/blob/main/LICENSE)
- [Vite](https://vite.dev) - a build tool that aims to provide a faster and leaner development experience for modern web projects
  - [GitHub Repo](https://github.com/vitejs/vite)
  - [MIT License](https://github.com/vitejs/vite/blob/main/LICENSE)
- [Material UI](https://mui.com/material-ui/getting-started) - library of React components that features an independent implementation of Google's [Material Design](https://m2.material.io/design/introduction) system
  - [GitHub Repo](https://github.com/mui/material-ui)
  - [MIT License](https://github.com/mui/material-ui/blob/main/LICENSE)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides) - a JavaScript library for interactive, customizable vector maps on the web
  - [GitHub Repo](https://github.com/mapbox/mapbox-gl-js)
  - [Mapbox TOS & BSD 3-Clause License](https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.md)
- [react-map-gl](https://visgl.github.io/react-map-gl/docs) -  a suite of React components designed to provide a React API for mapbox-gl
  - [GitHub Repo](https://github.com/visgl/react-map-gl)
  - [MIT License & BSD 3-Clause License](https://github.com/visgl/react-map-gl/blob/main/LICENSE)
- [deck.gl](https://deck.gl/docs) - GPU-powered, highly performant large-scale data visualization
  - [GitHub Repo](https://github.com/visgl/deck.gl)
  - [MIT License](https://github.com/visgl/deck.gl/blob/main/LICENSE)
- [Turf.js](https://turfjs.org/docs/intro) - a modular geospatial engine written in JavaScript
  - [GitHub Repo](https://github.com/turfjs/turf)
  - [MIT License](https://github.com/turfjs/turf/blob/main/LICENSE)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) - an async state management library built to simplify fetching, caching, synchronizing, and updating server state
  - [GitHub Repo](https://github.com/tanstack/query)
  - [MIT License](https://github.com/tanstack/query/blob/main/LICENSE)
- [SQLite Wasm](https://sqlite.org/wasm/doc/trunk/index.md) - SQLite Wasm conveniently wrapped as an ES Module
  - [GitHub Repo](https://github.com/sqlite/sqlite-wasm)
  - Apache 2.0 License
- [localForage](https://github.com/localForage/localForage) - a fast and simple storage library for JavaScript
  - [Apache 2.0 License](https://github.com/localForage/localForage/blob/main/LICENSE)
- [Comlink](https://github.com/GoogleChromeLabs/comlink) - a tiny library that removes the mental barrier of thinking about postMessage and hides the fact that you are working with workers
  - [Apache 2.0 License](https://github.com/GoogleChromeLabs/comlink/blob/main/LICENSE)
- [node-GTFS](https://github.com/blinktaginc/node-gtfs) - loads transit data in GTFS format into a SQLite database
- [gtfs-to-geojson](https://github.com/blinktaginc/gtfs-to-geojson) -  converts transit data in GTFS format into GeoJSON
- [511 Open Transit Data](https://511.org/open-data/transit) - 511’s Open Data for Bay Area transit authorities
	- [Data Use Agreement](https://511.org/sites/default/files/pdfs/511_Data_Agreement_Final.pdf)