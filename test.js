const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { readFile } = require('fs');
const { join } = require('path');

readFile(join(process.cwd(), 'feeds', `SF.rtVehicle`), (err, buffer) => {
    const feedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    console.log(feedMessage.entity.find(e => e.id === '5725'))
});
