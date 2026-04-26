import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "vite.config.ts"],
					defaultProject: "./tsconfig.json",
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			"**/.DS_Store",
			"node_modules",
			"build",
			"coverage",
			"dist",
			"profiles",
			"postcss.config.cjs",
		],
	},
	{
		rules: {
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ disallowTypeAnnotations: false },
			],
		},
	},
);
