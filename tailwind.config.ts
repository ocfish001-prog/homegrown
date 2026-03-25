import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sage: {
          DEFAULT: "#7D9B76",
          light: "#A8C4A2",
          dark: "#5C7A56",
        },
        mauve: {
          DEFAULT: "#9B7D8A",
          light: "#BF9CB1",
        },
        stone: {
          DEFAULT: "#8C8070",
        },
        cream: {
          DEFAULT: "#F5F0E8",
        },
        bark: {
          DEFAULT: "#4A3728",
        },
        sky: {
          DEFAULT: "#7BA3C0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
