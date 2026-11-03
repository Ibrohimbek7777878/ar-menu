// Zal rejasi (SVG): stollar x, y, w, h bo'yicha joylashadi, hamma koordinata viewBox'ga masshtablanadi.
// Bo'sh stol tanlanadi; band/mos emas stollar xira va tanlanmaydi (aria-disabled); tanlangani ajralib turadi.
import React, { useMemo } from 'react';
import { t } from '../../i18n';
import { isPlaced, planBox, planMinWidth, tableShape, type TableAvailability } from './availability';
import { hallName, tableStateLabel, tableTitle } from './labels';
import type { BookingHall, BookingTable } from './types';

interface FloorPlanProps {
  hall: BookingHall;
  /** Stol holatlari; bo'sh xarita = availability hali yuklanmagan */
  states: ReadonlyMap<number, TableAvailability>;
  selectedId: number | null;
  onPick: (table: BookingTable, el: Element) => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({ hall, states, selectedId, onPick }) => {
  const placed = useMemo(() => hall.tables.filter(isPlaced), [hall.tables]);
  const box = useMemo(() => planBox(placed), [placed]);
  if (!box) return null;
  const minWidth = planMinWidth(box, placed);
  const pad = Math.min(...placed.map((tb) => Math.min(tb.w, tb.h))) * 0.35;

  return (
    <div className="bk-plan-scroll">
      <svg
        className="bk-plan"
        viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
        style={{ minWidth }}
        role="group"
        aria-label={t('{hall} rejasi', { hall: hallName(hall.name) })}
      >
        <rect className="bk-floor" x={box.minX + pad * 0.3} y={box.minY + pad * 0.3} width={box.width - pad * 0.6} height={box.height - pad * 0.6} rx={pad} />
        {placed.map((tb) => {
          const info = states.get(tb.id);
          const state = info?.state ?? 'unknown';
          const free = state === 'free';
          const selected = tb.id === selectedId && free;
          const minDim = Math.min(tb.w, tb.h);
          const cx = tb.x + tb.w / 2;
          const cy = tb.y + tb.h / 2;
          const big = minDim * 0.3;
          const small = big * 0.62;
          const round = tableShape(tb.shape) === 'round';
          const label = `${tableTitle(tb.number)}, ${t("{n} kishigacha", { n: tb.capacity })}, ${selected ? t('tanlangan') : tableStateLabel(state)}`;
          const handle = (el: Element) => {
            if (free) onPick(tb, el);
          };
          return (
            <g
              key={tb.id}
              className={`bk-tbl bk-tbl--${selected ? 'selected' : state}`}
              role="button"
              tabIndex={free ? 0 : -1}
              aria-label={label}
              aria-pressed={free ? selected : undefined}
              aria-disabled={!free || undefined}
              onClick={(e) => handle(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handle(e.currentTarget);
                }
              }}
            >
              {round ? (
                <>
                  <ellipse className="bk-tbl-ring" cx={cx} cy={cy} rx={tb.w / 2 + minDim * 0.08} ry={tb.h / 2 + minDim * 0.08} />
                  <ellipse className="bk-tbl-body" cx={cx} cy={cy} rx={tb.w / 2} ry={tb.h / 2} />
                </>
              ) : (
                <>
                  <rect className="bk-tbl-ring" x={tb.x - minDim * 0.08} y={tb.y - minDim * 0.08} width={tb.w + minDim * 0.16} height={tb.h + minDim * 0.16} rx={minDim * 0.24} />
                  <rect className="bk-tbl-body" x={tb.x} y={tb.y} width={tb.w} height={tb.h} rx={minDim * 0.18} />
                </>
              )}
              <text className="bk-tbl-num" x={cx} y={cy - small * 0.35} fontSize={big} textAnchor="middle" dominantBaseline="central">
                {tb.number}
              </text>
              <g className="bk-tbl-cap" transform={`translate(${cx - small * 0.55} ${cy + big * 0.8})`}>
                <circle cx={0} cy={-small * 0.28} r={small * 0.22} />
                <path d={`M ${-small * 0.42} ${small * 0.36} a ${small * 0.42} ${small * 0.42} 0 0 1 ${small * 0.84} 0 z`} />
                <text x={small * 0.62} y={small * 0.1} fontSize={small} dominantBaseline="central">
                  {tb.capacity}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
