import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { fmtV } from '../../store/useStore';
import { StudioUpBadge } from '../../components/StudioBadges';
import {
  formatCompactINR,
  formatHoursValue,
  formatMetricValue,
  formatPctValue,
} from './analyticsFormatters';

const INDIGO = '#4747eb';
const TYPICAL_COLOR = '#c4c7c5';

function CustomLineTooltip({ active, payload, label, metricKey }) {
  if (!active || !payload || payload.length === 0) return null;
  const mainEntry = payload.find((p) => p.dataKey === 'value') || payload[0];
  const typicalEntry = payload.find((p) => p.dataKey === 'typical');
  return (
    <div className="an26-chart-tooltip">
      <div className="an26-tt-date">{mainEntry?.payload?.fullDate || label}</div>
      <div className="an26-tt-val">{formatMetricValue(metricKey, mainEntry?.value)}</div>
      {typicalEntry && (
        <div className="an26-tt-sub">
          Typical: {formatMetricValue(metricKey, typicalEntry.value)}
        </div>
      )}
    </div>
  );
}

export function StudioLineMetricChart({
  data = [],
  metricKey = 'views',
  height = 225,
  showTypical = false,
  showProcessingZone = false,
  showUploadMarkers = false,
}) {
  const firstLabel = data[0]?.label || '';
  const lastLabel = data[data.length - 1]?.label || '';

  const processingStartLabel = useMemo(() => {
    if (!showProcessingZone || data.length < 6) return null;
    return data[Math.max(0, data.length - 5)]?.label || null;
  }, [showProcessingZone, data]);

  const processingEndLabel = useMemo(() => {
    if (!showProcessingZone || data.length === 0) return null;
    return data[data.length - 1]?.label || null;
  }, [showProcessingZone, data]);

  return (
    <div className="an26-line-chart-outer">
      <div className="an26-line-chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 2 }}>
            <defs>
              <pattern
                id="studioHatch"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="#dedede" strokeWidth="1.4" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="#ececec" strokeWidth={1} />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: '#d8d8d8' }}
              tickLine={false}
              padding={{ left: 14, right: 14 }}
              ticks={firstLabel && lastLabel && firstLabel !== lastLabel ? [firstLabel, lastLabel] : undefined}
              tick={{ fontSize: 10.5, fill: '#909090' }}
              interval="preserveStartEnd"
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={44}
              tick={{ fontSize: 10.5, fill: '#909090' }}
              tickFormatter={(v) => {
                if (metricKey === 'revenue') return formatCompactINR(v);
                if (metricKey === 'ctr') return `${Number(v).toFixed(1)}%`;
                return fmtV(v);
              }}
            />
            {processingStartLabel && processingEndLabel && (
              <ReferenceArea
                x1={processingStartLabel}
                x2={processingEndLabel}
                fill="url(#studioHatch)"
                fillOpacity={0.85}
              />
            )}
            <Tooltip content={<CustomLineTooltip metricKey={metricKey} />} />
            {showTypical && (
              <Line
                type="linear"
                dataKey="typical"
                stroke={TYPICAL_COLOR}
                strokeWidth={1.4}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="linear"
              dataKey="value"
              stroke={INDIGO}
              strokeWidth={1.65}
              dot={false}
              activeDot={{ r: 4, fill: INDIGO, stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showUploadMarkers && (
        <div className="an26-upload-markers-row" aria-hidden="true">
          <span className="an26-upload-marker" style={{ left: '34%' }}>
            <span className="material-symbols-outlined">play_arrow</span>
          </span>
          <span className="an26-upload-marker" style={{ left: '68%' }}>
            <span className="material-symbols-outlined">play_arrow</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function MiniSparklineChart({ data = [], metricKey = 'views', showProcessingZone = false }) {
  const first = data[0]?.label;
  const last = data[data.length - 1]?.label;
  const pStart = showProcessingZone && data.length > 5 ? data[data.length - 4]?.label : null;

  return (
    <div style={{ width: 155, height: 64, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <pattern
              id="miniHatch"
              width="5"
              height="5"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="5" stroke="#dedede" strokeWidth="1.2" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke="#f0f0f0" strokeWidth={1} />
          <XAxis dataKey="label" hide ticks={first && last ? [first, last] : undefined} />
          <YAxis
            orientation="right"
            axisLine={false}
            tickLine={false}
            tickCount={3}
            width={36}
            tick={{ fontSize: 9.5, fill: '#909090' }}
            tickFormatter={(v) => {
              if (metricKey === 'revenue') return formatCompactINR(v);
              if (metricKey === 'ctr') return `${Number(v).toFixed(0)}%`;
              if (metricKey === 'duration') {
                const s = Math.max(0, Math.round(Number(v || 0)));
                const m = Math.floor(s / 60);
                const rem = s % 60;
                return `${m}:${String(rem).padStart(2, '0')}`;
              }
              return fmtV(v);
            }}
          />
          {pStart && last && (
            <ReferenceArea x1={pStart} x2={last} fill="url(#miniHatch)" fillOpacity={0.85} />
          )}
          <Line
            type="linear"
            dataKey="value"
            stroke={INDIGO}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Realtime48hBarChart({ hourlyBars = [], height = 96 }) {
  const chartData = useMemo(() => {
    if (Array.isArray(hourlyBars) && hourlyBars.length > 0) {
      const len = hourlyBars.length;
      return hourlyBars.map((val, idx) => ({
        idx,
        label: idx === len - 1 ? 'Now' : `${len - idx}h ago`,
        views: typeof val === 'object' ? val.views || 0 : Number(val || 0),
      }));
    }
    return Array.from({ length: 48 }, (_, idx) => ({
      idx,
      label: idx === 47 ? 'Now' : `${48 - idx}h ago`,
      views: 0,
    }));
  }, [hourlyBars]);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="#f0f0f0" strokeWidth={1} />
          <YAxis
            orientation="right"
            axisLine={false}
            tickLine={false}
            tickCount={3}
            width={28}
            tick={{ fontSize: 9.5, fill: '#909090' }}
            tickFormatter={fmtV}
          />
          <Tooltip
            cursor={{ fill: 'rgba(71, 71, 235, 0.08)' }}
            formatter={(val) => [`${fmtV(val)} views`, 'Hourly']}
            labelFormatter={(_, p) => p?.[0]?.payload?.label || ''}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #e5e5e5',
              fontSize: '12px',
              padding: '6px 10px',
            }}
          />
          <Bar dataKey="views" fill={INDIGO} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StudioProgressList({ items = [], showRank = false }) {
  const maxPct = Math.max(1, ...items.map((it) => Number(it.pct || 0)));
  return (
    <div className="an26-progress-list">
      {items.map((item, idx) => (
        <div key={item.label || idx} className="an26-progress-row">
          <div className="an26-progress-head">
            <span className="an26-progress-name">
              {showRank ? `${idx + 1}. ` : ''}
              {item.label}
            </span>
            <span className="an26-progress-val">
              {item.display || `${Number(item.pct || 0).toFixed(1)}%`}
            </span>
          </div>
          <div className="an26-progress-track">
            <div
              className="an26-progress-fill"
              style={{ width: `${Math.min(100, (Number(item.pct || 0) / maxPct) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const SEGMENT_COLORS = ['#2d2d2d', '#4747eb', '#8b2fc9', '#d81b60'];

export function SegmentedStatList({ segments = [] }) {
  return (
    <div className="an26-seg-wrap">
      <div className="an26-seg-bar">
        {segments.map((seg, i) => (
          <div
            key={seg.label || i}
            className="an26-seg-slice"
            style={{
              width: `${Math.max(3, seg.pct || 0)}%`,
              background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }}
            title={`${seg.label}: ${seg.pct}%`}
          />
        ))}
      </div>
      <div className="an26-seg-legend">
        {segments.map((seg, i) => (
          <div key={seg.label || i} className="an26-seg-legend-row">
            <span className="an26-seg-left">
              <span
                className="an26-seg-dot"
                style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              />
              <span>{seg.label}</span>
            </span>
            <span>{seg.display || `${seg.pct}%`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HEATMAP_SHADES = ['#e6e6fa', '#b7b9f8', '#7f81f2', '#4747eb', '#211c72'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = ['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'];

export function AudienceHeatmapGrid({ matrix }) {
  const rows = useMemo(() => {
    if (Array.isArray(matrix) && matrix.length >= 12 && Array.isArray(matrix[0])) {
      return matrix.slice(0, 12);
    }
    if (Array.isArray(matrix) && matrix.length === 7 && Array.isArray(matrix[0]?.hours)) {
      return Array.from({ length: 12 }, (_, r) =>
        DAYS.map((_, c) => {
          const dayHours = matrix[c]?.hours || [];
          const h1 = Number(dayHours[r * 2]?.intensity ?? 0);
          const h2 = Number(dayHours[r * 2 + 1]?.intensity ?? 0);
          return Math.max(0, Math.min(4, Math.round(((h1 + h2) / 2) * (4 / 3))));
        })
      );
    }
    return Array.from({ length: 12 }, (_, r) =>
      DAYS.map((_, c) => {
        const peak = r >= 5 && r <= 10 ? 2 : 0;
        const wknd = c === 0 || c === 6 ? 1 : 0;
        return Math.min(4, ((r + c) % 3) + peak + (wknd && r > 6 ? 1 : 0));
      })
    );
  }, [matrix]);

  return (
    <div className="an26-heatmap">
      <div className="an26-heatmap-days">
        <span />
        {DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="an26-heatmap-grid">
        {rows.map((rowVals, rIdx) => (
          <div key={rIdx} className="an26-heatmap-row">
            <span className="an26-heatmap-time">
              {rIdx === 0
                ? TIME_SLOTS[0]
                : rIdx === 3
                ? TIME_SLOTS[1]
                : rIdx === 6
                ? TIME_SLOTS[2]
                : rIdx === 9
                ? TIME_SLOTS[3]
                : rIdx === 11
                ? TIME_SLOTS[4]
                : ''}
            </span>
            {DAYS.map((_, cIdx) => {
              const lvl = Math.max(0, Math.min(4, Number(rowVals?.[cIdx] ?? 1)));
              return (
                <div
                  key={cIdx}
                  className="an26-heatmap-cell"
                  style={{ background: HEATMAP_SHADES[lvl] }}
                  title={`${DAYS[cIdx]}: Level ${lvl + 1}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReachFunnelCard({ impressions = 0, ctr = '6.2%', views = 0, avgDuration = '4:15', watchTimeHrs = 0 }) {
  return (
    <div className="an26-vfunnel">
      {/* Vertical Tapered SVG Funnel Column on Left */}
      <svg width="56" height="196" viewBox="0 0 56 196" className="an26-vfunnel-svg" aria-hidden="true">
        <rect x="4" y="0" width="42" height="44" rx="5" fill="#4747eb" />
        <polygon points="4,44 46,44 36,78 4,78" fill="#b4b4c6" />
        <rect x="4" y="78" width="26" height="40" rx="4" fill="#4747eb" />
        <polygon points="4,118 30,118 22,152 4,152" fill="#c7c7d4" />
        <rect x="4" y="152" width="16" height="40" rx="4" fill="#4747eb" />
      </svg>

      {/* Aligned Metrics Table on Right */}
      <div className="an26-vfunnel-rows">
        <div className="an26-vf-row strong">
          <span>Thumbnail impressions</span>
          <strong>{fmtV(impressions)}</strong>
        </div>
        <div className="an26-vf-row sub">
          <span>Thumbnail click-through rate</span>
          <span>{formatPctValue(ctr)}</span>
        </div>
        <div className="an26-vf-row strong">
          <span>Engaged views from impressions</span>
          <strong>{fmtV(views)}</strong>
        </div>
        <div className="an26-vf-row sub">
          <span>Average view duration</span>
          <span>{avgDuration}</span>
        </div>
        <div className="an26-vf-row strong">
          <span>Watch time from impressions (hours)</span>
          <strong>{formatHoursValue(watchTimeHrs)}</strong>
        </div>
      </div>
    </div>
  );
}

export function NotificationFunnelCard({ pushSent = 0, ctr = '0.7%', viewsFromNotifs = 0 }) {
  return (
    <div className="an26-vfunnel an26-vfunnel-notif">
      <svg width="46" height="140" viewBox="0 0 46 140" className="an26-vfunnel-svg" aria-hidden="true">
        <rect x="4" y="0" width="26" height="44" rx="4" fill="#4747eb" />
        <polygon points="4,44 30,44 20,76 4,76" fill="#c7c7d4" />
        <rect x="4" y="76" width="16" height="46" rx="4" fill="#4747eb" />
      </svg>

      <div className="an26-vfunnel-rows" style={{ height: 124 }}>
        <div className="an26-vf-row strong">
          <div>
            <div>Mobile push notifications</div>
            <div className="an26-card-sub">Excluding inbox delivery</div>
          </div>
          <strong>{fmtV(pushSent)}</strong>
        </div>
        <div className="an26-vf-row sub">
          <div>
            <div>Notification click-through rate</div>
            <div className="an26-card-sub">Typical on YouTube: 0.5% - 2.5%</div>
          </div>
          <span>{ctr}</span>
        </div>
        <div className="an26-vf-row strong">
          <span>Views from notifications</span>
          <strong>{fmtV(viewsFromNotifs)}</strong>
        </div>
      </div>
    </div>
  );
}

export function RetentionCurveChart({
  duration = '4:15',
  showTabs = false,
  avgDuration = null,
  avgPctViewed = null,
  introRetainedPct = '50.0%',
}) {
  const [momentTab, setMomentTab] = useState('intro');
  const retentionData = useMemo(() => {
    const curve = [100, 74, 58, 49, 44, 41, 38, 35, 33, 30, 26, 21];
    return curve.map((pct, i) => ({
      pctLabel: i === 0 ? '0:00' : i === curve.length - 1 ? duration : '',
      value:
        momentTab === 'spikes'
          ? Math.min(100, pct + (i === 5 || i === 6 ? 12 : 0))
          : momentTab === 'dips'
          ? Math.max(12, pct - (i === 8 ? 8 : 0))
          : pct,
      typical: Math.min(100, Math.round(pct * 1.06)),
    }));
  }, [momentTab, duration]);

  return (
    <div>
      {avgDuration && (
        <div className="an26-ret-summary-row">
          <div>
            <strong className="an26-ret-summary-val yt-display-font">{avgDuration}</strong>
            <div className="an26-card-sub">Average view duration</div>
          </div>
          {avgPctViewed && (
            <div>
              <strong className="an26-ret-summary-val yt-display-font">{avgPctViewed}</strong>
              <div className="an26-card-sub">Average percentage viewed</div>
            </div>
          )}
        </div>
      )}

      {showTabs && (
        <>
          <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
            {[
              { key: 'intro', label: 'Intro' },
              { key: 'dips', label: 'Dips' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`an26-pill-filter ${momentTab === t.key ? 'active' : ''}`}
                onClick={() => setMomentTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div className="an26-hero-kpi-inline" style={{ gap: 6 }}>
              <strong className="yt-display-font" style={{ fontSize: 16 }}>
                {momentTab === 'dips' ? '34.2%' : introRetainedPct}
              </strong>
              <StudioUpBadge size={16} />
            </div>
            <div className="an26-card-sub">
              {momentTab === 'dips' ? 'Average viewer drop-off segment' : 'Still watching at 00:30'}
            </div>
          </div>
        </>
      )}

      <div style={{ width: '100%', height: 145 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={retentionData} margin={{ top: 8, right: 6, left: 0, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="#ececec" />
            <XAxis
              dataKey="pctLabel"
              axisLine={{ stroke: '#d8d8d8' }}
              tickLine={false}
              tick={{ fontSize: 10.5, fill: '#909090' }}
            />
            <YAxis
              orientation="right"
              domain={[0, 105]}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={34}
              tick={{ fontSize: 10.5, fill: '#909090' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip formatter={(val) => [`${val}%`, 'Retained']} />
            <Line
              type="linear"
              dataKey="typical"
              stroke="#d5d5d5"
              strokeWidth={1.3}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={INDIGO}
              strokeWidth={1.7}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="an26-ret-legend">
        <span>
          <i className="dot indigo" /> This video
        </span>
        <span>
          <i className="dot gray" /> Typical performance
        </span>
      </div>
    </div>
  );
}
