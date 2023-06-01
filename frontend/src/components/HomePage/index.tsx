import { createPortal } from 'react-dom';
import { useGetAgenciesQuery } from '../../store/api/agency';
import Modal from '../Modal';
import Loading from '../Modal/Loading';
import './index.scss';
import { convertApiError, generateColor, hexToRGB } from '../../store/utils';
import { useEffect, useMemo, useState } from 'react';
import HomeMap from './Map';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { LngLatBounds } from 'mapbox-gl';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { Feature, Polygon } from 'geojson';
import { Agency } from 'gtfs-types';

// const DisplaySuccess = ({ successData }: { successData?: string }) => {
//     return (
//         <h2>
//             Hello, {successData}
//         </h2>
//     );
// }

// const DisplayError = ({ error }: { error: string }) => {
//     return (
//         <>
//             <h2>Oh no, an error!</h2>
//             {error}
//         </>
//     )
// }

const HomePage = () => {
    const agencies = useGetAgenciesQuery();
    // const [selectedAgency, setSelectedAgency] = useState<string | undefined>();
    // const { data, isLoading, isSuccess, isError, error } = useSendTestQuery({ test: true });
    // const { test } = data || {};

    // const [modalOpened, toggleModal] = useState(true);

    // if (modalOpened) return createPortal(
    //     <Modal closeModal={isLoading ? undefined : () => toggleModal(false)}>
    //         {
    //             isLoading &&
    //             <Loading />
    //         }
    //         {
    //             isSuccess &&
    //             <DisplaySuccess successData={test} />
    //         }
    //         {
    //             isError &&
    //             <DisplayError error={convertApiError(error)} />
    //         }
    //     </Modal>,
    //     document.body
    // );

    const convexes = useMemo(() => agencies.data?.agencies.map(agency => agency.area).filter(area => area), [agencies]);

    const agenciesLayer = useMemo(() =>
        new GeoJsonLayer({
            id: 'agencies',
            data: convexes,
            pickable: true,
            filled: false,
            stroked: false,
            lineWidthUnits: 'pixels',
            getLineWidth: 2,
            getText: ({ properties }: Feature<Polygon, Agency>) => properties.agency_name,
            getTextColor: [0, 0, 0],
            getTextSize: 16
        }), [agencies]
    );

    const routesLayer = useMemo(() =>
        new GeoJsonLayer({
            id: 'routes',
            data: agencies.data?.routes,
            pickable: true,
            lineWidthUnits: 'pixels',
            getLineColor: ({ properties }: Feature) => hexToRGB(properties?.route_color ?? '') ?? [245, 245, 245],
            getLineWidth: 2
        }), [agencies]
    );
//[-123.0543893911,36.97474289,-120.94846,39.09982]
    return (
        <div className='homepage'>
            {
                agencies.isLoading &&
                <Modal>
                    <Loading />
                </Modal>
            }
            {
                agencies.isSuccess &&
                <HomeMap initialBounds={new LngLatBounds(agencies.data.bounds)} layers={[agenciesLayer, routesLayer]} />
            }
        </div>
    );
}

export default HomePage;