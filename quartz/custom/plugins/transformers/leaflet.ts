import { Root } from "mdast";
import { QuartzTransformerPlugin } from "../../../plugins/types";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
import { Element } from "hast";

const LEAFLET_MAP_PLUGIN_DATA: {
  markerMap: { [key: string]: Marker[] };
} = {
  markerMap: {},
};

enum MarkerColour {
  green = "green",
  lime = "lime",
  yellow = "yellow",
  pink = "pink",
  blue = "blue",
  lightblue = "lightblue",
  brown = "brown",
  orange = "orange",
  red = "red",
  purple = "purple",
}

enum MarkerIcon {
  anchor = "anchor",
  anvil = "anvil",
  bed = "bed",
  branch = "branch",
  camp = "camp",
  capitol = "capitol",
  cauldron = "cauldron",
  diner = "diner",
  farm = "farm",
  shield = "shield",
  star = "star",
  subway = "subway",
  town = "town",
  tree = "tree",
  university = "university",
}

interface Marker {
  name: string;
  link: string;
  position: { x: number; y: number };
  icon: MarkerIcon;
  colour: MarkerColour;
  minZoom: number;
}

interface FrontmatterMarkerData {
  mapName: string;
  x: string;
  y: string;
  icon: MarkerIcon;
  colour: MarkerColour | undefined;
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

  // Unknown markers are not accepted
  if (!Object.values(MarkerIcon).includes(object.icon)) {
    return false;
  }

  // Undefined colours are handled elsewhere, these may pass
  if (!object.colour) {
    return true;
  }

  // Unknown colours however are not accepted
  if (!Object.values(MarkerColour).includes(object.colour)) {
    return false;
  }

  return true;
}

