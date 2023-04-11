const { join } = require('path');
const { writeFile } = require('fs/promises');
require('dotenv').config();

if (!process.env.API_KEY) {
    console.log('No API key!');
    process.exit(0);
}

const updater = async () => {
    console.log('Updating vehicle positions');
    const rtBufferVehicles = await fetch(`http://api.511.org/Transit/VehiclePositions?agency=SF&api_key=${process.env.API_KEY}`).then(res => res.arrayBuffer());
    await writeFile(join(process.cwd(), 'feeds', `SF.rtVehicle`), Buffer.from(rtBufferVehicles));

    console.log('Updating trips');
    const rtBufferTripUpdates = await fetch(`http://api.511.org/Transit/TripUpdates?agency=SF&api_key=${process.env.API_KEY}`).then(res => res.arrayBuffer());
    await writeFile(join(process.cwd(), 'feeds', `SF.rtTripUpdates`), Buffer.from(rtBufferTripUpdates));

    console.log('Updates complete at ' + new Date().toLocaleString('en-US'));
}

updater();
setInterval(updater, 120000);