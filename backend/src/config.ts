import { config } from "dotenv";
config();

const PORT = process.env.PORT,
    BING_MAPS_KEY = process.env.BING_MAPS_KEY;

export {
    PORT, BING_MAPS_KEY
}