function buildMarkerData(file: VFile): void {
  const { slug, frontmatter } = file.data;
  const markerData = frontmatter?.marker;

  if (!slug || !frontmatter || !frontmatter?.title || !isFrontmatterMarkerData(markerData)) {
    return;
  }

  const mapName = markerData.mapName.toLowerCase();
  if (LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName] === undefined) {
    LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName] = [];
  }

  LEAFLET_MAP_PLUGIN_DATA.markerMap[mapName].push({
    name: frontmatter.title,
    link: slug,
    position: { x: parseInt(markerData.x), y: parseInt(markerData.y) },
    icon: markerData.icon,
    colour: markerData.colour ?? MarkerColour.blue,
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
      "data-link": `${"../".repeat(distance)}${marker.link}`,
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
            const distanceToRoot = (file.data.filePath ?? "/").split("/").length - 1; // deduct root directory from distance

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

/* to align icon */
.custom-div-icon .icon {
  position: absolute;
  width: 32px;
  height: 17px;
  font-size: 16px;
  top: 8px;
  left: 0px;
  z-index: inherit;
  margin: 0px auto;
}

/* to align marker */
.custom-div-icon .marker {
  position: absolute;
  width: 32px;
  height: 48px;
  margin: 0px auto;
  z-index: inherit;
}

.custom-div-icon .marker.green {
  fill: #039c4b;
}

.custom-div-icon .marker.lime {
  fill: #66d313;
}

.custom-div-icon .marker.yellow {
  fill: #e2c505;
}

.custom-div-icon .marker.pink {
  fill: #ff0984;
}

.custom-div-icon .marker.blue {
  fill: #21409a;
}

.custom-div-icon .marker.lightblue {
  fill: #04adff;
}

.custom-div-icon .marker.brown {
  fill: #e48873;
}

.custom-div-icon .marker.orange {
  fill: #f16623;
}

.custom-div-icon .marker.red {
  fill: #f44546;
}

.custom-div-icon .marker.purple {
  fill: #7623a5;
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
          loadTime: "afterDOMReady",
          contentType: "inline",
          script: `
const MARKER_ICONS = {
  anchor:'<svg fill="#ebebec" width="32" height="17" viewBox="0 0 0.96 0.51000001" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="m 0.45782609,0.06652174 c 0,-0.01224621 0.009927,-0.02217391 0.0221739,-0.02217391 0.0122466,0 0.0221739,0.0099277 0.0221739,0.02217391 0,0.01224621 -0.009927,0.02217391 -0.0221739,0.02217391 -0.0122466,0 -0.0221739,-0.0099277 -0.0221739,-0.02217391 z m 0.0443478,0.06273643 c 0.025837,-0.009132 0.0443478,-0.03377242 0.0443478,-0.06273643 C 0.54652174,0.02978289 0.51673996,0 0.48,0 0.4432601,0 0.4134783,0.02978289 0.4134783,0.06652174 c 0,0.02896401 0.018511,0.05360455 0.0443478,0.06273643 v 0.0481331 H 0.3913044 c -0.0122462,0 -0.0221739,0.009928 -0.0221739,0.0221739 0,0.0122462 0.009928,0.0221739 0.0221739,0.0221739 H 0.4578261 V 0.46427961 C 0.38182988,0.45480248 0.3207627,0.39725452 0.30601372,0.32302513 l 0.0252634,0.0252627 c 0.00866,0.008659 0.0226992,0.008659 0.0313588,0 0.008659,-0.008659 0.008659,-0.0226994 0,-0.0313583 l -0.0665217,-0.0665217 c -0.006342,-0.006342 -0.0158792,-0.00824 -0.0241649,-0.004807 -0.008286,0.003433 -0.0136884,0.0115171 -0.0136884,0.0204865 v 0.0221739 C 0.25826087,0.41072296 0.35753681,0.51 0.48,0.51 0.60246209,0.51 0.70173913,0.410723 0.70173913,0.28826087 v -0.0221739 c 0,-0.008969 -0.005402,-0.017054 -0.013688,-0.0204865 -0.008286,-0.003433 -0.0178234,-0.001534 -0.0241651,0.004807 l -0.0665217,0.0665217 c -0.008659,0.008659 -0.008659,0.0226994 0,0.0313583 0.008659,0.008659 0.0226994,0.008659 0.0313584,0 l 0.0252627,-0.0252627 C 0.63923752,0.39725452 0.57817057,0.45480248 0.50217392,0.46427961 V 0.22173913 h 0.0665217 c 0.0122467,0 0.0221739,-0.009928 0.0221739,-0.0221739 0,-0.0122462 -0.009927,-0.0221739 -0.0221739,-0.0221739 h -0.0665217 z"/></svg>',
  anvil:'<svg fill="#ebebec" viewBox="0 0 20.48 10.88" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M7.256 1.6v3.458h6.669V1.6Zm-2.618.479c.407 1.103 1.273 1.882 2.221 2.195V2.08zm9.697.288v2.075c.502-.213 1.005-.591 1.507-1.109-.504-.528-.998-.823-1.507-.966m-5.294 3.1c-.285.902-.794 1.673-1.418 2.351h6.034c-.672-.679-1.17-1.452-1.44-2.35zM6.627 8.255V9.28h7.9V8.255z"/></svg>',
  bed:'<svg fill="#ebebec" width="32" height="17" viewBox="0 0 0.56 0.2975002" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="m 0.20124997,0.14875011 c 0.0241229,0 0.0437499,-0.0196271 0.0437499,-0.0437499 0,-0.02412284 -0.0196271,-0.04374991 -0.0437499,-0.04374991 -0.0241228,0 -0.0437499,0.01962707 -0.0437499,0.04374991 0,0.0241228 0.019627,0.0437499 0.0437499,0.0437499 z M 0.39375009,0.07875003 H 0.27124997 c -0.004835,0 -0.00875,0.0039176 -0.00875,0.0087501 V 0.16625014 H 0.13999988 V 0.05250001 c 0,-0.0048343 -0.003916,-0.00875 -0.00875,-0.00875 h -0.0175 c -0.004834,0 -0.00875,0.0039156 -0.00875,0.00875 V 0.2450002 c 0,0.004835 0.003918,0.00875 0.00875,0.00875 h 0.0175003 c 0.004835,0 0.00875,-0.003918 0.00875,-0.00875 V 0.2187504 h 0.27999973 v 0.0262497 c 0,0.004835 0.003918,0.00875 0.00875,0.00875 h 0.0175002 c 0.004835,0 0.00875,-0.003918 0.00875,-0.00875 V 0.14000004 c 0,-0.0338294 -0.02742,-0.06125018 -0.06125,-0.06125001 z"/></svg>',
  branch:'<svg fill="#ebebec" viewBox="0 0 20.48 10.88" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M12.095 0c-.923.004-1.736.84-2.036 1.189a9.3 9.3 0 0 0-3.102-.038C6.443.739 5.887.424 5.29.3c-.606.314-.424.794-.29 1.264.778-.063 1.57.185 2.368.562q.258.172.516.361c.234.828.348 1.647.384 2.463-.573.12-1.694.465-2.02 1.345L7.55 6.11l-1.396.702c-.036.644.097 1.172.282 1.65l.887-.938-.667 1.452c.285.623.586 1.2.591 1.903.36-.362.705-.658 1.018-.937L8.051 8.59l.51 1.085c.406-.378.74-.75.96-1.244l-.833-1.287 1.024.7.014-.068c.253-1.283-.728-2.468-1.026-2.794a11.5 11.5 0 0 0-.264-2.067c.912.74 1.793 1.632 2.597 2.647-.188.659-.292 1.201-.326 1.653l.726-.654-.708 1.416c.082.55.321.911.667 1.184l.582-1.06-.209 1.305c.383.21.845.373 1.342.569-.004-.385.007-.674.006-1.11l.404 1.279c.433.185.883.41 1.325.724.057-.655.058-1.312-.008-1.933l-1.233-.474 1.185.1a5.6 5.6 0 0 0-.481-1.616l-1.386-.312 1.082-.196c-.488-.675-1.196-1.096-2.172-1.095q-.195 0-.404.024c-1.13-1.442-2.414-2.648-3.736-3.543a9 9 0 0 0-.302-.298 9 9 0 0 1 2.647.094c.166.414.546 1.189 1.197 1.594l-.155-1.23.676 1.448q.102.024.21.035c1.37.132 2.265-1.055 3.651-.889-.424-.203-.714-.49-.981-.805l-1.558.013 1.18-.471C13.93.92 13.564.53 12.966.24L11.85.918l.594-.878a1.5 1.5 0 0 0-.348-.04"/></svg>',
  camp:'<svg fill="#ebebec" viewBox="0 0 481 255.5" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="m253.2 51.1 23.5-35.3a10.4 10.2 0 1 0-17.4-11.2l-18.6 27.9-.2-.4-.3.4-18.6-28a10.4 10.2 0 1 0-17.4 11.3l23.6 35.4-116.4 174.5h53q4.3 0 8.4-1.4c42.6-15.2 59-62.3 64.8-87.2.7-3 5-3 5.8 0 5.8 24.9 22.2 72 64.8 87.2a25 24.5 0 0 0 8.4 1.4h53zm122.3 184h-270a7.6 7.6 0 0 0-7.8 7.2v5.9c0 4 3.5 7.3 7.8 7.3h270a7.6 7.6 0 0 0 7.8-7.3v-5.9c0-4-3.5-7.3-7.8-7.3"/></svg>',
  capitol:'<svg fill="#ebebec" viewBox="0 0 22 11.7" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M6.2 4.8v4.5h.7q.6 0 .7-.6V4.4h-.7q-.7 0-.7.5m2.7 0v4.5h.7q.7 0 .7-.6V4.4h-.7q-.7 0-.7.5m2.7 0v4.5h.8q.5 0 .6-.6V4.4h-.7q-.6 0-.7.5m2.8 0v4.5h.7q.7 0 .7-.6V4.4H15q-.7 0-.7.5m2.4-1.5q0-.4-.6-.7L11.7.1h-1.2L5.7 2.6q-.5.3-.6.7v.5h11.7zM5.1 11.1q.1.5.7.6h10.3q.7 0 .7-.6v-1H5.1z"/></svg>',
  cauldron:'<svg fill="#ebebec" viewBox="0 0 20.48 10.88" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><g transform="translate(4.8)scale(.02125)"><path d="M150.26 0a50.14 50.14 0 0 0-50.09 50.09 50.14 50.14 0 0 0 50.1 50.08 50.14 50.14 0 0 0 50.08-50.08A50.14 50.14 0 0 0 150.26 0m0 66.78a16.7 16.7 0 1 1 0-33.39 16.7 16.7 0 0 1 0 33.4"/><circle cx="250.44" cy="83.48" r="16.7"/><circle cx="294.96" cy="27.83" r="16.7"/><path d="M441.53 166.96h20.38a16.7 16.7 0 0 0 0-33.4H357.7l71.5-71.5a16.7 16.7 0 1 0-23.6-23.62l-95.12 95.13H50.09a16.7 16.7 0 0 0 0 33.39h20.38C47.18 202.1 33.4 244.06 33.4 289.39c0 45.96 13.95 88.66 37.82 124.13-21.7 5.5-37.82 24.99-37.82 48.4A50.1 50.1 0 0 0 83.48 512c23.4 0 42.9-16.12 48.4-37.82A221.6 221.6 0 0 0 256 512c45.96 0 88.66-13.94 124.12-37.81 5.5 21.7 25 37.81 48.4 37.81a50.1 50.1 0 0 0 50.08-50.09c0-23.4-16.12-42.89-37.8-48.39a221.6 221.6 0 0 0 37.8-124.13c0-45.32-13.78-87.29-37.07-122.43M261.83 445.1h-.63a16.7 16.7 0 0 1-.6-33.37c63.19-2.34 114.9-54.33 117.71-117.5.4-9.21 8-16.66 17.43-15.93 9.2.4 16.34 8.2 15.93 17.41-3.58 80.42-69.4 146.41-149.84 149.39"/></g></svg>',
  diner:'<svg fill="#ebebec" viewBox="0 0 20.48 10.88" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><g transform="translate(3.54 -1.26)scale(.02617)"><path d="M214.26 320.58 99.01 430l32.19 33.9 117.01-111.09zM491.5 89.6c-32.85-34.6-94.08-29.8-133.18 7.31-23.76 22.58-34.14 53.67-34.22 79.73-.06 22.9-1.9 38.66-19.67 58.33l-23.28 22.11 33.94 32.24 21.53-20.46c20.55-16.72 36.4-17.75 59.25-16.62 26.03 1.26 57.64-7.47 81.42-30.05 39.06-37.1 47.06-98.01 14.2-132.6"/><path d="M219.53 190.06c2.23-24.5 1.07-41.72-34.53-75.28l-63.88-60.66c-19.3-18.3-46.69 9.2-26.95 27.96l66.92 63.51a10.7 10.7 0 0 1 .39 15.08l-1.97 2.08a10.66 10.66 0 0 1-15.08.37l-67.22-63.8c-11.03-10.48-21.37-6.18-28.12.93-6.75 7.12-10.5 17.65.53 28.14l67.22 63.81a10.66 10.66 0 0 1 .39 15.08l-1.97 2.06a10.67 10.67 0 0 1-15.08.4l-66.9-63.52c-19.75-18.75-45.8 10.03-26.5 28.33l63.87 60.67c35.36 33.83 52.61 34.1 76.97 30.58 19.61-2.83 33.88-7.63 55.97 13.37l194.58 184.74 32.19-33.9-194.58-184.75c-22.11-20.98-18.05-35.47-16.25-55.2"/></g></svg>',
  farm:'<svg fill="#ebebec" viewBox="0 0 38.723 20.572" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M13.166 9.283A4.2 4.2 0 0 0 11.9 12.3c0 1.18.484 2.25 1.266 3.016.172.17.45.17.623 0a4.2 4.2 0 0 0 1.266-3.016c0-1.183-.486-2.25-1.266-3.016a.44.44 0 0 0-.623-.002m4.193 5.322c-1.18 0-2.249.485-3.014 1.267a.445.445 0 0 0 0 .624 4.2 4.2 0 0 0 3.014 1.267 4.2 4.2 0 0 0 3.015-1.267.445.445 0 0 0 0-.624 4.2 4.2 0 0 0-3.015-1.267M16.215 6.23a4.2 4.2 0 0 0-1.266 3.018c0 1.18.484 2.25 1.266 3.016.173.17.45.17.623 0a4.2 4.2 0 0 0 1.267-3.016c0-1.183-.487-2.25-1.267-3.016a.44.44 0 0 0-.623-.002m7.206 6.59c-.767-.784-1.834-1.269-3.013-1.269s-2.248.485-3.013 1.268a.445.445 0 0 0 0 .623 4.2 4.2 0 0 0 3.013 1.268 4.2 4.2 0 0 0 3.015-1.268.447.447 0 0 0-.002-.623m-3.534-9.64a.444.444 0 0 0-.622 0A4.2 4.2 0 0 0 17.998 6.2c0 1.18.485 2.25 1.267 3.016.172.17.45.17.622 0A4.2 4.2 0 0 0 21.154 6.2a4.2 4.2 0 0 0-1.267-3.018m3.568 5.32c-1.18 0-2.248.484-3.013 1.267a.445.445 0 0 0 0 .623 4.2 4.2 0 0 0 3.013 1.268 4.2 4.2 0 0 0 3.016-1.268.445.445 0 0 0 0-.623A4.22 4.22 0 0 0 23.455 8.5M22.937.128a.444.444 0 0 0-.623 0 4.2 4.2 0 0 0-1.266 3.018c0 1.181.484 2.25 1.266 3.017.172.17.45.17.623 0a4.2 4.2 0 0 0 1.266-3.017A4.22 4.22 0 0 0 22.937.128m3.568 5.32c-1.18 0-2.249.485-3.014 1.268a.445.445 0 0 0 0 .623 4.2 4.2 0 0 0 3.014 1.268 4.2 4.2 0 0 0 3.015-1.268.445.445 0 0 0 0-.623 4.22 4.22 0 0 0-3.015-1.268m-.396-4.143a4.2 4.2 0 0 0-1.234 3.03.444.444 0 0 0 .44.44A4.216 4.216 0 0 0 29.578.509a.444.444 0 0 0-.44-.44 4.2 4.2 0 0 0-3.029 1.237M9.532 20.384a.637.637 0 0 0 .901 0l2.926-2.93a.64.64 0 0 0 0-.901l-.27-.27a.637.637 0 0 0-.9 0L9.262 19.21a.64.64 0 0 0 0 .901z"/></svg>',
  shield:'<svg fill="#ebebec" viewBox="0 0 8 4.25" xmlns="http://www.w3.org/2000/svg"><path d="M4 3.431c.683-.399 1.05-.702 1.05-1.164V.794A5 5 0 0 0 4 .68zm0-3.43C3 0 2.25.283 2.25.283v1.983C2.25 3.482 3.662 3.944 4 4.25c.339-.3 1.75-.782 1.75-1.983V.284S5.03 0 4 0m1.342 2.267c0 .654-.563 1.04-1.19 1.408L4 3.763l-.166-.1c-.496-.288-1.175-.685-1.175-1.396V.573A5.4 5.4 0 0 1 4 .397c.587 0 1.065.1 1.342.176z"/></svg>',
  star:'<svg fill="none" viewBox="0 0 12 6.375" xmlns="http://www.w3.org/2000/svg"><path d="M5.093 1.087C5.496.363 5.698 0 6 0s.504.362.907 1.086l.105.187c.115.206.172.31.261.377s.201.093.424.143l.203.046c.784.178 1.176.266 1.27.566.092.3-.175.613-.71 1.238l-.138.161c-.151.178-.227.267-.262.377-.034.11-.022.228 0 .465l.022.216c.08.834.12 1.25-.123 1.436s-.612.017-1.345-.322l-.19-.087c-.21-.096-.313-.144-.424-.144s-.215.048-.424.144l-.19.087c-.733.338-1.1.507-1.344.322s-.204-.602-.124-1.436l.021-.216c.023-.237.035-.355 0-.465-.034-.11-.11-.199-.261-.376l-.139-.162c-.534-.625-.801-.938-.708-1.238s.485-.388 1.27-.566l.202-.046c.223-.05.334-.075.424-.143s.147-.17.261-.377z" fill="#ebebec"/></svg>',
  subway:'<svg viewBox="0 0 16 8.5" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" transform="translate(3.75)scale(.26562)"><path d="M0 0h32v32H0z"/><path d="M21.47 0a6 6 0 0 1 5.95 5.26l1.74 14a6 6 0 0 1-5.04 6.67l2.38 4.13a1 1 0 1 1-1.73 1L23.57 29H8.43l-1.19 2.06a1 1 0 1 1-1.73-1l2.39-4.13a6 6 0 0 1-5.05-6.67l1.74-14A6 6 0 0 1 10.53 0zm.38 26h-11.7l-.57 1h12.85zM10.5 19a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-.4-11H10.9a2 2 0 0 0-1.98 1.75l-.63 5A2 2 0 0 0 10.27 17h11.46a2 2 0 0 0 1.98-2.25l-.63-5A2 2 0 0 0 21.1 8M19 4h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2" fill="#ebebec"/></g></svg>',
  town:'<svg viewBox="0 0 32 17" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M24.2 7.75 16.75.3a1.06 1.06 0 0 0-1.5 0L7.8 7.75a1.04 1.04 0 0 0 .02 1.48c.42.42 1.03.48 1.44.06l.37-.36v7A1.06 1.06 0 0 0 10.69 17h3.86v-4.95h2.92V17h3.86a1.06 1.06 0 0 0 1.06-1.06V8.95l.32.32c.42.41 1.05.37 1.47-.04a1.04 1.04 0 0 0 .02-1.48" fill="#ebebec"/></svg>',
  tree:'<svg viewBox="0 0 32 17" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M22.402 12.31 16.986.622a1.083 1.062 0 0 0-1.973 0L9.597 12.31a1.084 1.063 0 0 0 .986 1.502h4.333v2.125c0 .587.485 1.063 1.084 1.063a1.083 1.062 0 0 0 1.083-1.063v-2.125h4.333a1.086 1.065 0 0 0 .912-.487 1.083 1.062 0 0 0 .074-1.015" fill="#ebebec"/></svg>',
  university:'<svg fill="#ebebec" width="32" height="17" viewBox="0 0 0.6 0.31874861" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="m 0.3,0 -0.18389423,0.0858173 0.0490385,0.0220673 v 0.041683 c -0.0147115,0.0049 -0.0245192,0.019615 -0.0245192,0.034327 0,0.014712 0.009808,0.029423 0.0245192,0.034327 v 0.00245 l -0.0220673,0.05149 c -0.007356,0.022067 -0.002452,0.046587 0.0343269,0.046587 0.0367788,0 0.0416827,-0.024519 0.0343269,-0.046587 l -0.0220673,-0.05149 c 0.0147115,-0.00736 0.0245192,-0.019615 0.0245192,-0.036779 0,-0.017163 -0.009808,-0.029423 -0.0245192,-0.034327 V 0.1201426 L 0.3,0.1716326 0.48389423,0.0858156 Z M 0.40788462,0.159375 0.29754808,0.208413 0.23870188,0.181442 v 0.00245 c 0,0.017164 -0.007356,0.031875 -0.0196154,0.044135 l 0.0147115,0.034327 v 0.00245 c 0.002452,0.00981 0.004904,0.019615 0.002452,0.029423 0.0171635,0.00736 0.0367788,0.01226 0.0612981,0.01226 0.0809135,0 0.11033654,-0.049038 0.11033654,-0.073558 z"/></svg>',
}

function buildIcon(icon, colour) {
  const markerSvg = MARKER_ICONS[icon]
  return L.divIcon({
    className: "custom-div-icon",
    html: \`
      <svg class='marker \${colour}' width="32" height="48" viewBox="0 0 233.29 349.94"">
        <g transform="matrix(.75581 0 0 .75 -59.677 -.00049655)">
          <path d="m233.29 0c-85.1 0-154.33 69.234-154.33 154.33 0 34.275 21.887 90.155 66.908 170.83 31.846 57.063 63.168 104.64 64.484 106.64l22.942 34.775 22.941-34.774c1.317-1.998 32.641-49.577 64.483-106.64 45.023-80.68 66.908-136.56 66.908-170.83 1e-3 -85.1-69.233-154.33-154.33-154.33z"/>
        </g>
      </svg>
      <div class='icon'>\${markerSvg}'</div>
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
