module.exports = {
  content: [
    "./index.html",
    "./script.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', "sans-serif"]
      },
      animation: {
        jelly: "jelly 0.5s",
        blob: "blob 6s infinite alternate",
        bounce: "bounce 1s infinite",
        fadeInUp: "fadeInUp 0.3s ease-out forwards"
      },
      keyframes: {
        jelly: {
          "0%, 100%": { transform: "scale(1, 1)" },
          "25%": { transform: "scale(0.9, 1.1)" },
          "50%": { transform: "scale(1.1, 0.9)" },
          "75%": { transform: "scale(0.95, 1.05)" }
        },
        blob: {
          "0%": { borderRadius: "50% 50% 48% 48% / 50% 50% 50% 50%" },
          "33%": { borderRadius: "48% 52% 50% 46% / 52% 48% 52% 48%" },
          "66%": { borderRadius: "52% 48% 46% 50% / 48% 52% 48% 52%" },
          "100%": { borderRadius: "50% 50% 48% 48% / 50% 50% 50% 50%" }
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  }
};
