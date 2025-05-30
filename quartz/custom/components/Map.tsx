import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../components/types";

// @ts-ignore: typescript doesn't know about our inline bundling system
// so we need to silence the error
import mapScript from "./scripts/map.inline";
import mapStyles from "./styles/map.scss";
import { QuartzPluginData } from "../../plugins/vfile";
import { JSXInternal } from "preact/src/jsx";

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
  mapName: string;
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

interface FrontmatterMapData {
  name: string;
  path: string;
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

function isFrontmatterMapData(object: any): object is FrontmatterMapData {
  if (
    !object ||
    !object.name ||
    !object.path ||
    object.minZoom === undefined ||
    object.maxZoom === undefined
  ) {
    return false;
  }

  if (!Number.isInteger(object.minZoom) || !Number.isInteger(object.maxZoom)) {
    return false;
  }

  return true;
}

function buildMarkerData(file: QuartzPluginData, mapData: FrontmatterMapData): Marker | undefined {
  const { slug, frontmatter } = file;
  const markerData = frontmatter?.marker;

  if (!slug || !frontmatter || !frontmatter?.title || !isFrontmatterMarkerData(markerData)) {
    return undefined;
  }

  return {
    name: frontmatter.title,
    mapName: markerData.mapName,
    link: slug,
    position: { x: parseInt(markerData.x), y: parseInt(markerData.y) },
    icon: markerData.icon,
    colour: markerData.colour ?? MarkerColour.blue,
    minZoom: markerData.minZoom ? parseInt(markerData.minZoom) : mapData.minZoom,
  };
}

function buildMarkerComponent(marker: Marker, index: number): JSXInternal.Element {
  return (
    <div
      class={"marker"}
      key={index}
      data-name={marker.name}
      data-link={`../${marker.link}`}
      data-pos-x={marker.position.x}
      data-pos-y={marker.position.y}
      data-icon={marker.icon}
      data-colour={marker.colour}
      data-min-zoom={marker.minZoom}
    />
  );
}

function MapConstructor(opts: object | undefined) {
  const ignore = (opts as any)?.ignore || undefined;

  const map: QuartzComponent = (props: QuartzComponentProps) => {
    const mapData = props.fileData.frontmatter?.map;
    if (!props.fileData.frontmatter || !isFrontmatterMapData(mapData) || ignore) {
      return <></>;
    }

    const baseUrl = props.cfg.baseUrl?.endsWith("/")
      ? props.cfg.baseUrl
      : props.cfg.baseUrl
        ? `${props.cfg.baseUrl}/`
        : "";

    const markers = props.allFiles
      .map((file) => buildMarkerData(file, mapData))
      .filter((marker) => marker !== undefined)
      .filter((marker) => marker.mapName?.toLowerCase() === mapData.name?.toLowerCase());
    return (
      <div>
        <h2 id="map">Map</h2>
        <div
          id="leaflet-map"
          data-base={`${baseUrl}`}
          data-url={`${baseUrl}${mapData.path}`}
          data-min-zoom={mapData.minZoom}
          data-max-zoom={mapData.maxZoom}
        />
        {markers.map((object, i) => buildMarkerComponent(object, i))}
      </div>
    );
  };

  map.afterDOMLoaded = mapScript;
  map.css = mapStyles;

  return map;
}

export default ((opts: object | undefined = undefined) =>
  MapConstructor(opts)) satisfies QuartzComponentConstructor;
