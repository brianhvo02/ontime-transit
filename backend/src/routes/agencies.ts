import { Request, Router } from 'express';
import { ServerError, UnprocessableEntity, isError } from '../errors.js';
import { getAgencies, getRoutes, getShapesAsGeoJSON } from 'gtfs';
import { area, bbox, bboxPolygon, convex, featureCollection, multiLineString } from '@turf/turf';
import { FeatureCollection, MultiLineString, Position } from 'geojson';
import { Route } from 'gtfs-types';

const AgencyRouter = Router();

const getAgencyInfo = async (agency_id: string | undefined = undefined) => {
    const results = agency_id ? getAgencies({ agency_id: `${agency_id}_${agency_id}` }) : getAgencies();

    if (!results.length) throw new UnprocessableEntity('Agency not found.');

    const routes: FeatureCollection<MultiLineString, Route> = {
        type: 'FeatureCollection',
        features: []
    };

    const agencies = results.map(agency => {
        const info = { 
            ...agency, 
            agency_id: agency.agency_id.slice(0, agency.agency_id.indexOf('_'))
        };

        const routesCollection: FeatureCollection<MultiLineString, Route> = featureCollection(
            getRoutes({
                agency_id: agency.agency_id
            }).map(route => multiLineString(
                getShapesAsGeoJSON({ route_id: route.route_id })
                    .features
                    .map(feature => feature.geometry.coordinates as Position[]), {
                        ...route, 
                        agency_id: agency.agency_id.slice(0, agency.agency_id.indexOf('_')) 
                    } as Route
            ))
        );
    
        const box = bboxPolygon(bbox(routesCollection));
        box.properties = info;
    
        const area = convex(routesCollection);
        if (area) area.properties = info;

        routes.features.push(...routesCollection.features);

        return {
            info,
            box, area
        };
    });
    
    return {
        agencies,
        routes
    };
}

AgencyRouter.get('/', async (req, res, next) => {
    try {
        const { agencies, routes } = await getAgencyInfo();
        if (!Array.isArray(agencies)) 
            throw new ServerError('Got back array instead of object.');
        res.json({
            agencies,
            routes,
            bounds: bbox(featureCollection(agencies.map(agency => agency.box)))
        });
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});

AgencyRouter.get('/:agency_id', async (req: Request<{ agency_id: string }>, res, next) => {
    const { agency_id } = req.params;

    try {
        res.json(await getAgencyInfo(agency_id));
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});


// AgencyRouter.get('/:agency_id/routes', async (req: Request<{ agency_id: string }>, res, next) => {
//     const { agency_id } = req.params;
//     const { route_id, format } = req.query;

//     try {
//         if (format === 'geojson') {
//             // const test = await gtfsToGeoJSON({
//             //     ...req.config,
//             //     outputType: 'agency',
//             //     outputFormat: 'lines'
//             // });
//             // res.json(test);
//         } else {
//             res.json(getRoutes(route_id ? {
//                 agency_id: `${agency_id}_${agency_id}`,
//                 route_id: `${route_id}`
//             } : { agency_id: `${agency_id}_${agency_id}` }))
//         }
//     } catch (e) {
//         if (isError(e))
//             next(new ServerError(e.message));
//         else {
//             console.error(e);
//             next(new ServerError());
//         }
//     }
// });


export default AgencyRouter;