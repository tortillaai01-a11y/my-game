import { defineConfig } from "vite";

export default defineConfig({
  base: "/my-game/",
  build: {
    rolldownOptions: {
      input: {
        main: "index.html",
        shooter: "shooter.html",
        rocket: "rocket.html",
        pet: "pet.html",
      },
    },
  },
});
