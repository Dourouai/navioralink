import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", ".vercel/**", "coverage/**", "dist/**", "node_modules/**"],
  },
  ...nextVitals,
  ...nextTypeScript,
];

export default config;
