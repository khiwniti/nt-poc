declare module 'react-map-gl' {
  import type { RefObject, ReactNode, CSSProperties } from 'react';
  import type { Map as MapboxMap, FlyToOptions } from 'mapbox-gl';

  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    padding?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  }

  export interface ViewStateChangeEvent {
    viewState: ViewState;
    interactionState?: unknown;
    oldViewState?: ViewState;
  }

  export interface MapRef {
    getMap(): MapboxMap;
    flyTo(options: FlyToOptions): void;
  }

  export interface MapProps {
    mapboxAccessToken?: string;
    mapStyle?: string;
    longitude?: number;
    latitude?: number;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    padding?: ViewState['padding'];
    onMove?: (evt: ViewStateChangeEvent) => void;
    onClick?: (evt: unknown) => void;
    onLoad?: () => void;
    style?: CSSProperties;
    children?: ReactNode;
    attributionControl?: boolean;
    reuseMaps?: boolean;
    ref?: RefObject<MapRef>;
  }

  export interface MarkerProps {
    longitude: number;
    latitude: number;
    anchor?:
      | 'center'
      | 'left'
      | 'right'
      | 'top'
      | 'bottom'
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right';
    offset?: [number, number];
    rotation?: number;
    rotationAlignment?: 'map' | 'viewport' | 'auto';
    pitchAlignment?: 'map' | 'viewport' | 'auto';
    draggable?: boolean;
    onClick?: (evt: unknown) => void;
    onDragStart?: (evt: unknown) => void;
    onDrag?: (evt: unknown) => void;
    onDragEnd?: (evt: unknown) => void;
    children?: ReactNode;
    style?: CSSProperties;
  }

  export interface PopupProps {
    longitude: number;
    latitude: number;
    anchor?:
      | 'center'
      | 'left'
      | 'right'
      | 'top'
      | 'bottom'
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right';
    offset?: number | [number, number];
    closeButton?: boolean;
    closeOnClick?: boolean;
    onClose?: () => void;
    onOpen?: () => void;
    maxWidth?: string;
    className?: string;
    focusAfterOpen?: boolean;
    children?: ReactNode;
    style?: CSSProperties;
  }

  export interface NavigationControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  }

  export interface FullscreenControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    containerId?: string;
  }

  export interface ScaleControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    maxWidth?: number;
    unit?: 'imperial' | 'metric' | 'nautical';
  }

  export interface GeolocateControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    positionOptions?: PositionOptions;
    fitBoundsOptions?: FlyToOptions;
    trackUserLocation?: boolean;
    showAccuracyCircle?: boolean;
    showUserLocation?: boolean;
    showUserHeading?: boolean;
    onGeolocate?: (evt: unknown) => void;
    onError?: (evt: unknown) => void;
    onOutOfMaxBounds?: (evt: unknown) => void;
    onTrackUserLocationStart?: (evt: unknown) => void;
    onTrackUserLocationEnd?: (evt: unknown) => void;
  }

  const Map: React.ForwardRefExoticComponent<MapProps & React.RefAttributes<MapRef>>;
  export default Map;

  export const Marker: React.FC<MarkerProps>;
  export const Popup: React.FC<PopupProps>;
  export const NavigationControl: React.FC<NavigationControlProps>;
  export const FullscreenControl: React.FC<FullscreenControlProps>;
  export const ScaleControl: React.FC<ScaleControlProps>;
  export const GeolocateControl: React.FC<GeolocateControlProps>;
}

declare module 'supercluster' {
  import type { BBox, GeoJsonProperties, Point, Feature } from 'geojson';

  interface ClusterFeature<P> extends Feature<Point> {
    properties: P & {
      cluster: true;
      cluster_id: number;
      point_count: number;
      point_count_abbreviated: string;
    };
  }

  interface PointFeature<P> extends Feature<Point> {
    properties: P & {
      cluster: false;
    };
  }

  interface Options<P, C> {
    minZoom?: number;
    maxZoom?: number;
    minPoints?: number;
    radius?: number;
    extent?: number;
    nodeSize?: number;
    log?: boolean;
    generateId?: boolean;
    map?: (props: P) => C;
    reduce?: (accumulated: C, props: C) => void;
  }

  class Supercluster<
    P extends GeoJsonProperties = GeoJsonProperties,
    C extends GeoJsonProperties = GeoJsonProperties,
  > {
    constructor(options?: Options<P, C>);
    load(points: Array<Feature<Point, P>>): Supercluster<P, C>;
    getClusters(bbox: BBox, zoom: number): Array<ClusterFeature<C> | PointFeature<P>>;
    getChildren(clusterId: number): Array<ClusterFeature<C> | PointFeature<P>>;
    getLeaves(clusterId: number, limit?: number, offset?: number): Array<PointFeature<P>>;
    getClusterExpansionZoom(clusterId: number): number;
  }

  export = Supercluster;
}
