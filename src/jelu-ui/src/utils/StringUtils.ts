import { ReadingEventType } from "../model/ReadingEvent";

export class StringUtils {

    public static isNotBlank(param: string|null|undefined): boolean {
        return !this.isBlank(param)
    }

    public static isBlank(param: string|null|undefined): boolean {
        if (param !== undefined && param !== null && param.trim().length > 0) {
            return false;
        }
        return true;
    }

    public static readingEventTypeForValue(val: string): ReadingEventType {
        return ReadingEventType[val as keyof typeof ReadingEventType];
    }

    /**
     * Returns the thumbnail URL for a given image filename and variant.
     * Example: imageName("cover.jpg", "card") → "cover-card.jpg"
     */
    public static thumbnailUrl(image: string|null|undefined, variant: "card" | "thumb"): string|null {
        if (!image) return null
        const dot = image.lastIndexOf(".")
        if (dot === -1) return null
        const name = image.substring(0, dot)
        const ext = image.substring(dot)
        return `/files/${name}-${variant}${ext}`
    }
}
