import { Map } from 'ol';
import Feature from 'ol/Feature.js';
import { SetStateAction, createContext, Dispatch, RefObject } from 'react';

export const SelectedFeaturesContext = createContext<Feature[] | null>(null);
export const SelectedFeaturesDispatchContext = createContext<Dispatch<SetStateAction<Feature[]>> | null>(null);
export const RouteFeaturesContext = createContext<Feature[] | null>(null);
export const RouteFeaturesDispatchContext = createContext<Dispatch<SetStateAction<Feature[]>> | null>(null);
export const StopFeaturesContext = createContext<Feature[] | null>(null);
export const StopFeaturesDispatchContext = createContext<Dispatch<SetStateAction<Feature[]>> | null>(null);
export const VehicleFeaturesContext = createContext<Feature[] | null>(null);
export const VehicleFeaturesDispatchContext = createContext<Dispatch<SetStateAction<Feature[]>> | null>(null);
export const InfoPanelRef = createContext<RefObject<HTMLDivElement> | null>(null);
export const MapContext = createContext<Map | null>(null);
export const MapDispatchContext = createContext<Dispatch<SetStateAction<Map | null>> | null>(null);
export const MapRef = createContext<RefObject<HTMLDivElement> | null>(null);