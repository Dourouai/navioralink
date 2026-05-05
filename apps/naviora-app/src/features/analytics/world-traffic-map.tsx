"use client";

import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countriesTopology from "world-atlas/countries-110m.json";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorldTrafficMapProps {
  title: string;
  body: string;
  locale: string;
  scansLabel: string;
  rows: Array<{ label: string; scans: number; share: string }>;
}

type GeoPoint = [number, number];

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 420;
const MAP_PADDING = 28;
const MAP_MARKER_LIMIT = 5;
const DETAIL_SCROLL_THRESHOLD = 5;
const regionCoordinates: Record<string, GeoPoint> = {
  "United States": [-98, 39],
  China: [104, 35],
  Japan: [138, 36],
  Taiwan: [121, 23.7],
  "Hong Kong": [114.2, 22.3],
  Singapore: [103.8, 1.35],
};

const regionLabelOffsets: Record<string, { dx: number; dy: number }> = {
  "United States": { dx: 18, dy: -14 },
  China: { dx: 18, dy: -12 },
  Japan: { dx: 18, dy: -12 },
  Taiwan: { dx: 18, dy: -2 },
  "Hong Kong": { dx: 18, dy: 12 },
  Singapore: { dx: 18, dy: 16 },
};

const worldTopology = countriesTopology as unknown as {
  objects: {
    countries: unknown;
  };
};

const worldFeatureCollection = feature(
  worldTopology as never,
  worldTopology.objects.countries as never,
) as { features: unknown[] };

const projection = geoNaturalEarth1().fitExtent(
  [
    [MAP_PADDING, MAP_PADDING],
    [VIEWBOX_WIDTH - MAP_PADDING, VIEWBOX_HEIGHT - MAP_PADDING],
  ],
  worldFeatureCollection,
);

const pathGenerator = geoPath(projection);
const graticulePath = pathGenerator(geoGraticule10());

function projectPoint([lon, lat]: GeoPoint) {
  const [x, y] = projection([lon, lat]) ?? [VIEWBOX_WIDTH / 2, VIEWBOX_HEIGHT / 2];
  return { x, y };
}

export function WorldTrafficMap({ title, body, locale, scansLabel, rows }: WorldTrafficMapProps) {
  const markerRows = rows.slice(0, MAP_MARKER_LIMIT);
  const maxScans = Math.max(...markerRows.map((row) => row.scans), 1);
  const mappedRows = markerRows
    .map((row, index) => {
      const coordinate = regionCoordinates[row.label];
      if (!coordinate) return null;

      const position = projectPoint(coordinate);
      return {
        ...row,
        index,
        x: position.x,
        y: position.y,
        radius: 9 + (row.scans / maxScans) * 16,
        labelWidth: Math.max(92, row.label.length * 7.5 + 24),
      };
    })
    .filter(Boolean) as Array<{ label: string; scans: number; share: string; index: number; x: number; y: number; radius: number; labelWidth: number }>;

  return (
    <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.98))] p-5 ring-1 ring-[rgba(190,206,226,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{body}</p>
        </div>
        <Badge tone="info">{rows.length}</Badge>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] p-4 ring-1 ring-[rgba(190,206,226,0.55)] shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
          <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full">
            <defs>
              <linearGradient id="worldSurface" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fdfefe" />
                <stop offset="100%" stopColor="#f3f8fe" />
              </linearGradient>
              <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#189fe0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#189fe0" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="28" fill="url(#worldSurface)" />

            {Array.from({ length: 9 }, (_, index) => (
              <line
                key={`h-${index}`}
                x1="0"
                y1={40 + index * 40}
                x2={VIEWBOX_WIDTH}
                y2={40 + index * 40}
                stroke="rgba(115,146,181,0.08)"
                strokeDasharray="3 8"
              />
            ))}
            {Array.from({ length: 11 }, (_, index) => (
              <line
                key={`v-${index}`}
                x1={40 + index * 70}
                y1="0"
                x2={40 + index * 70}
                y2={VIEWBOX_HEIGHT}
                stroke="rgba(115,146,181,0.06)"
                strokeDasharray="3 8"
              />
            ))}

            {graticulePath ? (
              <path d={graticulePath} fill="none" stroke="rgba(115,146,181,0.12)" strokeWidth="0.8" />
            ) : null}

            {worldFeatureCollection.features.map((shape, index) => (
              <path
                key={index}
                d={pathGenerator(shape as never) ?? undefined}
                fill="#4a9cca"
                fillOpacity={0.96}
                stroke="#3c8cb7"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            ))}

            {mappedRows.map((row) => {
              const offset = regionLabelOffsets[row.label] ?? { dx: 14, dy: -14 };
              const labelX = Math.min(Math.max(10, row.x + offset.dx), VIEWBOX_WIDTH - row.labelWidth - 10);
              const labelY = Math.min(Math.max(26, row.y + offset.dy), VIEWBOX_HEIGHT - 34);
              const leaderToX = offset.dx >= 0 ? labelX : labelX + row.labelWidth;
              const leaderToY = labelY + 14;

              return (
                <g key={row.label}>
                  <circle cx={row.x} cy={row.y} r={row.radius + 18} fill="url(#hotspotGlow)" opacity="0.9" />
                  <circle cx={row.x} cy={row.y} r={row.radius + 6} fill="rgba(24,159,224,0.14)" />
                  <circle cx={row.x} cy={row.y} r={row.radius} fill={row.index === 0 ? "#1a7cf0" : "#1db5e8"} fillOpacity="0.96" />
                  <circle cx={row.x} cy={row.y} r="3.2" fill="#ffffff" />
                  <path d={`M${row.x} ${row.y} L${leaderToX} ${leaderToY}`} stroke="rgba(45,97,151,0.42)" strokeWidth="1.1" strokeLinecap="round" />
                  <g transform={`translate(${labelX} ${labelY})`}>
                    <rect width={row.labelWidth} height="28" rx="14" fill="rgba(255,255,255,0.94)" stroke="rgba(134,168,204,0.5)" />
                    <text x="12" y="18" fill="#1e293b" fontSize="12" fontWeight="600">{row.label}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div
          className={cn(
            "min-h-0 space-y-3",
            rows.length > DETAIL_SCROLL_THRESHOLD && "soft-scrollbar max-h-[420px] overflow-y-auto pr-2",
          )}
        >
          {rows.map((row, index) => (
            <div key={row.label} className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: index === 0 ? "linear-gradient(135deg,#8d79ff 0%,#5f95ff 100%)" : "linear-gradient(135deg,#1abef3 0%,#3f8cff 100%)" }}
                  >
                    {index + 1}
                  </span>
                  <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                </div>
                <Badge tone="info">{row.share}</Badge>
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {new Intl.NumberFormat(locale).format(row.scans)} {scansLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
