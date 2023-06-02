import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { __dirname } from "./utils.js";
import net from 'net';
config();

// work around a node v20 bug: https://github.com/nodejs/node/issues/47822#issuecomment-1564708870
// if (net.setDefaultAutoSelectFamily) {
//   net.setDefaultAutoSelectFamily(false);
// }

const gtfsConfig = JSON.parse(
    readFileSync(join(__dirname, '../gtfsConfig.json'), 'utf-8')
);

const PORT = process.env.PORT,
    BING_MAPS_KEY = process.env.BING_MAPS_KEY;

export {
    PORT, BING_MAPS_KEY, gtfsConfig
}