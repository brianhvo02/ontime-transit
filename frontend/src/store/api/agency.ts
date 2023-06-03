import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Agency, Agencies, VehiclePayload, StopPayload } from '../payloads/Agency';

const agencyApi = createApi({
    reducerPath: 'agencies',
    baseQuery: fetchBaseQuery({ baseUrl: '/api/agencies' }),
    endpoints: (builder) => ({
        getAgencies: builder.query<Agencies, void>({
            query: () => ({
                url: '/',
                method: 'GET'
            })
        }),
        getAgency: builder.query<Agency, string>({
            query: agencyId => ({
                url: `/${agencyId}`,
                method: 'GET'
            })
        }),
        getVehicles: builder.query<VehiclePayload, string>({
            query: agencyId => ({
                url: `/${agencyId}/vehicles`,
                method: 'GET'
            })
        }),
        getStops: builder.query<StopPayload, string>({
            query: agencyId => ({
                url: `/${agencyId}/stops`,
                method: 'GET'
            })
        })
    }),
});

export const { useGetAgenciesQuery, useGetAgencyQuery, useGetVehiclesQuery, useGetStopsQuery } = agencyApi;
export default agencyApi;