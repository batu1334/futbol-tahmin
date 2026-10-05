import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.skorduragi.app",
  appName: "Skor Durağı",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;