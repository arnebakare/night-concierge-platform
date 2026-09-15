import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // Existing client components predate React Compiler lint rules. Keep the
    // established runtime behavior while retaining the rest of Next's checks.
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off"
    }
  },
  globalIgnores([".next/**", ".next-stale-*/**", "node_modules/**", "next-env.d.ts"])
]);
