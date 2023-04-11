'use client'

import { useRef, useState } from 'react';
import InfoPanel from './Info';
import MapComponent from './Map';
import './style.css';
import Feature from 'ol/Feature';
import { SelectedFeaturesContext, SelectedFeaturesDispatchContext, InfoPanelRef, MapContext, MapDispatchContext, MapRef, RouteFeaturesContext, RouteFeaturesDispatchContext, VehicleFeaturesContext, VehicleFeaturesDispatchContext, StopFeaturesDispatchContext, StopFeaturesContext } from './FeaturesContext';
import { Map } from 'ol';

export default function MapPage() {
    const infoPanelRef = useRef<HTMLDivElement>(null);
    // const mapRef = useRef<HTMLDivElement>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
    const [routeFeatures, setRouteFeatures] = useState<Feature[]>([]);
    const [stopFeatures, setStopFeatures] = useState<Feature[]>([]);
    const [vehicleFeatures, setVehicleFeatures] = useState<Feature[]>([]);
    // const [map, setMap] = useState<Map | null>(null);

    return (
        <main>
            <SelectedFeaturesContext.Provider value={selectedFeatures}>
                <SelectedFeaturesDispatchContext.Provider value={setSelectedFeatures}>
                    <RouteFeaturesContext.Provider value={routeFeatures}>
                        <RouteFeaturesDispatchContext.Provider value={setRouteFeatures}>
                            <VehicleFeaturesContext.Provider value={vehicleFeatures}>
                                <VehicleFeaturesDispatchContext.Provider value={setVehicleFeatures}>
                                    <InfoPanelRef.Provider value={infoPanelRef}>
                                        <StopFeaturesContext.Provider value={stopFeatures}>
                                            <StopFeaturesDispatchContext.Provider value={setStopFeatures}>
                                                {/* <MapRef.Provider value={mapRef}> */}
                                                    <MapComponent></MapComponent>
                                                    <InfoPanel></InfoPanel>
                                                {/* </MapRef.Provider> */}
                                            </StopFeaturesDispatchContext.Provider>
                                        </StopFeaturesContext.Provider>
                                    </InfoPanelRef.Provider>
                                </VehicleFeaturesDispatchContext.Provider>
                            </VehicleFeaturesContext.Provider>
                        </RouteFeaturesDispatchContext.Provider>
                    </RouteFeaturesContext.Provider>
                </SelectedFeaturesDispatchContext.Provider>
            </SelectedFeaturesContext.Provider>
        </main>
    )
}