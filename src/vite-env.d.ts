/// <reference types="vite/client" />
/// <reference types="@samrum/vite-plugin-web-extension/client" />

declare module "*.csv?raw" {
	const src: string;
	export default src;
}

declare module "*.html?raw" {
	const src: string;
	export default src;
}
