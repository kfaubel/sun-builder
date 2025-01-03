/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { SunImage } from "./SunImage";

export class SunBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
    }

    public async CreateImages(location: string, fileName: string, lat: string, lon: string, apiKey: string, timeZone: string, dateStr:string): Promise<boolean>{
        try {
            const weatherImage: SunImage = new SunImage(this.logger, this.cache);

            const result = await weatherImage.getImage(location, lat, lon, apiKey, timeZone, dateStr);

            if (result !== null && result.imageData !== null ) {
                this.logger.info(`SunBuilder CreateImages: Writing: ${fileName}`);
                this.writer.saveFile(fileName, result.imageData.data);
            } else {
                this.logger.warn("SunBuilder CreateImages: No image available");
                return false;
            }
        } catch(e) {
            if (e instanceof Error) {
                this.logger.error(`SunBuilder CreateImages: ${e.stack}`);
            } else {
                this.logger.error(`SunBuilder CreateImages: Exception: ${e}`);
            }
            return false;
        }

        return true;
    }
}
