import path from "node:path";

import preact from "@preact/preset-vite";
import webExtension from "@samrum/vite-plugin-web-extension";
import { defineConfig, loadEnv } from "vite";

import { getManifest } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const manifest = getManifest(Number(env.MANIFEST_VERSION) || 3);
	if (command === "serve") {
		// The HMR loader uses extension APIs unavailable in the page world.
		manifest.content_scripts = manifest.content_scripts?.filter(
			(script) => !("world" in script && script.world === "MAIN"),
		);
	}

	return {
		define:
			mode === "test"
				? {}
				: {
						"import.meta.env.VITE_MANIFEST_VERSION": JSON.stringify(
							String(manifest.manifest_version),
						),
					},
		build: {
			target: ["chrome89", "firefox89"],
		},
		plugins: [
			preact(),
			webExtension({
				manifest,
				additionalInputs: {
					html:
						manifest.manifest_version === 3
							? [
									{
										fileName: "src/modules/hidden-page/offscreen.html",
										webAccessible: false,
									},
								]
							: [],
				},
			}),
		],
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "./src"),
			},
		},
	};
});
