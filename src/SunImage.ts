/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";

import { SunData, SunJson } from "./SunData";
import { LoggerInterface } from "./Logger";
import { KacheInterface} from "./Kache";

import moment from "moment-timezone";  // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/

export interface ImageResult {
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export interface ImageBuffer {
    width: number;
    height: number;
    data: Uint8Array;
}

export class SunImage {
    private cache: KacheInterface;
    private logger: LoggerInterface;

    /**
     * Constructor for SunImage
     * @param logger Object that implements the LoggerInterface
     * @param cache Object that implements to KacheInterface
     */
    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    /**
     * This optimized fillRect was derived from the pureimage source code: https://github.com/joshmarinacci/node-pureimage/tree/master/src
     * To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
     * @param img Target image to draw on
     * @param x Position of the rect X
     * @param y Position of the rect Y
     * @param w Width of the rect
     * @param h Hieght of the rect
     * @param rgb Color in the form "#rrggbb"
     */
    // xeslint-disable-next-line @typescript-eslint/no-explicit-any
    private myFillRect(img: ImageBuffer, x: number, y: number, w: number, h: number, rgb: string) {
        const colorValue = parseInt(rgb.substring(1), 16);

        // the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
        //colorValue = colorValue >>> 0;
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8)  & 0xFF;  
        const b = (colorValue)        & 0xFF;
        const a = 0xFF;

        for(let i = y; i < y + h; i++) {                
            for(let j = x; j < x + w; j++) {   
                const index = (i * img.width + j) * 4;   
                
                img.data[index + 0] = r;
                img.data[index + 1] = g;     
                img.data[index + 2] = b;     
                img.data[index + 3] = a; 
            }
        }
    }

    /**
     * Gets data from SunData and generates an HD image with the sun and moon rise and set 
     * @param location Location name for the title (e.g.: "Boston, MA")
     * @param lat Lattitude in decimal degrees north
     * @param lon Longitude in decimal degrees east (negative for west)
     * @param apiKey API key for https://api.ipgeolocation.io
     * @param timeZone Time zone (e.g.: "America/New_York")
     * @param dateStr Optional dataString in "YYYY-MM-DD" format
     * @returns ImageResult or null
     */
    public async getImage(location: string, lat: string, lon: string, apiKey: string, timeZone: string, dateStr = "") : Promise<ImageResult | null> {        
        const sunData: SunData = new SunData(this.logger, this.cache);

        const SunJson: SunJson | null = await sunData.getSunData(lat, lon, apiKey, timeZone, dateStr);

        if (SunJson === null) {
            return null;
        }

        // Fix up the data
        SunJson.firstLight = this.getTwilight(SunJson?.sunrise, "am");
        SunJson.lastLight  = this.getTwilight(SunJson?.sunset,  "pm");

        if (SunJson.moonrise === "-:-") // No moonrise this day.  Use AM midnight
            SunJson.moonrise = "0:0";
        if (SunJson.moonset === "-:-")  // No moonset this day. Use PM midnight
            SunJson.moonset = "23:59";

        const twilightDegrees          = 24;     // 24 degrees before sunrise and 24 degrees after sunset
        const twilightMinutes          = 24 * 4; // 4 minutes per degree (96 minutes)

        const title           = `Sunrise and Sunset for ${location}`;

        const now: moment.Moment = moment();
        const dateDisplayStr = now.tz(timeZone).format("MMM D, YYYY, h:mm A");

        // Define layout constants
        const imageHeight              = 1080; 
        const imageWidth               = 1920; 

        const centerX                  = imageWidth/2;
        const centerY                  = imageHeight/2 + 40;     // leave some extra room at the top for the title
        const sunCircleRadius          = 380; //imageHeight/3;          //360
        const sunArcWidth              = 70;
        const sunRadius                = 70;                     // The actual sun drawn on the circle

        const backgroundColor          = "#FFFFFA";              // format needed by myFillRect
        const circleColor              = "#B0B0B0";
        const timeLabelColor           = "#B0B0B0"; 
        const tickColor                = "#B0B0B0";
        const sunCircleColor           = "#504773"; //"#303050";
        const sunArcColor              = "#E0D000"; // "#FCD303";
        const sunUpColor               = "#FFE000";
        const sunDownColor             = "#D1AF02";
        const solidTwilightArcColor    = "#d45b0b";
        const titleColor               = "#2020F0"; 
        const labelColor               = "#2020F0";
        
        // Approximation of the height of a capital letter
        const largeFontCharHeight       = 72;
        const mediumFontCharHeight      = 60;
        const smallFontCharHeight       = 40;
        const xsmallFontCharHeight      = 22;

        const largeFont                 = "72px 'OpenSans-Bold'";     // Title
        const mediumFont                = "60px 'OpenSans-Regular";   // Other text
        const smallFont                 = "40px 'OpenSans-Regular'";  // Note at the bottom
        const extraSmallFont            = "22px 'OpenSans-Regular'";  // Note at the bottom

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");
        
        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const titleY                    = 90; // down from the top of the image
        const dateX                     = imageWidth * 11/16;
        const dateY                     = imageHeight - 20;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        // Extend ctx with function to dray centered text
        ctx.centerText = function(text: string, x: number, y: number): void {
            const width = this.measureText(text).width;
            this.fillText(text, x - width/2, y);
        };

        // Fill the background
        ctx.fillStyle = backgroundColor;
        //ctx.fillRect(0, 0, imageWidth, imageHeight);
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, backgroundColor);

