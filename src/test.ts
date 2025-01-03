/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from "dotenv";
import { Logger } from "./Logger";
import { SimpleImageWriter } from "./SimpleImageWriter";
import { Kache } from "./Kache";
import { SunBuilder as SunBuilder } from "./SunBuilder";

async function run() {
    dotenv.config();  // Load var from .env into the environment

    const logger: Logger = new Logger("sun-builder", "verbose");
    const cache: Kache = new Kache(logger, "sun-cache.json"); 
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "images");
    const sunBuilder: SunBuilder = new SunBuilder(logger, cache, simpleImageWriter);

    const IPGEOLOACATION_API_KEY: string | undefined = process.env.IPGEOLOACATION_API_KEY;
    const timeZone = "America/New_York";

    if (IPGEOLOACATION_API_KEY === undefined) {
        logger.error("No url specified in env IPGEOLOACATION_API_KEY");
        process.exit(1);
    }
   
    let success = true;
    success = success && await sunBuilder.CreateImages("Onset, MA", "OnsetSun.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, timeZone, "");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun01.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-01-14");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun02.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-02-15");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun03.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-03-16");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun04.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-04-17");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun05.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-05-18");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun06.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-06-19");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun07.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-07-20");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun08.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-08-21");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun09.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-09-22");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun10.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-10-23");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun11.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-11-24");
    // success = success && await SunBuilder.CreateImages("Onset, MA", "OnsetSun12.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-12-25");

    // Sunrise before 6AM, sunset after 6PM
    success = success && await sunBuilder.CreateImages("Onset, MA", "OnsetSun-June.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, timeZone, "2021-06-21");

    // Sunrise after 6AM and sunset before 6PM
    success = success && await sunBuilder.CreateImages("Onset, MA", "OnsetSun-dec.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, timeZone, "2021-12-21");

    // Sunset before 6PM, twilight after 6PM
    success = success && await sunBuilder.CreateImages("Onset, MA", "OnsetSun-sep.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, timeZone, "2021-09-01");

    // Sunrise after 6AM, twilight before 6AM
    success = success && await sunBuilder.CreateImages("Onset, MA", "OnsetSun-mar.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, timeZone, "2021-03-08");

    logger.info(`test.ts: Done: ${success ? "successfully" : "failed"}`); 

    return success ? 0 : 1;
}

run();