import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types";

// @ts-ignore: typescript doesn't know about our inline bundling system
// so we need to silence the error
import mapScript from "./scripts/map.inline";
import mapStyles from "./styles/map.scss";
import { QuartzPluginData } from "../plugins/vfile";

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
  capitol = "capitol",
  town = "town",
  subway = "subway",
  camp = "camp",
  star = "star",
  tree = "tree",
  shield = "shield",
}

interface Marker {
  name: string;
  mapName: string;
  link: string;
  position: {
    x: number;
    y: number;
  };
  icon: MarkerIcon;
  colour: MarkerColour;
}

interface FrontmatterMarkerData {
  mapName: string;
  x: string;
  y: string;
  icon: MarkerIcon;
  colour: MarkerColour | undefined;
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

export default ((ignore: boolean = false) => {
  function buildMarker(file: QuartzPluginData): Marker | undefined {
    const { slug, frontmatter } = file;
    const markerData = frontmatter?.marker;

    if (!slug || !frontmatter || !frontmatter?.title || !isFrontmatterMarkerData(markerData)) {
      return undefined;
    }

    return {
      name: frontmatter.title,
      mapName: markerData.mapName,
      link: slug,
      position: {
        x: parseInt(markerData.x),
        y: parseInt(markerData.y),
      },
      icon: markerData.icon,
      colour: markerData.colour ?? MarkerColour.blue,
    };
  }

  const MarkerComponent = (marker: Marker, index: number) => {
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
      />
    );
  };

  const Map: QuartzComponent = (props: QuartzComponentProps) => {
    const mapData = props.fileData.frontmatter?.map;
    if (!props.fileData.frontmatter || !isFrontmatterMapData(mapData) || ignore) {
      return <></>;
    }

    const markers = props.allFiles
      .map((file) => buildMarker(file))
      .filter((marker) => marker !== undefined)
      .filter((marker) => marker.mapName?.toLowerCase() === mapData.name?.toLowerCase());
    return (
      <div>
        <h2 id="map">Map</h2>
        <div
          id="leaflet-map"
          data-url={`../${mapData.path}`}
          data-min-zoom={mapData.minZoom}
          data-max-zoom={mapData.maxZoom}
        />
        {markers.map((object, i) => MarkerComponent(object, i))}
      </div>
    );
  };

  Map.afterDOMLoaded = mapScript;
  Map.css = mapStyles;

  return Map;
}) satisfies QuartzComponentConstructor;
