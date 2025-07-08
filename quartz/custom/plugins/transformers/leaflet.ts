import { Root } from "mdast";
import { QuartzTransformerPlugin } from "../../../plugins/types";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
import { Element } from "hast";

// Data stored across several invocations of this plugin
const LEAFLET_MAP_PLUGIN_DATA: {
  markerMap: { [key: string]: Marker[] };
} = {
  markerMap: {},
};

// Predefined colours used by the plugin
const markerColourMap = {
  green: "#039c4b",
  lime: "#66d313",
  yellow: "#e2c505",
  pink: "#ff0984",
  blue: "#21409a",
  lightblue: "#04adff",
  brown: "#e48873",
  orange: "#f16623",
  red: "#f44546",
  purple: "#7623a5",
};
type MarkerColour = keyof typeof markerColourMap;

interface Marker {
  name: string;
  link: string;
  position: { x: number; y: number };
  icon: string;
  colour: string;
  minZoom: number;
}

interface FrontmatterMarkerData {
  mapName: string;
  x: string;
  y: string;
  icon: string;
  colour: MarkerColour | string | undefined;
  minZoom: string;
}

interface MapMetadata {
  name: string;
  src: string;
  minZoom: number;
  maxZoom: number;
}

function isFrontmatterMarkerData(object: any): object is FrontmatterMarkerData {
  if (!object || !object.x || !object.y || !object.icon) {
    return false;
  }

  // Undefined colours are handled elsewhere, these may pass
  if (!object.colour) {
    return true;
  }

  // We only accept predefined and hex colours
  const testColourValue = object.colour.toLowerCase();
  if (
    !Object.keys(markerColourMap).includes(testColourValue) &&
    !/([0-9A-F]{3}){1,2}$/i.test(testColourValue)
  ) {
    return false;
  }

  return true;
}

function getColourValue(colour: MarkerColour | string | undefined): string {
  if (!colour) {
    return markerColourMap.blue;
  }

  const unparsedColourValue = colour.toLowerCase();
  if (Object.keys(markerColourMap).includes(unparsedColourValue)) {
    return markerColourMap[unparsedColourValue as MarkerColour];
  }
  return `#${unparsedColourValue.toLowerCase()}`;
}

function buildMarkerData(file: VFile): void {
  const { slug, frontmatter } = file.data;
  const markerData = frontmatter?.marker;

  if (!slug || !frontmatter || !frontmatter?.title || !isFrontmatterMarkerData(markerData)) {
    return;
  }

  const mapName = markerData.mapName.toLowerCase().trim();
  if (LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName] === undefined) {
    LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName] = [];
  }

  LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName].push({
    name: frontmatter.title,
    link: slug,
    position: { x: parseInt(markerData.x), y: parseInt(markerData.y) },
    icon: markerData.icon,
    colour: getColourValue(markerData.colour),
    minZoom: markerData.minZoom ? parseInt(markerData.minZoom) : -1,
  });
}

function buildMarkerObject(marker: Marker, distance: number): Element {
  return {
    type: "element",
    tagName: "div",
    properties: {
      class: ["leaflet-marker"],
      "data-name": marker.name,
      "data-link": `./${"../".repeat(distance)}${marker.link}`,
      "data-pos-x": marker.position.x,
      "data-pos-y": marker.position.y,
      "data-icon": marker.icon,
      "data-colour": marker.colour,
      "data-min-zoom": marker.minZoom,
    },
    children: [],
  };
}

function collectMapMetadata(node: any): MapMetadata {
  // Parse data stored in callout meta data
  const calloutMetadata = ((node.properties?.dataCalloutMetadata ?? "") as string)
    .replaceAll(/(\\n)| /g, "")
    .split("-");

  var minZoom: number = 0;
  var maxZoom: number = 2;

  for (const data of calloutMetadata) {
    const unpacked = data.split(":");
    if (unpacked[0].toLowerCase() === "minzoom") {
      minZoom = parseInt(unpacked[1]);
    }
    if (unpacked[0].toLowerCase() === "maxzoom") {
      maxZoom = parseInt(unpacked[1]);
    }
  }

  // Parse data stored in callout content
  var name = "";
  visit(node, { type: "text" }, (target: any, _index, _parent) => {
    if (!target.value || target.value.replaceAll(/(\n)| /g, "") === "") {
      return;
    }

    // Only use the first actual string found, this should be the title
    if (name === "") {
      name = target.value;
    }
  });

  var src = "";
  visit(node, { tagName: "img" }, (target: any, _index, _parent) => {
    src = target.properties.src;
  });

  return { minZoom, maxZoom, name, src };
}

