import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts", "cli.ts"],
  sourcemap: true,
  clean: true,
  dts: false,
  format: ["cjs", "esm"],
  onSuccess: "tsc --emitDeclarationOnly --declaration --declarationMap",
});
