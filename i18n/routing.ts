import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "th"],
  defaultLocale: "he",
  localePrefix: "as-needed",
});
