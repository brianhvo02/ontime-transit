import './RouteInfo.modal.scss';
import Feature from 'ol/Feature';
import { RouteProperties, emptyStyle } from '.';
import { MutableRefObject, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

enum RouteType {
    LightRail,
    Subway,
    Rail,
    Bus,
    Ferry,
    CableTram,
    AerialLift,
    Funicular,
    Trolley = 11,
    Monorail = 12
}

const RouteInfo = ({ features, feature }: { features: MutableRefObject<Feature[]> , feature: RouteProperties }) => {
    const stops = useMemo(() => features.current.filter(
        f => (
            f.getGeometry()?.getType() === 'Point'
                && 
            f.get('routes').find((route: { [key: string]: string }) => 
                route['route_id'] === feature['route_id']
            )
        )
    ).sort((a, b) => a.get('stop_name').localeCompare(b.get('stop_name'))), [features, feature]);

    const [currentPage, setCurrentPage] = useState(0);

    return (
        <div className='feature-info'>
            <p>{feature['agency_name']}</p>
            <h2 style={{ color: feature['route_color'] }}>{feature['route_long_name']}</h2>
            <h3>Route: {feature['route_short_name']}</h3>
            <h4>Type: {RouteType[parseInt(feature['route_type'])]}</h4>
            <p>{feature['route_desc']}</p>
            <a href={feature['route_url']} target='_blank'>Click for official page</a>
            <div className='stops-header'>
                <FontAwesomeIcon 
                    icon={faChevronLeft} 
                    style={{
                        visibility: currentPage > 0 ? 'visible' : 'hidden'
                    }} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                />
                <span>Stops</span>
                <FontAwesomeIcon 
                    icon={faChevronRight} 
                    style={{
                        visibility: (currentPage + 1) < stops.length / 20 ? 'visible' : 'hidden'
                    }} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                />
            </div>
            
            <ul>
                {
                    stops.slice(currentPage * 20, (currentPage + 1) * 20).map(stop => 
                        <li 
                            key={stop.get('stop_id')}
                            onMouseEnter={() => stops.forEach(s => stop === s ? s.setStyle() : s.setStyle(emptyStyle))}
                            onMouseLeave={() => stop.setStyle(emptyStyle)}
                        >
                            {stop.get('stop_name')} ({stop.get('stop_id')})
                        </li>
                    )
                }
            </ul>
        </div>
    )
}

export default RouteInfo