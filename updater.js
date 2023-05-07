const { join } = require('path');
const { readFile, writeFile } = require('fs/promises');
require('dotenv').config();

if (!process.env.API_KEY_01) {
    console.log('No API key!');
    process.exit(0);
}

const downloadFile = async (url, filepath) => fetch(url).then(res => res.arrayBuffer()).then(buf => writeFile(filepath, Buffer.from(buf)));

(async () => {
    const agencies = await fetch(`http://api.511.org/transit/operators?api_key=${process.env.API_KEY_02}`).then(res => res.json());
    const agenciesGTFS =  await fetch(`http://api.511.org/transit/gtfsoperators?api_key=${process.env.API_KEY_02}`).then(res => res.json());
    agencies.filter(agency => agency['Id'] !== 'RG').forEach(agency => agency['GTFS'] = agenciesGTFS.find(agencyGTFS => agencyGTFS['Id'] === agency['Id']) !== undefined);

    await writeFile(join(process.cwd(), 'feeds', '_agencies.json'), JSON.stringify(agencies));
    
    for (let i = 0; i < agencies.length; i++) {
        const agency = agencies[i];
        if (agency['GTFS']) {
            const remoteChecksum = await fetch(`https://brianhvo02.github.io/ontime-transit-feeds/checksums/${agency['Id']}.checksum`).then(res => res.text());
            const localChecksum = await readFile(join(process.cwd(), 'feeds', `${agency['Id']}.checksum`), { encoding: 'utf-8' }).catch(e => e);

            if (remoteChecksum !== localChecksum) {
                console.log(`Downloading feeds for ${agency['Name']}`);
                await downloadFile(`https://brianhvo02.github.io/ontime-transit-feeds/feeds/${agency['Id']}.db`, join(process.cwd(), 'feeds', `${agency['Id']}.db`));
                await downloadFile(`https://brianhvo02.github.io/ontime-transit-feeds/geojson/${agency['Id']}/${agency['Id']}.geojson`, join(process.cwd(), 'feeds', `${agency['Id']}.geojson`));
                await downloadFile(`https://brianhvo02.github.io/ontime-transit-feeds/checksums/${agency['Id']}.checksum`, join(process.cwd(), 'feeds', `${agency['Id']}.checksum`));
            }
        }
    }

    const updater = async () => {       
        for (let i = 0; i < agencies.length; i++) { 
            const agency = agencies[i];

            if (agency['Monitored']) {
                console.log(`Updating vehicle positions for ${agency['Name']}`);
                await downloadFile(`http://api.511.org/Transit/VehiclePositions?agency=${agency['Id']}&api_key=${process.env[`API_KEY_${agency['Id']}`]}`, join(process.cwd(), 'feeds', `${agency['Id']}.rtVehicle`));

                console.log(`Updating trips for ${agency['Name']}`);
                await downloadFile(`http://api.511.org/Transit/TripUpdates?agency=${agency['Id']}&api_key=${process.env[`API_KEY_${agency['Id']}`]}`, join(process.cwd(), 'feeds', `${agency['Id']}.rtTripUpdates`));
            }
        }
        
        console.log('Updates complete at ' + new Date().toLocaleString('en-US'));
    }

    await updater();
    setInterval(updater, 120000);
})();



