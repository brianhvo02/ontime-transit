import { SerializedError } from "@reduxjs/toolkit";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";

interface ApiError {
    error: string;
}

const instanceOfApiError = (object: any): object is ApiError => 'error' in object;

export const convertApiError = (error: FetchBaseQueryError | SerializedError | undefined) => {
    console.log(error)
    if (error) {
        if ('status' in error) {
            if (error.data && typeof error.data === 'string' && error.data.includes('Proxy error')) 
                return 'Error connecting to the backend, is the server running?';
            return 'error' in error 
                ? error.error 
                : instanceOfApiError(error.data) 
                    ? error.data.error 
                    : JSON.stringify(error.data);
        } else {
            if (error.message) {
                return error.message;
            }
        }
    }

    return '';
}