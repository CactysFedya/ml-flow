import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "#E6ECF5",
        input: "#E6ECF5",
        ring: "#2F6DF6",
        background: "#F6F8FC",
        foreground: "#101828",
        primary: {
          DEFAULT: "#2F6DF6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F4F7FD",
          foreground: "#344054",
        },
        muted: {
          DEFAULT: "#F8FAFD",
          foreground: "#667085",
        },
        accent: {
          DEFAULT: "#EEF4FF",
          foreground: "#2F6DF6",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#101828",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        panel: "0 12px 32px rgba(15, 23, 42, 0.04)",
        frame: "0 26px 80px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
