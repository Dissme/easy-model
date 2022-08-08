import path from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import bp from "vite-plugin-babel";
const babel = bp.default;

const getPackageName = () => {
  return packageJson.name;
};

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase());
  } catch (err) {
    throw new Error("Name property in package.json is missing.");
  }
};

const fileName = {
  es: `${getPackageName()}.mjs`,
  cjs: `${getPackageName()}.cjs`,
  iife: `${getPackageName()}.iife.js`
};

export default defineConfig({
  base: "./",
  plugins: [babel()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: getPackageNameCamelCase(),
      formats: ["es", "cjs", "iife"],
      fileName: format => fileName[format]
    }
  }
});
