import { QuartzTransformerPlugin } from "../../../plugins/types";

export const Leaflet: QuartzTransformerPlugin = () => ({
  name: "Leaflet",
  externalResources() {
    return {
      css: [{ content: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
      js: [],
    };
  },
});