export const Leaflet: QuartzTransformerPlugin = () => ({
  name: "Leaflet",
  markdownPlugins() {
    return [
      () => {
        // For every file, check if the frontmatter contains marker data,
        // and if so add it to a global constant
        return (_tree: Root, file) => buildMarkerData(file);
      },
    ];
  },
  htmlPlugins() {
    return [
      () => {
        return (tree: Root, file) => {
          visit(tree, { tagName: "blockquote" }, (node: any, index, parent) => {
            if (node.properties?.dataCallout !== "map" || !parent || index === undefined) {
              return;
            }

            const mapMetaData = collectMapMetadata(node);
            const mapName = mapMetaData.name.toLowerCase().trim();
            const markers = LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName] ?? [];

            // Fix slug based navigation based on distance to root
            const distanceToRoot = (file.data.filePath ?? "/").split("/").length - 2; // Deduct root directory and current page from distance

            // Build the new leaflet element
            const leafletContainer: Element = {
              type: "element",
              tagName: "div",
              properties: {},
              children: [
                ...markers.map((marker) => buildMarkerObject(marker, distanceToRoot)),
                {
                  type: "element",
                  tagName: "div",
                  properties: {
                    id: "leaflet-map",
                    "data-src": mapMetaData.src,
                    "data-min-zoom": mapMetaData.minZoom,
                    "data-max-zoom": mapMetaData.maxZoom,
                  },
                  children: [],
                },
              ],
            };

            // Replace the blockquote with the leaflet element
            parent.children[index] = leafletContainer;
          });
        };
      },
    ];
  },
  externalResources() {
    return {
      css: [
        { content: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" },
        {
          inline: true,
          content: `
#leaflet-map {
  width: 100%;
  margin: 0;
  z-index: 0;
  background-color: rgba(80, 120, 180, 0.1);

  .leaflet-image-layer {
    margin: 0 !important;
  }
}

/* to align and colour icon */
.custom-div-icon .icon {
  position: absolute;
  width: 32px;
  height: 19px;
  font-size: 19px;
  top: 8px;
  left: 0px;
  z-index: inherit;
  margin: 0px auto;

  display: flex;
  align-items: center;
  justify-content: center;

  color: #ebebec;
}

/* to align marker */
.custom-div-icon .marker {
  position: absolute;
  width: 32px;
  height: 48px;
  margin: 0px auto;
  z-index: inherit;
}
        `,
        },
      ],
      js: [
        {
          loadTime: "afterDOMReady",
          src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
          contentType: "external",
        },
        {
          loadTime: "beforeDOMReady",
          src: "https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js",
          contentType: "external",
        },
        {
          loadTime: "afterDOMReady",
          contentType: "inline",
          script: `
function buildIcon(icon, colour) {
  return L.divIcon({
    className: "custom-div-icon",
    html: \`
      <svg class="marker" style="fill:\${colour}" width="32" height="48" viewBox="0 0 233.29 349.94"">
        <g transform="matrix(.75581 0 0 .75 -59.677 -.00049655)">
          <path d="m233.29 0c-85.1 0-154.33 69.234-154.33 154.33 0 34.275 21.887 90.155 66.908 170.83 31.846 57.063 63.168 104.64 64.484 106.64l22.942 34.775 22.941-34.774c1.317-1.998 32.641-49.577 64.483-106.64 45.023-80.68 66.908-136.56 66.908-170.83 1e-3 -85.1-69.233-154.33-154.33-154.33z"/>
        </g>
      </svg>
      <iconify-icon class="icon" icon="\${icon}"></iconify-icon>
    \`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    tooltipAnchor: [17, -36],
  });
}

function getMarkerOnClick(url) {
  return (_event) => {
    window.location.href = \`\${url}\`;
  };
}

function addMarker(markerData, mapItem, baseUrl) {
  function addMarkerWhenZoom(markerItem, mapItem, markerZoom) {
    mapItem.getZoom() >= markerZoom ? markerItem.addTo(mapItem) : markerItem.remove();
  }

  const options = { icon: buildIcon(markerData.icon, markerData.colour) };

  const markerZoom = parseInt(markerData.minZoom);
  const markerItem = L.marker([parseInt(markerData.posY), parseInt(markerData.posX)], options)
    .bindTooltip(markerData.name)
    .on("click", getMarkerOnClick(markerData.link));

  addMarkerWhenZoom(markerItem, mapItem, markerZoom);
  mapItem.on("zoomend", () => addMarkerWhenZoom(markerItem, mapItem, markerZoom));
}
  
function isMarkerDataSet(dataset) {
  if (
    !dataset["name"] ||
    !dataset["link"] ||
    !dataset["posX"] ||
    !dataset["posY"] ||
    !dataset["icon"] ||
    !dataset["colour"] ||
    !dataset["minZoom"]
  ) {
    return false;
  }
  return true;
}

function isMapDataSet(dataset) {
  if (!dataset["src"] || !dataset["minZoom"] || !dataset["maxZoom"]) {
    return false;
  }
  return true;
}

function getMarkerData(markers) {
  const data = [];
  for (const marker of markers) {
    if (isMarkerDataSet(marker.dataset)) {
      data.push(marker.dataset);
    }
    marker.remove();
  }
  return data;
}

async function getMeta(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function initialiseMap(mapElement, markers) {
  const dataset = mapElement.dataset;
  if (!isMapDataSet(dataset)) {
    return;
  }

  const image = await getMeta(dataset.src);

  mapElement.style.aspectRatio = (image.naturalWidth / image.naturalHeight).toString();

  const bounds = [
    [0, 0],
    [image.naturalHeight / 2, image.naturalWidth / 2],
  ];

  const mapItem = L.map(mapElement, {
    crs: L.CRS.Simple,
    maxBounds: bounds,
    minZoom: parseInt(dataset.minZoom),
    maxZoom: parseInt(dataset.maxZoom),
  });

  L.imageOverlay(dataset.src, bounds).addTo(mapItem);

  mapItem.fitBounds(bounds);
  markers.map((marker) => addMarker(marker, mapItem, dataset.src));

  return mapItem;
}

function cleanupMap(mapItem) {
  if (!mapItem) {
    return;
  }

  mapItem.clearAllEventListeners();
  mapItem.remove();
}

document.addEventListener("nav", async () => {
  const map = document.getElementById("leaflet-map");
  if (!map) {
    return;
  }

  const markers = document.querySelectorAll("div.leaflet-marker");
  const markerData = getMarkerData(markers);

  const mapItem = await initialiseMap(map, markerData);
  window.addCleanup(() => cleanupMap(mapItem));
});
          `,
        },
      ],
    };
  },
});
