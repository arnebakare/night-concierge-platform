import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        champagne: {
          50: "#fff8e6",
          100: "#f6e8ba",
          300: "#d8b764",
          500: "#b99138",
          700: "#7a5b20"
        },
        ink: {
          900: "#09090b",
          800: "#111113",
          700: "#19171c",
          600: "#24212a"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(216, 183, 100, 0.16)",
        panel: "0 18px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: [animate]
};

export default config;
