import { configureStore } from '@reduxjs/toolkit';
import ConfigReducer from './config';
import agencyApi from './api/agency';

export const store = configureStore({
    reducer: {
        config: ConfigReducer,
        [agencyApi.reducerPath]: agencyApi.reducer
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(agencyApi.middleware)
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;