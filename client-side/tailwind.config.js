/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        13.5: "3.375rem", 
      },
      colors: {
        primary: "#4398AC", 
        secondary: "#A4CDD7",
        accent: "#002E48",
        highlight: "#FFEB3B", 
        dark: "#001621", 
        navy: "#074873",

        hover: {
          primary: "#0056b3", 
        },
        active: {
          primary: "#003d7a", 
        },
        disabled: "#C0C0C0", 

      
        neutral: {
          light: "#F5F5F5", 
          medium: "#E0E0E0", 
          dark: "#B0B0B0", 
        },
      },
      width: {
        header: "calc(100% - 6rem)",
        "header-md": "calc(100% - 6rem)",
        "header-lg": "calc(100% - 7.4rem)",
      },
      minHeight: {
        main: "calc(100vh - 100px)",
        "main-md": "calc(100vh - 72px)",
        footer: "calc(100vh - 218px)",
        'screen-half': "calc(100vh - 100px  )" // Ensure this is correctly defined
      },
      container: {
        center: true,
        screens: {
          xl: "1440px",
        },
      },
      fontFamily: {
        primary: ["Montserrat", "sans-serif"],
        secondary: ["League Spartan", "sans-serif"],
      },
      fontSize: {
        h1: ["3rem", { lineHeight: "3.5rem" }],
        h2: ["2.5rem", { lineHeight: "3rem" }],
        h3: ["2rem", { lineHeight: "2.5rem" }],
        h4: ["1.75rem", { lineHeight: "2.25rem" }],
        h5: ["1.5rem", { lineHeight: "2rem" }],
        h6: ["1.25rem", { lineHeight: "1.75rem" }],
      },
      translate: {
        fulls: "calc(100% - 0.05rem)",
      },
    },
  },
  plugins: [],
};
