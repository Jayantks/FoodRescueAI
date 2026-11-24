import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapPin, Scan } from 'lucide-react';
import { LngLatBounds, Map as MapLibre, Marker, NavigationControl, addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDate, timeLabel, type PickupStatus, type PickupStop } from '../demo';
import { Badge } from '../ui';
import { delhiBounds, delhiStyle, type Position } from './delhi-map';
import './pickup-map.css';

interface MapGroup {
  position: Position;
  stops: PickupStop[];
}

const demoPoints: Readonly<Record<string, Position>> = {
  '1041': [77.216, 28.638],
  '1040': [77.126, 28.648],
  '1039': [77.245, 28.599],
};

const demoAreas: Readonly<Record<string, Position>> = {
  'central district': [77.209, 28.622],
  'west district': [77.112, 28.659],
  'north district': [77.216, 28.681],
  'south district': [77.211, 28.561],
};

const statusColors: Record<PickupStatus, string> = {
  'Awaiting assignment': '#a35c1d',
  Scheduled: '#22688a',
  'En route': '#3157a2',
  Collected: '#7a4a96',
  Received: '#316549',
};

function mapPosition(stop: PickupStop): Position | undefined {
  const { id, area } = stop.donation;
  const areaKey = area.trim().toLowerCase();
  return (Object.hasOwn(demoPoints, id) ? demoPoints[id] : undefined)
    ?? (Object.hasOwn(demoAreas, areaKey) ? demoAreas[areaKey] : undefined);
}

function groupStops(stops: PickupStop[]) {
  const groups = new Map<string, MapGroup>();
  for (const stop of stops) {
    const position = mapPosition(stop);
    if (!position) continue;
    const key = position.join(',');
    const group = groups.get(key);
    if (group) group.stops.push(stop);
    else groups.set(key, { position, stops: [stop] });
  }
  return [...groups.values()];
}

const protocol = new Protocol();
addProtocol('pmtiles', protocol.tile);

