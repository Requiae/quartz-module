import {
  CRS,
  DivIcon,
  divIcon,
  imageOverlay,
  LatLngBoundsExpression,
  LeafletMouseEvent,
  LeafletMouseEventHandlerFn,
  Map,
  map,
  Marker,
  marker,
  MarkerOptions,
} from "leaflet";

const MAP_ID = "leaflet-map";
const MARKER_SELECTOR = "div.marker";

interface MarkerDataSet {
  name: string;
  link: string;
  posX: string;
  posY: string;
  icon: string;
  colour: string;
  minZoom: string;
}

interface MapDataSet {
  url: string;
  minZoom: string;
  maxZoom: string;
}

function buildIcon(icon: string, colour: string): DivIcon {
  return divIcon({
    className: "custom-div-icon",
    html: `
      <svg class='marker ${colour}' width="32" height="48" version="1.1" viewBox="0 0 233.29 349.94"">
        <g transform="matrix(.75581 0 0 .75 -59.677 -.00049655)">
          <path d="m233.29 0c-85.1 0-154.33 69.234-154.33 154.33 0 34.275 21.887 90.155 66.908 170.83 31.846 57.063 63.168 104.64 64.484 106.64l22.942 34.775 22.941-34.774c1.317-1.998 32.641-49.577 64.483-106.64 45.023-80.68 66.908-136.56 66.908-170.83 1e-3 -85.1-69.233-154.33-154.33-154.33z"/>
        </g>
      </svg>
      <img class='icon' src='${window.location.origin}/static/markers/${icon}.svg'>
    `,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    tooltipAnchor: [17, -36],
  });
}

function getMarkerOnClick(url: string): LeafletMouseEventHandlerFn {
  return (_event: LeafletMouseEvent) => {
    window.location.href = `${url}`;
  };
}

function addMarker(markerData: MarkerDataSet, mapItem: Map): void {
  function addMarkerWhenZoom(markerItem: Marker, mapItem: Map, markerZoom: number) {
    mapItem.getZoom() >= markerZoom ? markerItem.addTo(mapItem) : markerItem.remove();
  }

  const options: MarkerOptions = { icon: buildIcon(markerData.icon, markerData.colour) };

  const markerZoom = parseInt(markerData.minZoom);
  const markerItem = marker([parseInt(markerData.posY), parseInt(markerData.posX)], options)
    .bindTooltip(markerData.name)
    .on("click", getMarkerOnClick(markerData.link));

  addMarkerWhenZoom(markerItem, mapItem, markerZoom);
  mapItem.on("zoomend", () => addMarkerWhenZoom(markerItem, mapItem, markerZoom));
}

function isMarkerDataSet(dataset: any): dataset is MarkerDataSet {
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

function isMapDataSet(dataset: any): dataset is MapDataSet {
  if (!dataset["url"] || !dataset["minZoom"] || !dataset["maxZoom"]) {
    return false;
  }
  return true;
}

function getMarkerData(markers: NodeListOf<HTMLElement>): MarkerDataSet[] {
  const data: MarkerDataSet[] = [];
  for (const marker of markers) {
    if (isMarkerDataSet(marker.dataset)) {
      data.push(marker.dataset);
    }
    marker.remove();
  }
  return data;
}

async function getMeta(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function initialiseMap(
  mapElement: HTMLElement,
  markers: MarkerDataSet[],
): Promise<Map | undefined> {
  const dataset = mapElement.dataset;
  if (!isMapDataSet(dataset)) {
    return;
  }

  console.log(dataset.url);

  const image = await getMeta(dataset.url);

  mapElement.style.aspectRatio = (image.naturalWidth / image.naturalHeight).toString();

  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [image.naturalHeight / 2, image.naturalWidth / 2],
  ];

  const mapItem = map(mapElement, {
    crs: CRS.Simple,
    maxBounds: bounds,
    minZoom: parseInt(dataset.minZoom),
    maxZoom: parseInt(dataset.maxZoom),
  });

  imageOverlay(dataset.url, bounds).addTo(mapItem);

  mapItem.fitBounds(bounds);
  markers.map((marker) => addMarker(marker, mapItem));

  return mapItem;
}

function cleanupMap(mapItem: Map | undefined) {
  if (!mapItem) {
    return;
  }

  mapItem.clearAllEventListeners();
  mapItem.remove();
}

document.addEventListener("nav", async () => {
  const map = document.getElementById(MAP_ID);
  if (!map) {
    return;
  }

  const markers: NodeListOf<HTMLElement> = document.querySelectorAll(MARKER_SELECTOR);
  const markerData = getMarkerData(markers);

  const mapItem = await initialiseMap(map, markerData);
  window.addCleanup(() => cleanupMap(mapItem));
});
