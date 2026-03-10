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
        "error",
        {
          noStrings: true,
          allowedStrings: ["×", "+", ":", "%", "/", "·", "—", "h", "Supabase"],
          ignoreProps: true,
        },
      ],
    },
  },
  {
    files: [
      "components/hero.tsx",
      "components/deploy-button.tsx",
      "components/theme-switcher.tsx",
      "components/forgot-password-form.tsx",
      "components/update-password-form.tsx",
      "components/tutorial/**",
      "components/ui/**",
    ],
    rules: {
      "react/jsx-no-literals": "off",
    },
  },
];

export default eslintConfig;
