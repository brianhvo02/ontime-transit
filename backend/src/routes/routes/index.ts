import { Request, Router } from 'express';
import { ServerError, UnprocessableEntity, isError } from '../../errors.js';
import { getAgencies, getRoutes, getShapes } from 'gtfs';


const RouteRouter = Router();

RouteRouter.get('/:routeId', async (req: Request<{ routeId: string }>, res, next) => {
    const { routeId } = req.params;

    try {
        const routes = getRoutes({
            route_id: routeId
        });
        
        if (routes.length) {
            res.json(routes[0]);
        } else {
            throw new UnprocessableEntity('Route not found.');
        }
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});


RouteRouter.get('/:routeId/shapes', async (req: Request<{ routeId: string }>, res, next) => {
    const { routeId } = req.params;

    try {
        res.json(getShapes({
            route_id: routeId,
        }))
    } catch (e) {
        if (isError(e))
            next(new ServerError(e.message));
        else {
            console.error(e);
            next(new ServerError());
        }
    }
});

export default RouteRouter;