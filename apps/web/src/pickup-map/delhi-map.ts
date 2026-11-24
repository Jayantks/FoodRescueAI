import type { LngLatBoundsLike, StyleSpecification } from 'maplibre-gl';

export type Position = [longitude: number, latitude: number];

export const delhiBounds: LngLatBoundsLike = [[76.93, 28.44], [77.46, 28.82]];

export function delhiStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    glyphs: origin + '/maps/fonts/{fontstack}/{range}.pbf',
    sources: {
      delhi: {
        type: 'vector',
        url: 'pmtiles://' + origin + '/maps/delhi.pmtiles',
        attribution: '<a href="https://github.com/protomaps/basemaps" target="_blank" rel="noopener noreferrer">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f1efe8' } },
      {
        id: 'landuse', type: 'fill', source: 'delhi', 'source-layer': 'landuse',
        paint: { 'fill-color': ['match', ['get', 'kind'],
          ['park', 'garden', 'forest', 'wood', 'nature_reserve', 'golf_course'], '#d5e4ce',
          ['farmland', 'grass', 'meadow', 'recreation_ground', 'pitch'], '#e3ead7',
          ['commercial', 'industrial', 'aerodrome', 'railway'], '#e9e5de',
          '#eeebe3'] },
      },
      {
        id: 'water', type: 'fill', source: 'delhi', 'source-layer': 'water',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#aed5df' },
      },
      {
        id: 'waterways', type: 'line', source: 'delhi', 'source-layer': 'water',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#aed5df', 'line-width': 1.35 },
      },
      {
        id: 'buildings', type: 'fill', source: 'delhi', 'source-layer': 'buildings', minzoom: 12,
        paint: { 'fill-color': '#e2ddd3', 'fill-opacity': 0.67 },
      },
      {
        id: 'local-roads', type: 'line', source: 'delhi', 'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'minor_road'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#fffdf9', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 13, 1.3, 16, 2.7] },
      },
      {
        id: 'railway', type: 'line', source: 'delhi', 'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'rail'],
        paint: { 'line-color': '#b7ada6', 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': 0.67 },
      },
      {
        id: 'major-road-outline', type: 'line', source: 'delhi', 'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#d5c6ae', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.35, 13, 3.1, 16, 6] },
      },
      {
        id: 'major-roads', type: 'line', source: 'delhi', 'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'kind_detail'], ['motorway', 'trunk'], '#edbf96', 'primary', '#f9d9a6', '#fff8e9'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.85, 13, 2.2, 16, 4.5],
        },
      },
      {
        id: 'place-labels', type: 'symbol', source: 'delhi', 'source-layer': 'places',
        filter: ['all', ['has', 'name'], ['in', ['get', 'kind'], ['literal', ['locality', 'macrohood', 'neighbourhood']]]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'], 'text-size': ['match', ['get', 'kind'], 'locality', 14, 11],
          'text-max-width': 10, 'text-padding': 5,
          'symbol-sort-key': ['coalesce', ['get', 'sort_rank'], 99],
        },
        paint: { 'text-color': '#5b625b', 'text-halo-color': '#faf8f2', 'text-halo-width': 1.4 },
      },
    ],
  };
}
