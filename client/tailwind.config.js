/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nxt: {
                    bg: "#030712",       // Deepest Black/Blue
                    card: "#111827",     // Slightly lighter for cards
                    accent: "#3b82f6",   // Electric Blue
                    purple: "#8b5cf6",   // Neon Purple
                    success: "#10b981",  // Emerald Green
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // We will add this font next
            },
            animation: {
                'blob': 'blob 7s infinite',
            },
            keyframes: {
                blob: {
                    "0%": { transform: "translate(0px, 0px) scale(1)" },
                    "33%": { transform: "translate(30px, -50px) scale(1.1)" },
                    "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
                    "100%": { transform: "translate(0px, 0px) scale(1)" },
                },
            },
        },
    },
    plugins: [],
}