        // Draw the title
        ctx.fillStyle = titleColor;
        ctx.font = largeFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, titleY);

        // Change our reference to the center of the circle
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Draw the minor tick marks on the hour
        ctx.lineCap = "round";
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 360; i += 15) {
            ctx.rotate(15 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunCircleRadius - 25, 0);
            ctx.lineTo(sunCircleRadius + 25, 0);
            ctx.stroke();
        }

        // Draw the major tick marks
        ctx.lineWidth = 8;
        for (let i = 0; i < 360; i += 90) {
            ctx.rotate(90 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunCircleRadius - 40, 0);
            ctx.lineTo(sunCircleRadius + 45, 0);
            ctx.stroke();
        }

        ctx.restore();

        // eslint-disable-next-line quotes
        this.logger.info(`SunImage: Draw test circle at 200, 200, 100, 0, 2 * Math.PI`);
        ctx.strokeStyle = circleColor;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 380, 0, 2 * Math.PI); 
        ctx.fillStyle = "red";
        ctx.stroke;
        // eslint-disable-next-line quotes
        this.logger.info(`SunImage: Draw test circle at 200, 200, 100, 0, 2 * Math.PI - Done`);


        // Draw the path circle for the sun
        ctx.strokeStyle = sunCircleColor;
        ctx.lineWidth = sunArcWidth -4; // Slightly smaller.  We will draw over this and we don't want any edges showing
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw the major time labels
        ctx.font = smallFont;
        ctx.fillStyle = timeLabelColor; //titleColor;
        ctx.fillText("12 PM", centerX - (ctx.measureText("12 PM").width/2),                  centerY - (sunCircleRadius                       + 50));
        ctx.fillText("12 AM", centerX - (ctx.measureText("12 AM").width/2),                  centerY + (sunCircleRadius + smallFontCharHeight + 50));
        ctx.fillText("6 AM",  centerX - (sunCircleRadius  + (ctx.measureText("6 AM").width) + 60), centerY + (smallFontCharHeight/2));
        ctx.fillText("6 PM",  centerX + (sunCircleRadius  +                                 + 60), centerY + (smallFontCharHeight/2));

        // SunJson
        //     "sunrise": "06:20",
        //     "sunset": "19:04",
        //
        // There is always a sunrise and a sunset at the supported latitudes
        const sunriseAngle    = this.getAngle(SunJson.sunrise);
        const sunsetAngle     = this.getAngle(SunJson.sunset);
        const amTwilightAngle = sunriseAngle - twilightDegrees;
        const pmTwilightAngle = sunsetAngle + twilightDegrees;

        // Current time format is "08:21:14.988" but getAngle only uses hh & mm so secs and msecs are ignored
        const currentTimeAngle = this.getAngle(SunJson.current_time); 

        // Draw the sun up arc
        ctx.lineWidth = sunArcWidth;
        ctx.strokeStyle = sunArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(sunriseAngle), this.getRenderAngle(sunsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();
        
        // Draw the AM twilight range using a gradient
        const sunriseX    = sunCircleRadius * Math.sin(this.getRenderAngle(sunriseAngle + 90)); 
        const sunriseY    = sunCircleRadius * Math.cos(this.getRenderAngle(sunriseAngle + 90));
        const amTwilightX = sunCircleRadius * Math.sin(this.getRenderAngle(amTwilightAngle + 90));
        const amTwilightY = sunCircleRadius * Math.cos(this.getRenderAngle(amTwilightAngle + 90));

        // // Setup the AM gradient
        // const amGrad = ctx.createLinearGradient(centerX + sunriseX, centerY - sunriseY, centerX + amTwilightX, centerY - amTwilightY);
        // amGrad.addColorStop(0.0, sunTwilightArcColor1);
        // amGrad.addColorStop(1.0, sunTwilightArcColor3);
        // ctx.strokeStyle = amGrad;
        // ctx.lineWidth = sunArcWidth;
        // // ctx.beginPath();
        // // ctx.moveTo(centerX + sunriseX, centerY - sunriseY);
        // // ctx.lineTo(centerX + amTwilightX, centerY - amTwilightY);
        // // ctx.stroke();

        // Draw the AM twilight arc
        ctx.strokeStyle = solidTwilightArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(amTwilightAngle), this.getRenderAngle(sunriseAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a line at sunrise
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunriseAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 80, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunriseAngle));
        ctx.restore();

        // Draw a line at AM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(amTwilightAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 80, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(amTwilightAngle));
        ctx.restore();

        // Draw the evening twilight arc
        const sunsetX     = sunCircleRadius * Math.sin(this.getRenderAngle(sunsetAngle + 90)); 
        const sunsetY     = sunCircleRadius * Math.cos(this.getRenderAngle(sunsetAngle + 90));
        const pmTwilightX = sunCircleRadius * Math.sin(this.getRenderAngle(pmTwilightAngle + 90));
        const pmTwilightY = sunCircleRadius * Math.cos(this.getRenderAngle(pmTwilightAngle + 90));

        // // Setup the pm gradient
        // const pmGrad = ctx.createLinearGradient(centerX + sunsetX, centerY - sunsetY, centerX + pmTwilightX, centerY - pmTwilightY);
        // pmGrad.addColorStop(0.0, sunTwilightArcColor1);
        // pmGrad.addColorStop(1.0, sunTwilightArcColor3);
        // ctx.strokeStyle = pmGrad;

        // Draw PM twilight arc
        ctx.strokeStyle = solidTwilightArcColor;
        ctx.beginPath();
        ctx.lineWidth = sunArcWidth;
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(sunsetAngle), this.getRenderAngle(pmTwilightAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a long tick mark at sunset
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunsetAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 80, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunsetAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw a long tick mark at PM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(pmTwilightAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 80, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(pmTwilightAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw the sun on the arc
        // Translate
        ctx.save();
        ctx.translate(centerX, centerY);            // Set the origin to the center
        ctx.rotate(this.getRenderAngle(currentTimeAngle));               // Rotate our reference so the current time is on the X axis

        // Clear a background circle 
        ctx.beginPath();
        ctx.fillStyle = backgroundColor;
        ctx.arc(sunCircleRadius, 0, sunRadius + 5, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        ctx.fill();

        // Draw a circle in the arc color
        ctx.beginPath();
        ctx.fillStyle = sunArcColor;
        ctx.arc(sunCircleRadius, 0, sunRadius, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        // Draw a circle inside in the brighter (daytime) color
        ctx.beginPath();
        ctx.fillStyle = (currentTimeAngle > sunriseAngle && currentTimeAngle < sunsetAngle) ? sunUpColor : sunDownColor;
        ctx.arc(sunCircleRadius, 0, sunRadius - 3, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        ctx.rotate(-this.getRenderAngle(currentTimeAngle));
        ctx.restore();        

        // Draw the labels for sunrise, sunset, first light, last light
        
        // +---------+--------+
        // | slot 0  | slot 4 |
        // | slot 1  | slot 5 |
        // +---------+--------+
        // | slot 2  | slot 6 |
        // | slot 3  | slot 7 |
        // |         | slot 8 | - We need this for mid summer when the sun does not set until 8:30
        // +---------+--------+
        
        type Point = {x: number, y: number};
        const labelSlotsOrig: Array<Point> = [ 
            {x: 350, y: 350},
            {x: 300, y: 470},
            {x: 300, y: 680},
            {x: 350, y: 800},
            {x: 1400, y: 350},
            {x: 1450, y: 470},
            {x: 1450, y: 680},
            {x: 1400, y: 800},
            {x: 1350, y: 920}
        ];

        const labelSlotsOrig2: Array<Point> = [ 
            {x: 420, y: 350},
            {x: 370, y: 470},
            {x: 370, y: 680},
            {x: 420, y: 800},
            {x: 1470, y: 350},
            {x: 1520, y: 470},
            {x: 1520, y: 680},
            {x: 1470, y: 800},
            {x: 1420, y: 920}
        ];

        const labelSlots: Array<Point> = [ 
            {x: 400, y: 330},
            {x: 350, y: 450},
            {x: 350, y: 700},
            {x: 400, y: 820},
            {x: 1490, y: 330},
            {x: 1540, y: 450},
            {x: 1540, y: 700},
            {x: 1490, y: 820},
            {x: 1440, y: 940}
        ];

        // sunriseAngle is 0-360.  0 is midnight, 180 is noon...
        let sunriseXY: Point;
        let amTwilightXY: Point;
        let sunsetXY: Point;
        let pmTwilightXY: Point;

        if (sunriseAngle <= 90) {
            // both sunrise and AM twilight are before 6:00AM
            sunriseXY    = labelSlots[2];
            amTwilightXY = labelSlots[3];
        } else if (sunriseAngle < 90 + twilightDegrees) {
            // sunrise is after 6:00 AM, but AM twilight is before 6:00 AM
            sunriseXY    = labelSlots[1];
            amTwilightXY = labelSlots[2];
        } else {
            // both sunrise and AM twilight are after 6:00 AM
            sunriseXY    = labelSlots[0];
            amTwilightXY = labelSlots[1];
        }

        if (sunsetAngle <= 270 - twilightDegrees) {
            // both sunset and PM twilight are before 6:00 PM
            sunsetXY     = labelSlots[4];
            pmTwilightXY = labelSlots[5];
        } else if (sunsetAngle < 270) {
            // sunset is before 6:00 PM but PM twilight is after 6:00 PM
            sunsetXY     = labelSlots[5];
            pmTwilightXY = labelSlots[6];
        } else if (sunsetAngle <= 270 + 20) {
            // both sunset and PM twilight are somewhat after 6:00 PM
            sunsetXY     = labelSlots[6];
            pmTwilightXY = labelSlots[7];
        } else {
            // both sunset and PM twilight are way past 6:00 PM
            sunsetXY     = labelSlots[7];
            pmTwilightXY = labelSlots[8];
        }

        ctx.font = mediumFont;
        ctx.fillStyle = labelColor;

        ctx.centerText("Sunrise",                                sunriseXY.x, sunriseXY.y); 
        ctx.centerText(`${this.formatTime(SunJson.sunrise)}`,    sunriseXY.x, sunriseXY.y + mediumFontCharHeight);
        ctx.centerText("Sunset " ,                               sunsetXY.x,  sunsetXY.y);
        ctx.centerText(`${this.formatTime(SunJson.sunset)}` ,    sunsetXY.x,  sunsetXY.y + mediumFontCharHeight);

        ctx.centerText("First light",                            amTwilightXY.x, amTwilightXY.y);
        ctx.centerText(`${this.formatTime(SunJson.firstLight)}`, amTwilightXY.x, amTwilightXY.y + mediumFontCharHeight);
        ctx.centerText("Last light" ,                            pmTwilightXY.x, pmTwilightXY.y);
        ctx.centerText(`${this.formatTime(SunJson.lastLight)}` , pmTwilightXY.x, pmTwilightXY.y + mediumFontCharHeight);

        // ctx.font = mediumFont;
        // ctx.fillStyle = moonLabelColor;
        // ctx.centerText("Moon",                                                                                centerX, centerY - 40);
        // ctx.centerText(SunJson.lunarPhase,                                                                centerX, centerY + 20);
        // ctx.centerText(SunJson.lunarIllumination + (SunJson.lunarWaxWane === "waxing" ? " +" : " -"), centerX, centerY + 80);

        // Draw the date in the lower right
        ctx.fillStyle = titleColor;
        ctx.font = smallFont;
        ctx.fillText(dateDisplayStr, dateX, dateY);

        const jpegImg = jpeg.encode(img, 80);
        
        return {
            imageData: jpegImg,
            imageType: "jpg"
        };
    }

    /**
     * Takes the time ("hh:mm") and converts to degrees (0-359).  Every minute is 4 degrees
     * @param timeStr (hh:mm or hh:mm:ss)
     * @returns value in degrees 00:00 returns 0, 23:59 returns 359
     */
    private getAngle(timeStr: string): number {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunImage: getAngle() failed on input "${timeStr}"`);
            return 0;
        }
        const angle = +timeElements[0] * 15 + +timeElements[1] / 4;
        
        return angle;
    }
    
    /**
     * Coverts an angle where 0 is striaght up, 180 is straight down to a rotation (clockwise)
     * in radians from the X axis.  Used to calculate the angle needed in the arc().
     *   Step 1 - CTX reference is offset 90 degrees (along the x axis), so subtract 90
     *   Step 2 - take the modulus 360 so the result is 0-359
     *   Step 3 - Convert to radians
     * @param timeAngle angle in degrees 0-360
     * @returns rotation in radions from the X axis clockwise
     */
    private getRenderAngle(timeAngle: number): number {        
        let renderAngle = timeAngle + 180 - 90;
        renderAngle = renderAngle % 360;
        renderAngle = renderAngle * Math.PI/180;
        return renderAngle;
    }

    /**
     * Formats the time for display.  For "22:45" returns "10:45 PM"
     * @param timeStr time in 24 hour format (hh:mm or hh:mm:ss, hh:mm:ss:nnn)
     * @returns Formatted string in 12 hour time with AM/PM 
     */
    private formatTime(timeStr: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunImage: formatTime() failed on input "${timeStr}`);
            return "";
        }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        const min = +timeElements[1];

        //const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        const amPmStr = (+timeElements[0] > 11) ? "PM" : "AM";
        return `${hour}:${minStr} ${amPmStr}`;
    }

    /**
     * Calculates a time 90 minutes earlier/later than the time given.
     * @param timeStr Time in "hh:mm" (24 hour) format
     * @param amPm If "am", subtrack 90 minutes.  If "pm", add 90 minutes
     * @returns Time in "hh:mm" format
     */
    private getTwilight(timeStr: string, amPm: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunImage: getTwilight() failed on input "${timeStr}`);
            return "";
        }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        let min = +timeElements[1];

        
        if (amPm === "am") {
            // subtract 96 minutes (24 degrees)
            if (min >= 36) {
                min -= 36;
                hour -= 1;
            } else {
                min += 24;
                hour -= 2;
            }
        } else {
            // add 90 minutes (24 degrees)
            if (min < 36) {
                min += 24;
                hour += 1;
            } else {
                min -= 36;
                hour += 2;
            }
        }

        const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        return `${hourStr}:${minStr}`;
    }
}
