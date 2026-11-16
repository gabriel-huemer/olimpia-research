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
        oto: {
          navy: "#172554",
          sidebar: "#192857",
          sidebarHover: "#23366e",
          teal: "#008767",
          tealDark: "#006e54",
          tealLight: "#e6f5f1",
          bg: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
