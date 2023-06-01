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

export const hexToRGB = (hex: string): [number, number, number] | null => {
    const matches = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return matches ? [
        parseInt(matches[1], 16),
        parseInt(matches[2], 16),
        parseInt(matches[3], 16)
    ] : null;
}

export const generateColor = (str: string) => {
    const hash = str.split('').reduce((hash, char) => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
        return hash;
    }, 0);
    return Array.from({ length: 3 }).reduce((hex: string, _, i) => hex + ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).slice(-2), '#');
}

export const tileXYToQuadKey = (x: number, y: number, z: number) => {
    let quadKey = "";
    
    for (let i = z; i > 0; i--) {
        let digit = 0,

        mask = 1 << (i - 1);

        if ((x & mask) !== 0)
            digit++;
        
        if ((y & mask) !== 0)
            digit = digit + 2;

        quadKey += digit;
    }
  
    return quadKey;
}