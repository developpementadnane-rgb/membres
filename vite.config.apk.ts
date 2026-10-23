import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Dedicated build config for the Capacitor Android app.
//
// Differences from vite.config.ts (the Netlify web build):
//  - base: "./"  -> asset URLs are relative, required because the app is
//    loaded from a local capacitor://localhost / file:// origin, not from
//    a web server root.
//  - outDir: "dist/apk" -> kept separate from dist/spa so a web build and
//    an APK build never clobber each other's output.
//  - No expressPlugin: the APK ships no backend; every /api/* call is
//    prefixed with VITE_API_BASE_URL (see client/lib/api-config.ts) and
//    goes straight to the deployed Netlify site.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist/apk",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
