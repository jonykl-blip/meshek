import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactPlugin from "eslint-plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.tsx"],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      "react/jsx-no-literals": [
        "warn",
        {
          noStrings: true,
          allowedStrings: [],
          ignoreProps: true,
        },
      ],
    },
  },
];

export default eslintConfig;
