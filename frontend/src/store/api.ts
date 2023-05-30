import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface ApiRequest {
    test: boolean;
}

export interface ApiResponse {
    test: string;
}

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
    endpoints: (builder) => ({
        sendTest: builder.query<ApiResponse, ApiRequest>({
            query: req => ({
                url: 'test',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req)
            })
        }),
    }),
});

export const { useSendTestQuery } = api;