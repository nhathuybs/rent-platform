/// <reference types="vite/client" />

// Explicitly declare Vite environment variables used by the app so
// `import.meta.env.VITE_API_BASE` is correctly typed in editors/TS.
interface ImportMetaEnv {
	readonly VITE_API_BASE?: string;
	// add other VITE_ env vars here as needed
	[key: string]: unknown;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
