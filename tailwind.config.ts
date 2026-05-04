import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#fbfaf7",
        signal: "#f5d547",
        proof: "#42d392",
        danger: "#ff6b6b"
      },
      boxShadow: {
        block: "7px 7px 0 #111827",
        blockLg: "10px 10px 0 #111827"
      }
    }
  },
  plugins: []
};

export default config;
