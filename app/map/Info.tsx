'use client'

import Feature, { FeatureLike } from 'ol/Feature.js';
import { MouseEvent, RefObject, useContext, useEffect } from 'react';
import { SelectedFeaturesContext, SelectedFeaturesDispatchContext, InfoPanelRef, MapContext, RouteFeaturesContext, RouteFeaturesDispatchContext, VehicleFeaturesContext, StopFeaturesContext } from './FeaturesContext';
import Style from 'ol/style/Style.js';
import { emptyStyle } from './Map';
import { Geometry } from 'ol/geom.js';

export default function InfoPanel() {
    const selectedFeatures = useContext(SelectedFeaturesContext);
    const setSelectedFeatures = useContext(SelectedFeaturesDispatchContext);
    const routeFeatures = useContext(RouteFeaturesContext);
    const stopFeatures = useContext(StopFeaturesContext);
    const vehicleFeatures = useContext(VehicleFeaturesContext);
    const infoPanelRef = useContext(InfoPanelRef);

    const updateVisibility = function(selectedFeature: Feature<Geometry>) {
        if (vehicleFeatures) vehicleFeatures.forEach(f => f.get('id') === selectedFeature.get('id') || (selectedFeature.getGeometry()?.getType() === 'MultiLineString' && f.get('route_id') === selectedFeature.get('route_id')) ? f.setStyle() : f.setStyle(emptyStyle));
        if (routeFeatures) routeFeatures.forEach(f => f.get('route_id') === selectedFeature.get('route_id') ? f.setStyle() : f.setStyle(emptyStyle));
        if (stopFeatures) stopFeatures.forEach(f => f.get('stop_id') === selectedFeature.get('stop_id') ? f.setStyle() : f.setStyle(emptyStyle));
    }

    const handleClick = function(e: MouseEvent<HTMLLIElement>, feature: Feature) {
        e.preventDefault();
        if (setSelectedFeatures) setSelectedFeatures([feature]);
        // stopFeatures?.find(f => f.get('stop_id') === feature.get('stop_id'))?.setStyle()

        updateVisibility(feature);
    }

    useEffect(() => {
        console.log(selectedFeatures)
        if (selectedFeatures && selectedFeatures.length === 1) updateVisibility(selectedFeatures[0]);
    }, [selectedFeatures]);

    useEffect(() => {
        if (vehicleFeatures && selectedFeatures && setSelectedFeatures) setSelectedFeatures(prev => prev);
    }, [vehicleFeatures]);

    const getCurrentStatusString = (currentStatus: number) => {
        switch (currentStatus) {
            case 0:
                return 'Stopping soon at ';
            case 1:
                return 'Stopped at ';
            case 2:
                return 'On the way to ';
            default:
                return 'Next stop: ';
        }
    }

    const getOccupancyStatusString = (occupancyStatus: number) => {
        switch (occupancyStatus) {
            case 0:
                return 'Relatively empty';
            case 1:
                return 'Lots of seats to go around';
            case 2:
                return 'Some seats saved for you'
            default:
                return 'Pretty full';
        }
    }

    const getEarlyOrLate = (estimated: string, scheduled: string) => {
        const difference = new Date(`0 ${estimated}`).valueOf() - new Date(`0 ${scheduled}`).valueOf();
        const time = new Date(Math.abs(difference));
        return `(${time.getMinutes() !== 0 ? `${time.getMinutes()} min ` : ''}${time.getSeconds() !== 0 ? `${time.getSeconds()} sec ` : ''}${difference === 0 ? '' : difference > 0 ? 'late' : 'early'})`;
    }

    return (
        <div className='infoPanel' ref={infoPanelRef}>
            <ul>
                {!selectedFeatures || selectedFeatures.map(feature => {
                    return <li key={feature.get('id') || feature.get('route_id') || feature.get('stop_id')} onClick={e => handleClick(e, feature)}>
                        {feature.get('agency_id') ? (<p>{feature.get('agency_name')}</p>) : null}
                        {feature.get('id') ? (<p>Bus {feature.get('id')}</p>) : null}
                        {feature.get('route_id') ? (<p>Route: {feature.get('route_short_name')} ({feature.get('route_long_name')})</p>) : null}
                        {feature.get('stops') ? (<p>{getCurrentStatusString(feature.get('current_status'))}{feature.get('stops')[feature.get('stop_sequence') - 1]['stop_name']}</p>) : null}
                        {/* {feature.get('stops') && feature.get('current_status') !== 1 ? (<p>Estimated Arrival: {feature.get('stops')[feature.get('stop_sequence') - 1]['stop_actual_departure_time']}</p>) : null} */}
                        {/* {feature.get('stops') && feature.get('current_status') !== 1 ? (<p>Scheduled Arrival: {feature.get('stops')[feature.get('stop_sequence') - 1]['stop_scheduled_departure_time']}</p>) : null} */}
                        {feature.get('stops') && feature.get('current_status') !== 1 ? (<p>Estimated Arrival: {new Date(`0 ${feature.get('stops')[feature.get('stop_sequence') - 1]['stop_actual_departure_time']}`).toLocaleTimeString('en-US')} {getEarlyOrLate(feature.get('stops')[feature.get('stop_sequence') - 1]['stop_actual_departure_time'], feature.get('stops')[feature.get('stop_sequence') - 1]['stop_scheduled_departure_time'])}</p>) : null }
                        {feature.get('occupancy_status') ? (<p>Occupancy Status: {getOccupancyStatusString(feature.get('occupancy_status'))}</p>) : null}
                    </li>
                })}
            </ul>
        </div>
    )
}