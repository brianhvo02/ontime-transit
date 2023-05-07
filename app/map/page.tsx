'use client'

import './style.css';
import MapComponent, { emptyStyle } from './Map';
import Image from 'next/image.js';
import logo511 from '../../public/511SFBay_color_reversed_web.png';
import Link from 'next/link.js';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrainSubway, faCircleArrowLeft, faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import { useCallback, useRef, useState } from 'react';
import InfoPanel from './Info';
import './style.css';
import Feature from 'ol/Feature';
import MapContext, { SelectedFeatures } from './MapContext';
import { Map, MapBrowserEvent } from 'ol';
import { RMap } from 'rlayers';
import { MultiLineString, Point, Polygon } from 'ol/geom.js';

config.autoAddCss = false;

export default function MapPage() {
    const infoPanelRef = useRef<HTMLDivElement>(null);
    // const mapRef = useRef<HTMLDivElement>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeatures>({
        agencies: [],
        routes: [],
        stops: [],
        vehicles: []
    });
    const [agencyFeatures, setAgencyFeatures] = useState<Feature<Polygon>[]>([]);
    const [routeFeatures, setRouteFeatures] = useState<Feature<MultiLineString>[]>([]);
    const [stopFeatures, setStopFeatures] = useState<Feature<Point>[]>([]);
    const [vehicleFeatures, setVehicleFeatures] = useState<Feature<Point>[]>([]);
    const mapRef = useRef<RMap>(null);

    const getCurrentSelect = () => (
        selectedFeatures ? 
            selectedFeatures.vehicles.length > 0 ? selectedFeatures.vehicles : 
                selectedFeatures.stops.length > 0 ? selectedFeatures.stops : 
                    selectedFeatures.routes.length > 0 ? selectedFeatures.routes : 
                        selectedFeatures.agencies.length > 0 ? selectedFeatures.agencies : 
                            []
        : []
    )

    const getCurrentSelectType = () => (
        selectedFeatures ? 
            selectedFeatures.vehicles.length > 0 ? 'vehicles' : 
                selectedFeatures.stops.length > 0 ? 'stops' : 
                    selectedFeatures.routes.length > 0 ? 'routes' : 
                        selectedFeatures.agencies.length > 0 ? 'agencies' : 
                            null
        : null
    )

    const handleBackClick = () => {
        const type = getCurrentSelectType();
        if (type) setSelectedFeatures(prev => {
            return {
                ...prev,
                [type]: []
            }
        });

        switch (type) {
            case 'vehicles': {
                const agencyId = selectedFeatures.agencies[0].get('agency_id');
                routeFeatures.forEach(f => f.get('agency_id') === agencyId ? f.setStyle() : f.setStyle(emptyStyle));
                vehicleFeatures.forEach(f => f.get('agency_id') === agencyId ? f.setStyle() : f.setStyle(emptyStyle));
                const infoPanelExtended = infoPanelRef.current?.classList.contains('reveal');
                if (infoPanelExtended) {
                    infoPanelRef.current?.classList.remove('reveal');
                    mapRef.current?.ol.getTargetElement().classList.remove('reveal');
                }
                const [x, y] = mapRef.current?.ol.getSize()!;
                mapRef.current?.ol.getView().fit(selectedFeatures.agencies[0].getGeometry()?.getExtent()!, {
                    padding: [10, 10, 10, 10],
                    duration: 1000,
                    size: infoPanelExtended ? [x, y * 2] : [x, y]
                });
            }

            case 'agencies': {
                agencyFeatures.forEach(f => f.setStyle());
                routeFeatures.forEach(f => f.setStyle());
                vehicleFeatures.forEach(f => f.setStyle(emptyStyle));
                const infoPanelExtended = infoPanelRef.current?.classList.contains('reveal');
                if (infoPanelExtended) {
                    infoPanelRef.current?.classList.remove('reveal');
                    mapRef.current?.ol.getTargetElement().classList.remove('reveal');
                }
                const [x, y] = mapRef.current?.ol.getSize()!;
                mapRef.current?.ol.getView().fit([-13698351.966894459, 4435586.85631716, -13463920.979430618, 4735980.033863289], {
                    padding: [10, 10, 10, 10],
                    duration: 1000,
                    size: infoPanelExtended ? [x, y * 2] : [x, y]
                });
            }
        }
    }
        

    return (
        <>
            <header>
                <div className='absolute left-0 z-10 text-3xl mt-5'>
                    <FontAwesomeIcon className='ml-5 cursor-pointer' icon={faCircleArrowLeft} onClick={useCallback(handleBackClick, [mapRef, selectedFeatures])} />
                </div>
                <div className='absolute left-1/2 -translate-x-1/2 top-0 flex place-items-center height-1/6 z-10'>
                    <h1 className='text-3xl text-right'>OnTime Transit</h1>
                    <FontAwesomeIcon className='text-6xl text-center m-5' icon={faTrainSubway} />
                    <h2 className='text-left'>Bay Area Transit Data Visualizer</h2>
                </div>
                <div className='absolute right-0 z-10 text-3xl mt-5'>
                    <Link href='https://github.com/brianhvo02/ontime-transit' target='_blank'><FontAwesomeIcon className='mr-5' icon={faGithub} /></Link>
                    <FontAwesomeIcon className='mr-5 cursor-pointer' icon={faLocationCrosshairs} />
                </div>
            </header>
            <main className='absolute top-0 left-0 h-full w-full z-0'>
                <MapContext.Provider value={{
                    selectedFeatures,
                    setSelectedFeatures,
                    agencyFeatures,
                    setAgencyFeatures,
                    routeFeatures,
                    setRouteFeatures,
                    stopFeatures,
                    setStopFeatures,
                    vehicleFeatures,
                    setVehicleFeatures,
                    infoPanelRef,
                    mapRef,
                    getCurrentSelect
                }}>
                    <MapComponent></MapComponent>
                    <InfoPanel></InfoPanel>
                </MapContext.Provider>
            </main>
            <footer className='absolute left-1/2 -translate-x-1/2 bottom-2 w-1/6 z-10 flex items-center gap-5'>
                <p className='whitespace-nowrap'>Powered by:</p>
                <Link target='_blank' href='https://511.org/open-data/transit'>
                    <Image src={logo511} alt='511 SF Bay' />
                </Link>
            </footer>
        </>
    )
}