function PickupMapViewport({ groups, focusId, selectedId, choose }: {
  groups: MapGroup[];
  focusId: string | undefined;
  selectedId: string | undefined;
  choose: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const markers = useRef<Array<{ marker: Marker; element: HTMLButtonElement; group: MapGroup }>>([]);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  function fitAll() {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new LngLatBounds();
    for (const group of groups) bounds.extend(group.position);
    if (groups.length <= 1) {
      map.jumpTo({ center: groups[0]?.position ?? [77.208, 28.625], zoom: 11 });
      return;
    }
    const sidePadding = map.getContainer().clientWidth < 480 ? 72 : 104;
    map.fitBounds(bounds, { padding: { top: 76, bottom: 49, left: sidePadding, right: sidePadding }, maxZoom: 12, duration: 0 });
  }

  useEffect(() => {
    if (!container.current) return;
    let map: MapLibre;
    try {
      map = new MapLibre({
        container: container.current,
        style: delhiStyle(window.location.origin),
        center: [77.208, 28.625],
        zoom: 11,
        minZoom: 10,
        maxZoom: 16,
        maxBounds: delhiBounds,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false,
        scrollZoom: false,
        attributionControl: { compact: false },
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.once('load', () => { setReady(true); setFailed(false); });
    map.on('error', () => setFailed(true));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = groups.map((group) => {
      const first = group.stops[0];
      const status = group.stops.every(({ pickup }) => pickup.status === first.pickup.status) ? first.pickup.status : undefined;
      const label = group.stops.length === 1 ? first.donation.name : first.donation.area + ' · ' + group.stops.length + ' pickups';
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'pickup-map-marker';
      element.setAttribute('aria-label', 'Show ' + label + (status ? ', ' + status : ''));
      element.title = label;
      element.style.setProperty('--pin-color', status ? statusColors[status] : '#654581');
      const dot = document.createElement('span');
      dot.className = 'pickup-map-marker-dot';
      const text = document.createElement('span');
      text.className = 'pickup-map-marker-label';
      text.textContent = label;
      element.append(dot, text);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        choose(first.pickup.id);
      });
      const marker = new Marker({ element, anchor: 'center' }).setLngLat(group.position).addTo(map);
      return { marker, element, group };
    });
    markers.current = next;
    fitAll();

    return () => next.forEach(({ marker }) => marker.remove());
  }, [groups, choose]);

  useEffect(() => {
    for (const { element, group } of markers.current) {
      element.setAttribute('aria-pressed', String(group.stops.some(({ pickup }) => pickup.id === selectedId)));
    }
  }, [groups, selectedId]);

  useEffect(() => {
    const group = focusId && groups.find(({ stops }) => stops.some(({ pickup }) => pickup.id === focusId));
    if (group) mapRef.current?.panTo(group.position, { duration: 0 });
  }, [focusId, groups]);

  return <div className="pickup-map-frame">
    <div className="pickup-map-canvas" ref={container} aria-label="Pickup locations in Delhi" />
    {(!failed || ready) && <button className="pickup-map-fit icon-button" type="button" onClick={fitAll} aria-label="Fit all pickups" title="Fit all pickups">
      <Scan size={19} />
    </button>}
    {!ready && <div className="pickup-map-message" role="status">
      {failed ? 'The map could not load. Select a pickup to see its details.' : 'Loading map…'}
    </div>}
  </div>;
}

export default function PickupMap({ stops, renderDetails }: {
  stops: PickupStop[];
  renderDetails: (stop: PickupStop) => ReactNode;
}) {
  const [focusId, choose] = useState<string>();
  const groups = useMemo(() => groupStops(stops), [stops]);
  const selected = stops.find(({ pickup }) => pickup.id === focusId) ?? stops[0];
  const mapped = groups.reduce((total, group) => total + group.stops.length, 0);
  const statuses = [...new Set(groups.flatMap(({ stops }) => stops.map(({ pickup }) => pickup.status)))];

  return <div className="pickup-map-layout">
    <section className="panel pickup-map-panel" aria-labelledby="pickup-map-title">
      <div className="panel-header pickup-map-heading">
        <div><h2 id="pickup-map-title">Pickup map</h2><p>Approximate demo locations in Delhi</p></div>
        <span className="pickup-map-count">{mapped} of {stops.length} mapped</span>
      </div>
      <PickupMapViewport groups={groups} focusId={focusId} selectedId={selected?.pickup.id} choose={choose} />
      <div className="pickup-map-legend" aria-label="Pickup status colors">
        {statuses.map((status) => <span key={status}><i style={{ backgroundColor: statusColors[status] }} />{status}</span>)}
        {groups.some(({ stops }) => new Set(stops.map(({ pickup }) => pickup.status)).size > 1) && <span><i style={{ backgroundColor: '#654581' }} />Mixed statuses</span>}
        {!mapped && <span>No map locations for these pickups.</span>}
      </div>
    </section>
    <div className="pickup-map-sidebar">
      <section className="panel pickup-stop-panel" aria-labelledby="pickup-stops-title">
        <div className="panel-header"><div><h2 id="pickup-stops-title">Pickup stops</h2><p>Select a stop for its details.</p></div></div>
        <div className="pickup-stop-list">
          {stops.map(({ pickup, donation }) => <button type="button" key={pickup.id} className="pickup-stop"
            aria-pressed={selected?.pickup.id === pickup.id} onClick={() => choose(pickup.id)}>
            <span className="pickup-stop-icon"><MapPin size={17} aria-hidden="true" /></span>
            <span className="pickup-stop-name"><strong>{donation.name}</strong>
              <small>{formatDate(pickup.at)} · {timeLabel(pickup.at)}{mapPosition({ pickup, donation }) ? '' : ' · No map location'}</small></span>
            <Badge status={pickup.status} />
          </button>)}
        </div>
      </section>
      {selected && <div className="pickup-stop-details" aria-live="polite">{renderDetails(selected)}</div>}
    </div>
  </div>;
}
