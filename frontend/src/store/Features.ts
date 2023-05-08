import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { RootState } from ".";

// Define a type for the slice state
interface FeatureState {
    [key: string]: Feature<Geometry>
}

const initialState: FeatureState = {}

export const featureSlice = createSlice({
    name: 'features',
    initialState,
    reducers: {
        // addFeatures: (
        //     state: FeatureState, 
        //     action: PayloadAction<Feature<Geometry>[]>
        // ) => ({
        //     ...state,
        //     ...Object.fromEntries(
        //         action.payload.map(
        //             feature => [
        //                 feature.get('route_id') || feature.get('stop_id'), 
        //                 feature
        //             ]
        //         )
        //     )
        // })
    }
})

// export const { addFeatures } = featureSlice.actions

export const getFeatures = (state: RootState) => state.features;

export default featureSlice.reducer