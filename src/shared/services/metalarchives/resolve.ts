import { isDefined } from "~/shared/utils/types";
import { fetch } from "~/shared/utils/fetch";

import type { DiscSize, ReleaseAttribute, ReleaseFormat, ReleaseType, ResolveData, ResolveFunction } from "../types";
import { getReleaseType } from "~/shared/utils/music";

const MONTH_NAMES: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
};

const parseMonthName = (month: string): number | undefined => {
    return MONTH_NAMES[month.toLowerCase()];
};

const normalizeOrdinalDay = (day: string): string =>
    day.replace(/(st|nd|rd|th)$/i, "");

const stringToDate = (dateString: string) => {
    const value = dateString.trim();

    const fullMatch = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})$/i);
    if (fullMatch) {
        return {
            year: Number.parseInt(fullMatch[3], 10),
            month: parseMonthName(fullMatch[1]),
            day: Number.parseInt(normalizeOrdinalDay(fullMatch[2]), 10),
        };
    }

    const monthYearMatch = value.match(/^([A-Za-z]+)\s+(\d{4})$/i);
    if (monthYearMatch) {
        return {
            year: Number.parseInt(monthYearMatch[2], 10),
            month: parseMonthName(monthYearMatch[1]),
        };
    }

    const yearMatch = value.match(/^(\d{4})$/);
    if (yearMatch) {
        return { year: Number.parseInt(yearMatch[1], 10) };
    }

    return undefined;
};

const getTitle = (document_: Document) => {
    const titleElement = document_.querySelector("h1.album_name");
    return titleElement?.textContent?.trim();
}

const getArtists = (document_: Document) => {
    return [...document_.querySelectorAll(".band_name a")]
        .map((element) => element.textContent?.trim())
        .filter(isDefined);
}

const getCoverArt = (document_: Document) => {
    const href = document_.querySelector<HTMLLinkElement>("#cover a")?.href
    return href ? [href] : undefined;
}

const getDate = (document_: Document) => {
    const dateString = document_.querySelector("#album_info dl.float_left dd:nth-child(4)")?.textContent?.trim();
    return dateString ? stringToDate(dateString) : undefined;
}

const parseType = (document_: Document, data: ResolveData) => {
    const typeString = document_.querySelector("#album_info dl.float_left dd:nth-child(2)")?.textContent?.trim().toLowerCase();
    switch (typeString) {
        case "Full-length":
            data.type = "album";
            break;
        case "Live album":
            data.type = "album";
            data.attributes = [...(data.attributes ?? []), "live"];
            break;
        case "Demo":
            data.type = "bootleg";
            data.attributes = [...(data.attributes ?? []), "demo"];
            break;
        case "Video":
        case "Split video":
            data.type = "video";
            break;
        case "Boxed set":
            data.type = "compilation"
            data.attributes = [...(data.attributes ?? []), "box set"];
            break;
        case "Split":
            data.type = data.tracks ? getReleaseType(data.tracks.length) : undefined;
            break;
        default:
            data.type = typeString?.toLowerCase() as ReleaseType | undefined;
            break;
    }

    return data;
}

