export type CityPoint = {
	name: string;
	lat: number;
	lon: number;
	count?: number; // optional number of shows
};

export type MapOpts = {
	containerId?: string;
	initialZoom?: number;
	initialCenter?: [number, number];
};