const parseFormat = (document_: Document, data: ResolveData) => {
    const vinylRegex = /^(?:(\d+)\s+)?(?:(\d+(?:\.\d+)?)"\s*)?vinyls?\b(?:\s*\(\s*(\d+(?:\s*(?:⅓|⅔|1\/3))?)\s*RPM\s*\))?$/i;
    const formatString = document_.querySelector("#album_info dl.float_right dd:nth-child(4)")?.textContent?.trim().toLowerCase();
    const leadingFormat = formatString?.split("+").map(part => part.trim())[0];
    if (/\d*CD/.test(leadingFormat ?? "")) {
        data.format = "cd";
    } else if (/\d*DVD/.test(leadingFormat ?? "")) {
        data.format = "dvd";
    } else if (/\d*\s?[Bb]lu-rays?/.test(leadingFormat ?? "")) {
        data.format = "blu-ray";
    } else if (vinylRegex.test(leadingFormat ?? "")) {
        data.format = "vinyl";
        const match = leadingFormat?.match(vinylRegex);

        const discSize = match?.[2];
        switch (discSize) {
            case '16"':
            case '12"':
            case '11"':
            case '10"':
            case '9"':
            case '8"':
            case '7"':
            case '6"':
            case '4"':
            case '3"':
                data.discSize = discSize as DiscSize;
                break;
            case '6½"':
            case '5½"':
            case '3½"':
            case '2"':
            case '1"':
                data.discSize = "non-standard";
                break;
        }

        const rpm = match?.[3];
        switch (rpm) {
            case '16⅔':
                data.attributes = [...(data.attributes ?? []), "16 rpm"];
                break;
            case '33⅓':
                data.attributes = [...(data.attributes ?? []), "33 rpm"];
                break;
            case '45':
                data.attributes = [...(data.attributes ?? []), "45 rpm"];
                break;
            case '78':
                data.attributes = [...(data.attributes ?? []), "78 rpm"];
                break;
            case '80':
                data.attributes = [...(data.attributes ?? []), "80 rpm"];
                break;
        }
    } else switch (leadingFormat) {
        case "Other":
            break;
        case "Digital":
            data.format = "digital file";
            break;
        default:
            data.format = leadingFormat?.toLowerCase() as ReleaseFormat | undefined;
            break;
    }

    return data;
}

const parseDescription = (document_: Document, data: ResolveData) => {
    const coloredVinylRegex = /\b(?:[A-Za-z]+(?:[ \/-][A-Za-z]+)*)\s+(?:colou?red\s+vinyl|vinyl)\b/i;
    const descriptionString = document_.querySelector("#album_info dl.float_left dd:nth-child(8)")?.textContent?.trim();
    const descriptionParts = descriptionString?.split(",").map(part => part.trim().toLowerCase()) ?? [];
    descriptionParts.forEach(part => {
        if (/\d* colors( vinyl)?/.test(part) || coloredVinylRegex.test(part) || part === "Coloured") {
            data.attributes = [...(data.attributes ?? []), "colored vinyl"];
        } else switch (part) {
            case "180g":
                data.attributes = [...(data.attributes ?? []), "180 gram"];
                break;
            case "8-track cartridge":
                data.format = "8 track";
                break;
            case "Bandcamp":
            case "iTunes":
                data.format = "lossless digital";
                data.attributes = [...(data.attributes ?? []), "downloadable", "streaming"];
                break;
            case "Box set":
            case "Boxed set":
                data.attributes = [...(data.attributes ?? []), "box set"];
                break;
            case "Club edition":
                data.attributes = [...(data.attributes ?? []), "fan club release"];
                break;
            case "Deluxe edition":
            case "Deluxe Expanded Edition":
                data.attributes = [...(data.attributes ?? []), "deluxe edition"];
                break;
            case "Digipak":
                data.attributes = [...(data.attributes ?? []), "digipak"];
                break;
            case "Limited edition":
                data.attributes = [...(data.attributes ?? []), "limited edition"];
                break;
            case "Limited edition boxset":
                data.attributes = [...(data.attributes ?? []), "box set", "limited edition"];
                break;
            case "Gatefold":
                data.attributes = [...(data.attributes ?? []), "gatefold"];
                break;
            case "Picture disc":
                data.attributes = [...(data.attributes ?? []), "picture disc"];
                break;
            case "Quadraphonic":
                data.attributes = [...(data.attributes ?? []), "quadraphonic"];
                break;
            case "Reel-to-reel":
                data.format = "reel-to-reel";
                break;
            case "Remastered":
                data.attributes = [...(data.attributes ?? []), "remastered"];
                break;
            case "Replica LP":
            case "Mini-LP":
                data.attributes = [...(data.attributes ?? []), "cd sized album replica"];
                break;
            case "SHM-CD":
                data.attributes = [...(data.attributes ?? []), "shm"];
                break;
            case "Slipcase":
                data.attributes = [...(data.attributes ?? []), "slipcase/o-card"];
                break;
            case "Super Audio CD":
                data.format = "sacd";
                break;
        }
    })

    return data;
}

const getLabel = (document_: Document) => {
    const labelString = document_.querySelector("#album_info dl.float_right dd:nth-child(2)")?.textContent?.trim();
    const catalogIdString = document_.querySelector("#album_info dl.float_left dd:nth-child(6)")?.textContent?.trim();
    return {
        name: labelString,
        catno: catalogIdString,
    }
}

const getTracks = (document_: Document) => {
    
    return [];
}

export const resolve: ResolveFunction = async (url) => {
    const response = await fetch({ url });
    const document_ = new DOMParser().parseFromString(response, "text/html");

    const title = getTitle(document_);
    const artists = getArtists(document_);
    const date = getDate(document_);
    const coverArt = getCoverArt(document_);
    const label = getLabel(document_);
    const tracks = getTracks(document_);

    let data = {
        url,
        title,
        artists,
        date,
        tracks,
        coverArt
    } as ResolveData;

    data = parseType(document_, data);
    data = parseFormat(document_, data);
    data = parseDescription(document_, data);

    return data;
}
