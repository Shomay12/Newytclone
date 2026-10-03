import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore, fmtV, fmtW, fmtS, formatINR } from '../store/useStore';
import { parseAvdToSeconds, formatSecondsToAvd } from '../services/InsforgeService';
import { formatDateRangeText, formatSingleDate, interpolateCurve } from '../engine/AnalyticsSimulationEngine';
import './CRM.css';

// ── helpers ──────────────────────────────────────────────────────────────────
const parseSmartNumber = (val, fallback = 0) => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/,/g, '');
  if (/^[-+]?[0-9]*\.?[0-9]+[kK]$/i.test(cleaned)) {
    return parseFloat(cleaned) * 1_000;
  }
  if (/^[-+]?[0-9]*\.?[0-9]+[mM]$/i.test(cleaned)) {
    return parseFloat(cleaned) * 1_000_000;
  }
  if (/^[-+]?[0-9]*\.?[0-9]+[bB]$/i.test(cleaned)) {
    return parseFloat(cleaned) * 1_000_000_000;
  }
  if (/^[-+]?[0-9]*\.?[0-9]+[lL]$/i.test(cleaned)) {
    return parseFloat(cleaned) * 100_000;
  }
  if (/^[-+]?[0-9]*\.?[0-9]+[cC][rR]?$/i.test(cleaned)) {
    return parseFloat(cleaned) * 10_000_000;
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
};

const fmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(2)}K`
  : String(Math.round(n));

const fmtINR = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRESET_THUMBNAILS = [
  { label: 'Studio Neon 1', url: '/thumbnails/1.webp' },
  { label: 'Studio Neon 2', url: '/thumbnails/2.webp' },
  { label: 'Studio Neon 3', url: '/thumbnails/3.webp' },
  { label: 'AI Neural Core', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80' },
  { label: 'Abstract 3D Waves', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' },
  { label: 'Cyberpunk Setup', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80' },
  { label: 'Tech Workspace', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80' },
  { label: 'Matrix Code', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80' }
];

export function computeDatesForPreset(presetKey, anchorDate) {
  const cleanAnchor = anchorDate ? anchorDate.split('T')[0] : '2026-09-18';
  const today = new Date(`${cleanAnchor}T00:00:00Z`);
  const formatDate = (d) => d.toISOString().split('T')[0];
  const subDays = (d, count) => {
    const res = new Date(d);
    res.setUTCDate(res.getUTCDate() - count);
    return res;
  };
  const todayStr = formatDate(today);

  if (presetKey === 'last28') {
    return { start: formatDate(subDays(today, 27)), end: todayStr };
  }
  if (presetKey === 'last7') {
    return { start: formatDate(subDays(today, 6)), end: todayStr };
  }
  if (presetKey === 'last90') {
    return { start: formatDate(subDays(today, 89)), end: todayStr };
  }
  if (presetKey === '365') {
    return { start: formatDate(subDays(today, 364)), end: todayStr };
  }
  if (presetKey === 'lifetime' || presetKey === 'since_published') {
    return { start: '2023-02-11', end: '2026-10-02' };
  }
  if (presetKey === '2026') {
    return { start: '2026-01-01', end: todayStr };
  }
  if (presetKey === '2025') {
    return { start: '2025-01-01', end: '2025-12-31' };
  }
  if (presetKey === 'august') {
    return { start: '2026-08-01', end: todayStr > '2026-08-31' ? '2026-08-31' : todayStr };
  }
  if (presetKey === 'july') {
    return { start: '2026-07-01', end: '2026-07-31' };
  }
  if (presetKey === 'june') {
    return { start: '2026-06-01', end: '2026-06-30' };
  }
  return null;
}

// ── sub-components ───────────────────────────────────────────────────────────
const StatPreview = ({ label, value, color = '#a78bfa' }) => (
  <div className="crm-stat-preview">
    <span className="crm-stat-label">{label}</span>
    <span className="crm-stat-value" style={{ color }}>{value}</span>
  </div>
);

const CRMInput = ({ label, value, onChange, type = 'number', min, max, step = 1, unit, placeholder, onKeyDown }) => {
  const [localVal, setLocalVal] = useState(value !== undefined && value !== null ? String(value) : '');
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalVal(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  const handleChange = (e) => {
    const text = e.target.value;
    setLocalVal(text);
    if (type === 'number') {
      if (text.trim() === '' || text === '-') {
        onChange(0);
      } else {
        const num = parseSmartNumber(text, null);
        if (num !== null) {
          onChange(num);
        }
      }
    } else {
      onChange(text);
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    if (type === 'number') {
      const num = parseSmartNumber(localVal, value ?? 0);
      onChange(num);
      setLocalVal(String(num));
    }
  };

  return (
    <div className="crm-field">
      <label className="crm-field-label">{label}{unit && <span className="crm-unit">{unit}</span>}</label>
      <input
        className="crm-input"
        type={type === 'number' ? 'text' : type}
        placeholder={placeholder}
        value={localVal}
        min={min}
        max={max}
        step={step}
        onFocus={() => { isFocused.current = true; }}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

// ── Visual Interactive Curve Preview & Sculptor Canvas ────────────────────────
function VisualCurveCanvas({
  nodes = [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 1.2],
  hardness = 1.4,
  color = '#38bdf8',
  onNodeChange = null,
  editable = true
}) {
  const svgRef = useRef(null);
  const [activeDragIdx, setActiveDragIdx] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const width = 560;
  const height = 150;
  const padding = 20;
  const count = 50;
  const points = [];

  for (let i = 0; i <= count; i++) {
    const progress = i / count;
    const val = interpolateCurve(nodes, progress, hardness);
    points.push({ progress, val });
  }

  const maxVal = Math.max(...points.map(p => p.val), ...nodes.map(n => Math.pow(Math.max(0.02, Number(n)), hardness)), 1.0);
  const pathD = points.map((p, idx) => {
    const x = padding + p.progress * (width - 2 * padding);
    const y = height - padding - (p.val / maxVal) * (height - 2 * padding);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const fillD = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const nodeLabels = nodes.length === 7
    ? ['Start (Data)', 'Early Surge', 'Dip 1', 'Main Peak', 'Dip 2', 'Late Surge', 'Today (Data)']
    : nodes.map((_, idx) => idx === 0 ? 'Start' : (idx === nodes.length - 1 ? 'Today' : `N${idx + 1}`));

  const calculateNodeValFromY = (clientY) => {
    if (!svgRef.current) return 1.0;
    const rect = svgRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    const clampedY = Math.max(padding, Math.min(height - padding, relY));
    const normalizedY = 1.0 - (clampedY - padding) / (height - 2 * padding);
    const rawVal = Math.max(0.1, normalizedY * maxVal);
    const nodeVal = Math.pow(rawVal, 1 / (Number(hardness) || 1.0));
    return parseFloat(Math.min(10.0, Math.max(0.1, nodeVal)).toFixed(1));
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientY === undefined) return;

      if (activeDragIdx !== null && onNodeChange) {
        const newVal = calculateNodeValFromY(clientY);
        onNodeChange(activeDragIdx, newVal);
      } else if (drawMode && svgRef.current && onNodeChange && clientX !== undefined) {
        if (e.buttons === 1 || (e.touches && e.touches.length > 0)) {
          const rect = svgRef.current.getBoundingClientRect();
          const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
          const progress = relX / (rect.width || 1);
          const targetNodeIdx = Math.min(nodes.length - 1, Math.max(0, Math.round(progress * (nodes.length - 1))));
          const newVal = calculateNodeValFromY(clientY);
          onNodeChange(targetNodeIdx, newVal);
        }
      }
    };

    const handlePointerUp = () => {
      setActiveDragIdx(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeDragIdx, drawMode, nodes, hardness, maxVal, onNodeChange]);

  return (
    <div style={{ background: '#0a0a14', borderRadius: '12px', padding: '16px', border: '1px solid #1e1e38', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontWeight: 700, fontSize: '13px' }}>● Interactive Waveform Sculptor</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>(Drag circles up/down on chart or use draw mode)</span>
        </div>
        {editable && onNodeChange && (
          <button
            type="button"
            className={`crm-btn ${drawMode ? 'crm-btn-edit active-pill' : 'crm-btn-cancel'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={() => setDrawMode(!drawMode)}
          >
            {drawMode ? '✏️ Freehand Drawing Active' : '✍️ Enable Freehand Draw'}
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', cursor: drawMode ? 'crosshair' : 'default', userSelect: 'none' }}
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1a1a2e" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1a1a2e" strokeDasharray="3 3" />

        {/* Fill Area */}
        <path d={fillD} fill={`url(#grad-${color.replace('#', '')})`} />
        {/* Curve Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />

        {/* Node Control Handles */}
        {nodes.map((nVal, nIdx) => {
          const p = nIdx / (nodes.length - 1);
          const rawVal = Math.pow(Math.max(0.02, Number(nVal)), hardness);
          const x = padding + p * (width - 2 * padding);
          const y = height - padding - (rawVal / maxVal) * (height - 2 * padding);
          const isAnchor = nIdx === 0 || nIdx === nodes.length - 1;
          const isDragging = activeDragIdx === nIdx;

          return (
            <g
              key={nIdx}
              style={{ cursor: editable ? 'ns-resize' : 'default' }}
              onMouseDown={(e) => {
                if (editable && !drawMode) {
                  e.preventDefault();
                  setActiveDragIdx(nIdx);
                }
              }}
              onTouchStart={(e) => {
                if (editable && !drawMode) {
                  setActiveDragIdx(nIdx);
                }
              }}
            >
              {/* Target Hit Box */}
              <circle cx={x} cy={y} r={16} fill="transparent" />
              {/* Outer Glow on drag */}
              {isDragging && <circle cx={x} cy={y} r={12} fill={color} opacity={0.3} />}
              {/* Node Circle */}
              <circle
                cx={x}
                cy={y}
                r={isDragging ? 8 : (isAnchor ? 6 : 7)}
                fill={isAnchor ? '#94a3b8' : color}
                stroke="#0a0a14"
                strokeWidth={2.5}
              />
              {/* Value Pill */}
              <text
                x={x}
                y={Math.max(14, y - 9)}
                fill={isDragging ? '#38bdf8' : (isAnchor ? '#94a3b8' : '#fff')}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {Number(nVal).toFixed(1)}x
              </text>
              <text x={x} y={height - 4} fill="#64748b" fontSize="8.5" textAnchor="middle">
                {nodeLabels[nIdx]}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
        <span>📅 Start Point (Data-Locked)</span>
        <span style={{ color }}>{editable ? '↕ Click & Drag nodes vertically to shape spikes' : ''}</span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>🎯 End Point (Realtime Velocity)</span>
      </div>
    </div>
  );
}

// ── Main CRM Component ────────────────────────────────────────────────────────
export default function CRM() {
  const {
    channelInfo, videos,
    simulationAnchorDate, selectedDateRange, customStartDate, customEndDate,
    setSimulationAnchorDate, setDateRange,
    graphSettings, updateGraphSettings, updateVideoGraphConfig,
    crmUpdateChannelMetrics, updateVideoMetrics,
    bulkSetVideoRPM, bulkMultiplyViews,
    crmApplyPreset, reloadFromSpreadsheet,
    showToast
  } = useStore();

  const [activeSection, setActiveSection] = useState('growth');
  const [videoSearch, setVideoSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [bulkRPM, setBulkRPM] = useState(33.64);
  const [bulkFactor, setBulkFactor] = useState(1.0);

  // Date Range Draft State
  const [dateDraft, setDateDraft] = useState({
    anchorDate: simulationAnchorDate || '2026-09-18',
    startDate: customStartDate || '2026-08-22',
    endDate: customEndDate || '2026-09-18',
    preset: selectedDateRange || 'last28'
  });

  // Graph Controls State (Channel & Per-Video with 7-Node Curve Sculptor)
  const [selectedGraphVideoId, setSelectedGraphVideoId] = useState(videos[0]?.id || 'vid_01');

  const [channelGraphDraft, setChannelGraphDraft] = useState({
    spikiness: graphSettings?.channel?.spikiness ?? 1.0,
    algoFrequency: graphSettings?.channel?.algoFrequency ?? 1.0,
    uploadSurge: graphSettings?.channel?.uploadSurge ?? 1.0,
    hardness: graphSettings?.channel?.hardness ?? 1.4,
    nodes: graphSettings?.channel?.nodes ?? [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 1.2],
    preset: graphSettings?.channel?.preset ?? 'spiky'
  });

  const [videoGraphDraft, setVideoGraphDraft] = useState({
    launchSpike: 4.5,
    spikiness: 1.0,
    algoFrequency: 1.0,
    decayRate: 1.0,
    hardness: 1.4,
    nodes: [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 1.0],
    preset: 'standard'
  });

  useEffect(() => {
    if (graphSettings?.channel) {
      setChannelGraphDraft({
        spikiness: graphSettings.channel.spikiness ?? 1.0,
        algoFrequency: graphSettings.channel.algoFrequency ?? 1.0,
        uploadSurge: graphSettings.channel.uploadSurge ?? 1.0,
        hardness: graphSettings.channel.hardness ?? 1.4,
        nodes: graphSettings.channel.nodes ?? [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 1.2],
        preset: graphSettings.channel.preset ?? 'spiky'
      });
    }
  }, [graphSettings?.channel]);

  useEffect(() => {
    const vCfg = graphSettings?.perVideo?.[selectedGraphVideoId] || graphSettings?.videoDefaults || {
      launchSpike: 4.5,
      spikiness: 1.0,
      algoFrequency: 1.0,
      decayRate: 1.0,
      hardness: 1.4,
      nodes: [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 1.0],
      preset: 'standard'
    };
    setVideoGraphDraft({
      launchSpike: vCfg.launchSpike ?? 4.5,
      spikiness: vCfg.spikiness ?? 1.0,
      algoFrequency: vCfg.algoFrequency ?? 1.0,
      decayRate: vCfg.decayRate ?? 1.0,
      hardness: vCfg.hardness ?? 1.4,
      nodes: vCfg.nodes && vCfg.nodes.length >= 2 ? vCfg.nodes : [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 1.0],
      preset: vCfg.preset ?? 'standard'
    });
  }, [selectedGraphVideoId, graphSettings?.perVideo, graphSettings?.videoDefaults]);

  useEffect(() => {
    setDateDraft({
      anchorDate: simulationAnchorDate || '2026-09-18',
      startDate: customStartDate || '2026-08-22',
      endDate: customEndDate || '2026-09-18',
      preset: selectedDateRange || 'last28'
    });
  }, [simulationAnchorDate, customStartDate, customEndDate, selectedDateRange]);

  // Selected video for dedicated Video Growth & Thumbnails section
  const [selectedVideoId, setSelectedVideoId] = useState(videos[0]?.id || 'vid_01');
  const [selectedVideoDraft, setSelectedVideoDraft] = useState({
    thumbnail: videos[0]?.thumbnail || '/thumbnails/1.webp',
    duration: videos[0]?.duration || '10:18',
    durationSecs: videos[0]?.durationSecs || 618,
    publishDate: videos[0]?.publishDate || videos[0]?.date || '2026-08-16',
    subscribersGained: videos[0]?.subscribersGained || 29800,
    subscribersLost: videos[0]?.subscribersLost || 3576,
    views: videos[0]?.views || 2130000,
    likes: videos[0]?.likes || 98000,
    comments: videos[0]?.comments || 7240,
    rpm: videos[0]?.rpm || 33.64,
    avgViewDuration: videos[0]?.avgViewDuration || '1:45',
    avgViewDurationSecs: videos[0]?.avgViewDurationSecs || 105,
    title: videos[0]?.title || ''
  });

  const fileInputRef = useRef(null);

  const [channelDraft, setChannelDraft] = useState({
    subscribers: channelInfo?.subscribers ?? 412850,
    subscribersGainedLast28Days: channelInfo?.subscribersGainedLast28Days ?? 214,
    viewsLast28Days: channelInfo?.viewsLast28Days ?? 1250000,
    watchTimeLast28Days: channelInfo?.watchTimeLast28Days ?? 1383.8,
    revenueLast28Days: channelInfo?.revenueLast28Days ?? 42050.00,
    name: channelInfo?.name || 'Kids Toon',
    avatar: channelInfo?.avatar || '',
  });

  useEffect(() => {
    if (channelInfo) {
      setChannelDraft({
        subscribers: channelInfo.subscribers ?? 412850,
        subscribersGainedLast28Days: channelInfo.subscribersGainedLast28Days ?? 214,
        viewsLast28Days: channelInfo.viewsLast28Days ?? 1250000,
        watchTimeLast28Days: channelInfo.watchTimeLast28Days ?? 1383.8,
        revenueLast28Days: channelInfo.revenueLast28Days ?? 42050.00,
        name: channelInfo.name || 'Kids Toon',
        avatar: channelInfo.avatar || '',
      });
    }
  }, [channelInfo]);

  // Keep selected video draft in sync when selecting a different video
  const activeVideo = useMemo(() => {
    return videos.find(v => v.id === selectedVideoId || String(v.id) === String(selectedVideoId)) || videos[0];
  }, [videos, selectedVideoId]);

  useEffect(() => {
    if (activeVideo) {
      const avdSecs = activeVideo.avgViewDurationSecs || parseAvdToSeconds(activeVideo.avgViewDuration, 105);
      const avdStr = activeVideo.avgViewDuration || formatSecondsToAvd(avdSecs);
      const durSecs = activeVideo.durationSecs || parseAvdToSeconds(activeVideo.duration, 618);
      const durStr = activeVideo.duration || formatSecondsToAvd(durSecs);
      const vViews = activeVideo.views || 0;
      const vRpm = activeVideo.rpm || 33.64;
      const vRev = activeVideo.revenue != null ? Number(activeVideo.revenue) : parseFloat(((vViews / 1000) * vRpm).toFixed(2));
      setSelectedVideoDraft({
        thumbnail: activeVideo.thumbnail || '/thumbnails/1.webp',
        duration: durStr,
        durationSecs: durSecs,
        publishDate: activeVideo.publishDate || activeVideo.date || '2026-08-16',
        subscribersGained: activeVideo.subscribersGained !== undefined ? activeVideo.subscribersGained : Math.round((activeVideo.views || 10000) * 0.014),
        subscribersLost: activeVideo.subscribersLost !== undefined ? activeVideo.subscribersLost : Math.round(((activeVideo.subscribersGained || 1000) * 0.12)),
        views: vViews,
        revenue: vRev,
        likes: activeVideo.likes || 0,
        comments: activeVideo.comments || 0,
        rpm: vRpm,
        avgViewDuration: avdStr,
        avgViewDurationSecs: avdSecs,
        title: activeVideo.title || ''
      });
    }
  }, [selectedVideoId, activeVideo]);

  // Channel Realtime State Draft
  const [channelRealtimeDraft, setChannelRealtimeDraft] = useState({
    realtimeSubscribers: channelInfo?.realtimeSubscribers || channelInfo?.subscribers || 412850,
    realtimeViews48h: channelInfo?.realtimeViews48h || Math.round((channelInfo?.viewsLast28Days || 1250000) * 0.0056),
    realtimeViews60m: channelInfo?.realtimeViews60m || Math.round((channelInfo?.viewsLast28Days || 1250000) * 0.0006),
  });

  useEffect(() => {
    if (channelInfo) {
      setChannelRealtimeDraft({
        realtimeSubscribers: channelInfo.realtimeSubscribers || channelInfo.subscribers || 412850,
        realtimeViews48h: channelInfo.realtimeViews48h || Math.round((channelInfo.viewsLast28Days || 1250000) * 0.0056),
        realtimeViews60m: channelInfo.realtimeViews60m || Math.round((channelInfo.viewsLast28Days || 1250000) * 0.0006),
      });
    }
  }, [channelInfo]);

  // Video Realtime State Draft
  const [selectedRealtimeVideoId, setSelectedRealtimeVideoId] = useState(videos[0]?.id || 'vid_01');
  const activeRealtimeVideo = useMemo(() => {
    return videos.find(v => v.id === selectedRealtimeVideoId || String(v.id) === String(selectedRealtimeVideoId)) || videos[0];
  }, [videos, selectedRealtimeVideoId]);

  const [videoRealtimeDraft, setVideoRealtimeDraft] = useState({
    realtimeViews48h: 183,
    realtimeViews60m: 22,
    trafficSources: {
      search: 47.5,
      browse: 18.6,
      channel: 14.2,
      other: 9.3,
      external: 3.6
    }
  });

  useEffect(() => {
    if (activeRealtimeVideo) {
      const vViews = Number(activeRealtimeVideo.views) || 0;
      setVideoRealtimeDraft({
        realtimeViews48h: activeRealtimeVideo.realtimeViews48h !== undefined ? activeRealtimeVideo.realtimeViews48h : Math.round(vViews * 0.0055),
        realtimeViews60m: activeRealtimeVideo.realtimeViews60m !== undefined ? activeRealtimeVideo.realtimeViews60m : Math.round(vViews * 0.0006),
        trafficSources: activeRealtimeVideo.realtimeTrafficSources || {
          search: 47.5,
          browse: 18.6,
          channel: 14.2,
          other: 9.3,
          external: 3.6
        }
      });
    }
  }, [selectedRealtimeVideoId, activeRealtimeVideo]);

  const filteredVideos = useMemo(() =>
    videos.filter(v => v.title?.toLowerCase().includes(videoSearch.toLowerCase())),
    [videos, videoSearch]
  );

  const totalRevenue = useMemo(() =>
    videos.reduce((acc, v) => acc + (v.revenue != null ? Number(v.revenue) : (((Number(v.views) || 0) / 1000) * (Number(v.rpm) || 33.64))), 0), [videos]);

  const totalViews = useMemo(() =>
    videos.reduce((acc, v) => acc + (Number(v.views) || 0), 0), [videos]);

  const avgRPM = useMemo(() => {
    const rpms = videos.filter(v => v.rpm).map(v => v.rpm);
    return rpms.length ? (rpms.reduce((a, b) => a + b, 0) / rpms.length).toFixed(2) : '0.00';
  }, [videos]);

  function startEdit(v) {
    setEditingId(v.id);
    const avdSecs = v.avgViewDurationSecs || parseAvdToSeconds(v.avgViewDuration, 105);
    const avdStr = v.avgViewDuration || formatSecondsToAvd(avdSecs);
    const durSecs = v.durationSecs || parseAvdToSeconds(v.duration, 618);
    const durStr = v.duration || formatSecondsToAvd(durSecs);
    const vViews = Number(v.views) || 0;
    const vRpm = Number(v.rpm) || 33.64;
    const vRev = v.revenue != null ? Number(v.revenue) : parseFloat(((vViews / 1000) * vRpm).toFixed(2));
    setEditBuf({
      views: vViews,
      likes: v.likes || 0,
      comments: v.comments || 0,
      rpm: vRpm,
      revenue: vRev,
      duration: durStr,
      durationSecs: durSecs,
      publishDate: v.publishDate || v.date || '2026-08-16',
      avgViewDuration: avdStr,
      avgViewDurationSecs: avdSecs,
      subscribersGained: v.subscribersGained !== undefined ? v.subscribersGained : Math.round(vViews * 0.014),
      thumbnail: v.thumbnail
    });
  }

  function saveEdit(id) {
    const avdSecs = editBuf.avgViewDurationSecs !== undefined
      ? Number(editBuf.avgViewDurationSecs)
      : parseAvdToSeconds(editBuf.avgViewDuration, 105);
    const avdStr = editBuf.avgViewDuration || formatSecondsToAvd(avdSecs);
    const durSecs = editBuf.durationSecs !== undefined
      ? Number(editBuf.durationSecs)
      : parseAvdToSeconds(editBuf.duration, 618);
    const durStr = editBuf.duration || formatSecondsToAvd(durSecs);
    const vViews = Number(editBuf.views) || 0;
    const vRpm = Number(editBuf.rpm) || 33.64;
    const vRev = editBuf.revenue !== undefined ? Number(editBuf.revenue) : parseFloat(((vViews / 1000) * vRpm).toFixed(2));
    const vWatchTime = parseFloat(((vViews * avdSecs) / 3600).toFixed(1));
    const vSubsGained = Number(editBuf.subscribersGained) || 0;
    const pubDate = editBuf.publishDate || '2026-08-16';

    const payload = {
      ...editBuf,
      publishDate: pubDate,
      date: pubDate,
      views: vViews,
      revenue: vRev,
      rpm: vRpm,
      duration: durStr,
      durationSecs: durSecs,
      avgViewDuration: avdStr,
      avgViewDurationSecs: avdSecs,
      watchTimeHrs: vWatchTime,
      watchTimeHrsFormatted: fmtW(vWatchTime),
      subscribersGained: vSubsGained,
      subscribersLost: 0,
      netSubscribers: vSubsGained,
      subscribersNet: vSubsGained,
      subscribersNetFormatted: fmtS(vSubsGained),
      revenueFormatted: formatINR(vRev),
      viewsFormatted: fmtV(vViews)
    };
    updateVideoMetrics(id, payload);
    setEditingId(null);
    broadcastSync();
    showToast('Video metrics, duration & thumbnail updated ✓', 'success');
  }

  function cancelEdit() { setEditingId(null); }

  const broadcastSync = () => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('yt-studio-sync');
        const st = useStore.getState();
        bc.postMessage({
          type: 'CRM_UPDATED',
          state: {
            channelInfo: st.channelInfo,
            videos: st.videos,
            graphSettings: st.graphSettings,
            simulationAnchorDate: st.simulationAnchorDate,
            selectedDateRange: st.selectedDateRange,
            customStartDate: st.customStartDate,
            customEndDate: st.customEndDate
          },
          timestamp: Date.now()
        });
        bc.close();
      }
    } catch {}
  };

  function applyChannel() {
    crmUpdateChannelMetrics(channelDraft);
    broadcastSync();
    showToast('Channel metrics updated ✓', 'success');
  }

  function applyBulkRPM() {
    bulkSetVideoRPM(bulkRPM);
    broadcastSync();
    showToast(`RPM set to ₹${bulkRPM} for all videos ✓`, 'success');
  }

  function applyBulkMultiply() {
    bulkMultiplyViews(bulkFactor);
    broadcastSync();
    showToast(`All video views multiplied by ${bulkFactor}× ✓`, 'success');
  }

  function applyVideoGrowthChanges() {
    if (!activeVideo) return;
    const avdSecs = selectedVideoDraft.avgViewDurationSecs || parseAvdToSeconds(selectedVideoDraft.avgViewDuration, 105);
    const avdStr = selectedVideoDraft.avgViewDuration || formatSecondsToAvd(avdSecs);
    const durSecs = selectedVideoDraft.durationSecs || parseAvdToSeconds(selectedVideoDraft.duration, 618);
    const durStr = selectedVideoDraft.duration || formatSecondsToAvd(durSecs);
    const vViews = Number(selectedVideoDraft.views) || 0;
    const vRpm = Number(selectedVideoDraft.rpm) || 33.64;
    const vRev = selectedVideoDraft.revenue !== undefined ? Number(selectedVideoDraft.revenue) : parseFloat(((vViews / 1000) * vRpm).toFixed(2));
    const vWatchTime = parseFloat(((vViews * avdSecs) / 3600).toFixed(1));
    const vSubsGained = Number(selectedVideoDraft.subscribersGained) || 0;
    const pubDate = selectedVideoDraft.publishDate || activeVideo.publishDate || activeVideo.date || '2026-08-16';
    const payload = {
      ...selectedVideoDraft,
      publishDate: pubDate,
      date: pubDate,
      views: vViews,
      revenue: vRev,
      rpm: vRpm,
      duration: durStr,
      durationSecs: durSecs,
      avgViewDuration: avdStr,
      avgViewDurationSecs: avdSecs,
      watchTimeHrs: vWatchTime,
      watchTimeHrsFormatted: fmtW(vWatchTime),
      subscribersGained: vSubsGained,
      subscribersLost: 0,
      netSubscribers: vSubsGained,
      subscribersNet: vSubsGained,
      subscribersNetFormatted: fmtS(vSubsGained),
      subscribersGainedFormatted: fmtS(vSubsGained),
      revenueFormatted: formatINR(vRev),
      viewsFormatted: fmtV(vViews)
    };
    updateVideoMetrics(activeVideo.id, payload);
    broadcastSync();
    showToast(`Video "${activeVideo.title?.slice(0, 24)}…" updated ✓ Reflecting across all Studio pages.`, 'success');
  }

  function applyChannelRealtime() {
    crmUpdateChannelMetrics({
      realtimeSubscribers: Number(channelRealtimeDraft.realtimeSubscribers),
      realtimeViews48h: Number(channelRealtimeDraft.realtimeViews48h),
      realtimeViews60m: Number(channelRealtimeDraft.realtimeViews60m),
    });
    broadcastSync();
    showToast('Channel Realtime metrics updated ✓ Reflecting in Live Rail', 'success');
  }

  function applyVideoRealtime() {
    if (!activeRealtimeVideo) return;
    updateVideoMetrics(activeRealtimeVideo.id, {
      realtimeViews48h: Number(videoRealtimeDraft.realtimeViews48h),
      realtimeViews60m: Number(videoRealtimeDraft.realtimeViews60m),
      realtimeTrafficSources: videoRealtimeDraft.trafficSources
    });
    broadcastSync();
    showToast(`Realtime metrics for "${activeRealtimeVideo.title?.slice(0, 24)}…" updated ✓`, 'success');
  }

  function applyDates() {
    setSimulationAnchorDate(dateDraft.anchorDate, dateDraft.startDate, dateDraft.endDate);
    setDateRange(dateDraft.preset, dateDraft.startDate, dateDraft.endDate);
    const label = formatDateRangeText(dateDraft.startDate, dateDraft.endDate);
    broadcastSync();
    showToast(`Date range set to "${label}" across all graphs ✓`, 'success');
  }

  function applyChannelGraph() {
    updateGraphSettings({ channel: channelGraphDraft });
    broadcastSync();
    showToast('Overall Channel graph dynamics applied ✓', 'success');
  }

  function applyVideoGraph() {
    updateVideoGraphConfig(selectedGraphVideoId, videoGraphDraft);
    broadcastSync();
    const selV = videos.find(v => v.id === selectedGraphVideoId);
    showToast(`Graph curve applied to "${selV?.title?.slice(0, 24) || 'video'}…" ✓`, 'success');
  }

  function applyVideoGraphToAll() {
    const perVideo = {};
    videos.forEach(v => {
      perVideo[v.id] = { ...videoGraphDraft };
    });
    updateGraphSettings({
      videoDefaults: { ...videoGraphDraft },
      perVideo
    });
    broadcastSync();
    showToast('Graph curve parameters applied to ALL videos ✓', 'success');
  }

  // Global Keyboard Shortcuts (Cmd+S / Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeSection === 'growth') applyVideoGrowthChanges();
        else if (activeSection === 'realtime') { applyChannelRealtime(); applyVideoRealtime(); }
        else if (activeSection === 'channel') applyChannel();
        else if (activeSection === 'dates') applyDates();
        else if (activeSection === 'graph') { applyChannelGraph(); applyVideoGraph(); }
        else if (activeSection === 'bulk') applyBulkMultiply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, selectedVideoDraft, channelDraft, dateDraft, channelGraphDraft, videoGraphDraft, selectedGraphVideoId, bulkFactor, bulkRPM, activeVideo, channelRealtimeDraft, videoRealtimeDraft, activeRealtimeVideo]);

  function autoCalculateEngagement() {
    const v = Number(selectedVideoDraft.views) || 0;
    const gained = Math.round(v * 0.014);
    const lost = Math.round(gained * 0.12);
    const likes = Math.round(v * 0.046);
    const comments = Math.round(v * 0.0034);
    setSelectedVideoDraft(d => ({
      ...d,
      subscribersGained: gained,
      subscribersLost: lost,
      likes,
      comments
    }));
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (dataUrl) {
        setSelectedVideoDraft(d => ({ ...d, thumbnail: String(dataUrl) }));
        showToast('Local thumbnail image uploaded successfully ✓', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const navItems = [
    { key: 'growth',   icon: '🖼️', label: 'Thumbnails & Subs' },
    { key: 'realtime', icon: '🔴', label: 'Realtime Analytics' },
    { key: 'videos',   icon: '🎬', label: 'Videos Manager' },
    { key: 'channel',  icon: '📡', label: 'Channel Metrics' },
    { key: 'dates',    icon: '📅', label: 'Dates & Range' },
    { key: 'graph',    icon: '📈', label: 'Graph Controls' },
    { key: 'bulk',     icon: '⚡', label: 'Bulk Actions' },
    { key: 'preview',  icon: '👁️', label: 'Live Preview' },
  ];

  return (
    <div className="crm-root">
      {/* ── Sidebar ── */}
      <aside className="crm-sidebar">
        <div className="crm-logo">
          <span className="crm-logo-icon">⚙️</span>
          <div>
            <div className="crm-logo-title">Studio CRM</div>
            <div className="crm-logo-sub">Data & Visuals Control</div>
          </div>
        </div>

        <nav className="crm-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`crm-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="crm-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <a href="/channel/UCqpdVWIzEQUcbf4pAxlneOQ/dashboard" className="crm-back-btn">
          ← Back to Studio
        </a>
      </aside>

      {/* ── Main ── */}
      <main className="crm-main">

        {/* ── Header ── */}
        <div className="crm-header">
          <div>
            <h1 className="crm-title">{navItems.find(n => n.key === activeSection)?.label}</h1>
            <p className="crm-subtitle">
              {activeSection === 'growth' && 'Edit per-video subscriber gain, publish dates and replace thumbnails with live instant synchronization across Studio & Analytics'}
              {activeSection === 'realtime' && 'Control 48-hour live views, 60-minute views, subscriber ticker, and top traffic sources breakdown for both the overall channel and individual videos'}
              {activeSection === 'videos' && 'Edit per-video metrics — subscriber gains, thumbnails, views, likes & RPM'}
              {activeSection === 'channel' && 'Edit channel-level stats — changes reflect instantly in YouTube Studio'}
              {activeSection === 'dates' && 'Control simulation anchor dates, 28-day window (e.g. Jul 16 – Aug 12, 2026), and synchronize date axes across all graphs'}
              {activeSection === 'graph' && 'Fine-tune graph spikiness, individual video launch curves, algorithm surge frequencies, and presets'}
              {activeSection === 'bulk' && 'Apply batch changes across all videos at once'}
              {activeSection === 'preview' && 'Read-only live snapshot of current store values'}
            </p>
          </div>
          <div className="crm-header-badges">
            <span className="crm-badge crm-badge-green">● Live Sync</span>
            <span className="crm-badge">{videos.length} videos</span>
          </div>
        </div>

        {/* ── DEDICATED THUMBNAILS & SUBS SECTION ── */}
        {activeSection === 'growth' && (
          <div className="crm-section">
            {/* Top Video Selector Rail */}
            <div className="crm-card">
              <div className="crm-card-header-flex">
                <div className="crm-card-title">🎯 1. Select Video to Customize</div>
                <span className="crm-badge">{filteredVideos.length} Available</span>
              </div>
              <input
                className="crm-search"
                placeholder="🔍  Search video title to select…"
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
              />

              <div className="crm-video-chips-grid">
                {filteredVideos.map(v => {
                  const isSel = (v.id === selectedVideoId || String(v.id) === String(selectedVideoId));
                  return (
                    <div
                      key={v.id}
                      className={`crm-video-chip ${isSel ? 'active' : ''}`}
                      onClick={() => setSelectedVideoId(v.id)}
                    >
                      <img src={v.thumbnail} alt="" className="crm-chip-thumb" />
                      <div className="crm-chip-details">
                        <div className="crm-chip-title">{v.title}</div>
                        <div className="crm-chip-meta">
                          <span>👁️ {v.viewsFormatted || fmt(v.views)}</span>
                          <span className="crm-chip-subs">👥 +{fmt(v.subscribersGained || Math.round(v.views * 0.014))} subs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Video Customization Studio */}
            {activeVideo && (
              <div className="crm-grid-2">
                {/* Thumbnail Customizer Card */}
                <div className="crm-card">
                  <div className="crm-card-title">🖼️ 2. Change Thumbnail</div>
                  <p className="crm-card-desc">
                    Upload any image from your computer, paste a URL, or choose a preset. Updates thumbnail on Dashboard, Content, Video Analytics, Sidebar and search.
                  </p>

                  <div className="crm-thumbnail-preview-frame">
                    <img
                      src={selectedVideoDraft.thumbnail}
                      alt="Thumbnail Preview"
                      className="crm-thumbnail-preview-img"
                    />
                    <div className="crm-preview-duration-badge">{selectedVideoDraft.duration || activeVideo.duration || '10:18'}</div>
                  </div>

                  <div className="crm-field">
                    <label className="crm-field-label">Thumbnail Image URL</label>
                    <input
                      className="crm-input"
                      type="text"
                      placeholder="https://... or /thumbnails/1.webp"
                      value={selectedVideoDraft.thumbnail}
                      onChange={e => setSelectedVideoDraft(d => ({ ...d, thumbnail: e.target.value }))}
                    />
                  </div>

                  <div className="crm-upload-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      className="crm-btn crm-btn-edit crm-file-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 Upload Image from PC
                    </button>
                    <span className="crm-upload-hint">Supports PNG, JPG, WebP, GIF</span>
                  </div>

                  <div className="crm-presets-block">
                    <label className="crm-field-label">Quick Preset Thumbnails</label>
                    <div className="crm-preset-thumbs-grid">
                      {PRESET_THUMBNAILS.map((pt, i) => (
                        <div
                          key={i}
                          className={`crm-preset-thumb-card ${selectedVideoDraft.thumbnail === pt.url ? 'active' : ''}`}
                          onClick={() => setSelectedVideoDraft(d => ({ ...d, thumbnail: pt.url }))}
                        >
                          <img src={pt.url} alt={pt.label} />
                          <span>{pt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subscriber Gain, Video Duration & AVD Timing Card */}
                <div className="crm-card">
                  <div className="crm-card-title">⏱️ 3. Edit Video Duration, AVD & Subscribers</div>
                  <p className="crm-card-desc">
                    Define total video length, average view duration (AVD), subscriber gain, and engagement. Reflects instantly across Video Analytics, Watch Time, and Studio Content pages.
                  </p>

                  {/* Video Duration & AVD Duration Controls */}
                  <div className="crm-grid-2">
                    <CRMInput
                      label="Video Total Duration"
                      type="text"
                      placeholder="e.g. 10:18 or 14:22"
                      value={selectedVideoDraft.duration || '10:18'}
                      onChange={v => {
                        const secs = parseAvdToSeconds(v, 618);
                        setSelectedVideoDraft(d => ({
                          ...d,
                          duration: String(v),
                          durationSecs: secs
                        }));
                      }}
                    />
                    <CRMInput
                      label="Average View Duration (AVD)"
                      type="text"
                      placeholder="e.g. 3:45 or 225s"
                      value={selectedVideoDraft.avgViewDuration || '1:45'}
                      onChange={v => {
                        const secs = parseAvdToSeconds(v, 105);
                        setSelectedVideoDraft(d => ({
                          ...d,
                          avgViewDuration: String(v),
                          avgViewDurationSecs: secs
                        }));
                      }}
                    />
                  </div>

                  <div className="crm-quick-pill-row" style={{ marginTop: 4 }}>
                    <span className="crm-field-label" style={{ marginBottom: 0 }}>Duration presets:</span>
                    {['3:20', '5:45', '8:12', '10:18', '14:22', '18:40', '25:00', '42:15'].map(dStr => (
                      <button
                        key={dStr}
                        type="button"
                        className={`crm-mini-pill ${selectedVideoDraft.duration === dStr ? 'active-pill' : ''}`}
                        onClick={() => {
                          const secs = parseAvdToSeconds(dStr, 618);
                          setSelectedVideoDraft(d => ({
                            ...d,
                            duration: dStr,
                            durationSecs: secs
                          }));
                        }}
                      >
                        ⏱️ {dStr}
                      </button>
                    ))}
                  </div>

                  <div className="crm-quick-pill-row" style={{ marginTop: 4 }}>
                    <span className="crm-field-label" style={{ marginBottom: 0 }}>AVD presets:</span>
                    {['0:45', '1:30', '2:45', '4:15', '6:30', '8:00', '12:00'].map(tStr => (
                      <button
                        key={tStr}
                        type="button"
                        className={`crm-mini-pill ${selectedVideoDraft.avgViewDuration === tStr ? 'active-pill' : ''}`}
                        onClick={() => {
                          const secs = parseAvdToSeconds(tStr, 105);
                          setSelectedVideoDraft(d => ({
                            ...d,
                            avgViewDuration: tStr,
                            avgViewDurationSecs: secs
                          }));
                        }}
                      >
                        📊 {tStr}
                      </button>
                    ))}
                  </div>

                  <div className="crm-grid-2" style={{ marginTop: 8 }}>
                    <CRMInput
                      label="Subscribers Gained"
                      value={selectedVideoDraft.subscribersGained}
                      onChange={v => {
                        const gained = Number(v);
                        setSelectedVideoDraft(d => ({
                          ...d,
                          subscribersGained: gained,
                          netSubscribers: gained,
                          subscribersLost: 0
                        }));
                      }}
                      min={0}
                      step={100}
                      unit="subs"
                    />
                    <CRMInput
                      label="Video Views"
                      value={selectedVideoDraft.views}
                      onChange={v => setSelectedVideoDraft(d => ({ ...d, views: v }))}
                      min={0}
                      step={1000}
                    />
                  </div>

                  <div className="crm-grid-2" style={{ marginTop: 8 }}>
                    <CRMInput
                      label="Video RPM (₹)"
                      value={selectedVideoDraft.rpm}
                      onChange={v => {
                        const rpmVal = Number(v) || 0;
                        const viewsVal = Number(selectedVideoDraft.views) || 0;
                        setSelectedVideoDraft(d => ({
                          ...d,
                          rpm: rpmVal,
                          revenue: parseFloat(((viewsVal / 1000) * rpmVal).toFixed(2))
                        }));
                      }}
                      min={0}
                      step={0.1}
                      unit="₹"
                    />
                    <CRMInput
                      label="Estimated Revenue (₹)"
                      value={selectedVideoDraft.revenue !== undefined ? selectedVideoDraft.revenue : parseFloat((((Number(selectedVideoDraft.views) || 0) / 1000) * (Number(selectedVideoDraft.rpm) || 33.64)).toFixed(2))}
                      onChange={v => {
                        const revVal = Number(v) || 0;
                        const viewsVal = Number(selectedVideoDraft.views) || 0;
                        const calcRpm = viewsVal > 0 ? parseFloat(((revVal / (viewsVal / 1000))).toFixed(4)) : (selectedVideoDraft.rpm || 33.64);
                        setSelectedVideoDraft(d => ({
                          ...d,
                          revenue: revVal,
                          rpm: calcRpm
                        }));
                      }}
                      min={0}
                      step={100}
                      unit="₹"
                    />
                  </div>

                  <div className="crm-grid-2" style={{ marginTop: 8 }}>
                    <CRMInput
                      label="Likes Count"
                      value={selectedVideoDraft.likes}
                      onChange={v => setSelectedVideoDraft(d => ({ ...d, likes: v }))}
                      min={0}
                      step={50}
                    />
                    <div className="crm-field">
                      <label className="crm-field-label">📅 Publish Date</label>
                      <input
                        type="date"
                        className="crm-input"
                        style={{ color: '#fbbf24', fontWeight: 600 }}
                        value={selectedVideoDraft.publishDate || '2026-08-16'}
                        onChange={e => setSelectedVideoDraft(d => ({ ...d, publishDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="crm-grid-2" style={{ marginTop: 8 }}>
                    <CRMInput
                      label="Comments Count"
                      value={selectedVideoDraft.comments}
                      onChange={v => setSelectedVideoDraft(d => ({ ...d, comments: v }))}
                      min={0}
                      step={10}
                    />
                    <div className="crm-field">
                      <label className="crm-field-label">Calculated Watch Time</label>
                      <div className="crm-input" style={{ background: '#121224', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        ⏱️ {(((Number(selectedVideoDraft.views) || 0) * (selectedVideoDraft.avgViewDurationSecs || 105)) / 3600).toFixed(1)} hrs
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '6px 12px', fontSize: '11px' }}
                      onClick={autoCalculateEngagement}
                    >
                      ⚡ Auto-calculate natural engagement (4.6% likes, 0.34% comments, 1.4% subs)
                    </button>
                  </div>

                  {/* Impact Summary Pill */}
                  <div className="crm-preview-small" style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Publish Date:</span>
                      <strong style={{ color: '#fbbf24' }}>{selectedVideoDraft.publishDate || '2026-08-16'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Video Duration:</span>
                      <strong style={{ color: '#e2e8f0' }}>{selectedVideoDraft.duration || '10:18'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Average View Duration (AVD):</span>
                      <strong style={{ color: '#a78bfa' }}>{selectedVideoDraft.avgViewDuration || '1:45'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Average Percentage Viewed (Retention):</span>
                      <strong style={{ color: '#ec4899' }}>
                        {(selectedVideoDraft.durationSecs > 0 && selectedVideoDraft.avgViewDurationSecs > 0)
                          ? `${Math.min(100, Math.round(((selectedVideoDraft.avgViewDurationSecs || 105) / selectedVideoDraft.durationSecs) * 1000) / 10)}%`
                          : '17.0%'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Calculated Watch Time:</span>
                      <strong style={{ color: '#38bdf8' }}>
                        {(((Number(selectedVideoDraft.views) || 0) * (selectedVideoDraft.avgViewDurationSecs || 105)) / 3600).toFixed(1)} hrs
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Calculated Revenue:</span>
                      <strong>{fmtINR((selectedVideoDraft.views / 1000) * selectedVideoDraft.rpm)}</strong>
                    </div>
                  </div>

                  <div className="crm-button-action-row" style={{ marginTop: 16 }}>
                    <button
                      className="crm-apply-btn"
                      onClick={applyVideoGrowthChanges}
                    >
                      💾 Apply & Reflect Everywhere
                    </button>
                    <a
                      href={`/channel/UCqpdVWIzEQUcbf4pAxlneOQ/analytics?v=${activeVideo.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="crm-btn crm-btn-edit"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderRadius: '10px' }}
                    >
                      <span>📈 View in Video Analytics ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REALTIME ANALYTICS SECTION (OVERALL & PER-VIDEO) ── */}
        {activeSection === 'realtime' && (
          <div className="crm-section">
            <div className="crm-grid-2">
              {/* 1. Overall Channel Realtime Card */}
              <div className="crm-card">
                <div className="crm-card-header-flex">
                  <div className="crm-card-title">📡 Overall Channel Realtime</div>
                  <span className="crm-badge crm-badge-green">● Live Rail Sync</span>
                </div>
                <p className="crm-card-desc">
                  Customize the live numbers that appear in the YouTube Studio Realtime sidebar on the Channel Overview page.
                </p>

                <div className="crm-field">
                  <label className="crm-field-label">👥 Live Subscribers Count (Realtime Rail)</label>
                  <input
                    type="number"
                    className="crm-input"
                    value={channelRealtimeDraft.realtimeSubscribers}
                    onChange={e => setChannelRealtimeDraft(d => ({ ...d, realtimeSubscribers: e.target.value }))}
                  />
                </div>

                <div className="crm-grid-2" style={{ marginTop: 8 }}>
                  <div className="crm-field">
                    <label className="crm-field-label">👁️ Views · Last 48 Hours</label>
                    <input
                      type="number"
                      className="crm-input"
                      style={{ color: '#38bdf8', fontWeight: 600 }}
                      value={channelRealtimeDraft.realtimeViews48h}
                      onChange={e => setChannelRealtimeDraft(d => ({ ...d, realtimeViews48h: e.target.value }))}
                    />
                  </div>
                  <div className="crm-field">
                    <label className="crm-field-label">⏱️ Views · Last 60 Minutes</label>
                    <input
                      type="number"
                      className="crm-input"
                      value={channelRealtimeDraft.realtimeViews60m}
                      onChange={e => setChannelRealtimeDraft(d => ({ ...d, realtimeViews60m: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="crm-field-label">⚡ Quick 48h Boost Presets</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setChannelRealtimeDraft(d => ({ ...d, realtimeViews48h: Number(d.realtimeViews48h || 0) + 5000 }))}
                    >
                      +5,000 Views
                    </button>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setChannelRealtimeDraft(d => ({ ...d, realtimeViews48h: Number(d.realtimeViews48h || 0) + 25000 }))}
                    >
                      +25,000 Views
                    </button>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setChannelRealtimeDraft(d => ({ ...d, realtimeViews48h: Number(d.realtimeViews48h || 0) + 100000 }))}
                    >
                      +100,000 Views
                    </button>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      style={{ color: '#f87171' }}
                      onClick={() => setChannelRealtimeDraft(d => ({
                        ...d,
                        realtimeViews48h: Math.round((Number(channelDraft.viewsLast28Days) || 1250000) * 0.0056),
                        realtimeViews60m: Math.round((Number(channelDraft.viewsLast28Days) || 1250000) * 0.0006)
                      }))}
                    >
                      Reset to Auto Ratio
                    </button>
                  </div>
                </div>

                {/* Channel Realtime Preview Box */}
                <div className="crm-preview-small" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Realtime Subscribers Display:</span>
                    <strong>{Number(channelRealtimeDraft.realtimeSubscribers).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Realtime 48h Views Display:</span>
                    <strong style={{ color: '#38bdf8' }}>{Number(channelRealtimeDraft.realtimeViews48h).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Realtime 60m Views Display:</span>
                    <strong style={{ color: '#a78bfa' }}>{Number(channelRealtimeDraft.realtimeViews60m).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <button
                  className="crm-apply-btn"
                  style={{ marginTop: 16, width: '100%' }}
                  onClick={applyChannelRealtime}
                >
                  💾 Apply Channel Realtime
                </button>
              </div>

              {/* 2. Per-Video Realtime & Traffic Breakdown Card */}
              <div className="crm-card">
                <div className="crm-card-header-flex">
                  <div className="crm-card-title">🎬 Per-Video Realtime & Traffic</div>
                  <span className="crm-badge">{filteredVideos.length} Videos</span>
                </div>
                <p className="crm-card-desc">
                  Select a specific video to customize its Realtime 48-hour views, 60-minute views, and top traffic sources breakdown.
                </p>

                {/* Video Selector Dropdown */}
                <div className="crm-field">
                  <label className="crm-field-label">Target Video</label>
                  <select
                    className="crm-input"
                    value={selectedRealtimeVideoId}
                    onChange={e => setSelectedRealtimeVideoId(e.target.value)}
                    style={{ background: '#121224', color: '#f8fafc', fontWeight: 500 }}
                  >
                    {videos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.title?.slice(0, 50)} ({v.viewsFormatted || fmt(v.views)} views)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="crm-grid-2" style={{ marginTop: 8 }}>
                  <div className="crm-field">
                    <label className="crm-field-label">👁️ Video 48h Views</label>
                    <input
                      type="number"
                      className="crm-input"
                      style={{ color: '#38bdf8', fontWeight: 600 }}
                      value={videoRealtimeDraft.realtimeViews48h}
                      onChange={e => setVideoRealtimeDraft(d => ({ ...d, realtimeViews48h: e.target.value }))}
                    />
                  </div>
                  <div className="crm-field">
                    <label className="crm-field-label">⏱️ Video 60m Views</label>
                    <input
                      type="number"
                      className="crm-input"
                      value={videoRealtimeDraft.realtimeViews60m}
                      onChange={e => setVideoRealtimeDraft(d => ({ ...d, realtimeViews60m: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Traffic Sources Breakdown */}
                <div style={{ marginTop: 12 }}>
                  <label className="crm-field-label">📊 Top Traffic Sources Breakdown (% of Views)</label>
                  <div className="crm-grid-2" style={{ marginTop: 6, gap: 8 }}>
                    <div className="crm-field">
                      <label className="crm-field-label" style={{ fontSize: 11 }}>YouTube Search %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="crm-input"
                        value={videoRealtimeDraft.trafficSources?.search ?? 47.5}
                        onChange={e => setVideoRealtimeDraft(d => ({ ...d, trafficSources: { ...d.trafficSources, search: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                    <div className="crm-field">
                      <label className="crm-field-label" style={{ fontSize: 11 }}>Browse Features %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="crm-input"
                        value={videoRealtimeDraft.trafficSources?.browse ?? 18.6}
                        onChange={e => setVideoRealtimeDraft(d => ({ ...d, trafficSources: { ...d.trafficSources, browse: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                    <div className="crm-field">
                      <label className="crm-field-label" style={{ fontSize: 11 }}>Channel Pages %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="crm-input"
                        value={videoRealtimeDraft.trafficSources?.channel ?? 14.2}
                        onChange={e => setVideoRealtimeDraft(d => ({ ...d, trafficSources: { ...d.trafficSources, channel: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                    <div className="crm-field">
                      <label className="crm-field-label" style={{ fontSize: 11 }}>Other YouTube %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="crm-input"
                        value={videoRealtimeDraft.trafficSources?.other ?? 9.3}
                        onChange={e => setVideoRealtimeDraft(d => ({ ...d, trafficSources: { ...d.trafficSources, other: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div style={{ marginTop: 12 }}>
                  <label className="crm-field-label">⚡ Traffic Source Presets</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setVideoRealtimeDraft(d => ({
                        ...d,
                        trafficSources: { search: 78.5, browse: 10.2, channel: 6.1, other: 3.2, external: 2.0 }
                      }))}
                    >
                      🔥 High Search Spike (78.5%)
                    </button>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setVideoRealtimeDraft(d => ({
                        ...d,
                        trafficSources: { search: 22.0, browse: 58.4, channel: 11.2, other: 5.4, external: 3.0 }
                      }))}
                    >
                      📈 Suggested / Browse Boom (58.4%)
                    </button>
                    <button
                      type="button"
                      className="crm-mini-pill"
                      onClick={() => setVideoRealtimeDraft(d => ({
                        ...d,
                        trafficSources: { search: 47.5, browse: 18.6, channel: 14.2, other: 9.3, external: 3.6 }
                      }))}
                    >
                      Default Distribution
                    </button>
                  </div>
                </div>

                {/* Video Realtime Preview Box */}
                <div className="crm-preview-small" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Selected Video:</span>
                    <strong style={{ color: '#fbbf24' }}>{activeRealtimeVideo?.title?.slice(0, 30)}…</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Realtime 48h Views:</span>
                    <strong style={{ color: '#38bdf8' }}>{Number(videoRealtimeDraft.realtimeViews48h).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Top Traffic Source:</span>
                    <strong style={{ color: '#4ade80' }}>YouTube search ({videoRealtimeDraft.trafficSources?.search}%)</strong>
                  </div>
                </div>

                <div className="crm-button-action-row" style={{ marginTop: 16 }}>
                  <button
                    className="crm-apply-btn"
                    onClick={applyVideoRealtime}
                  >
                    💾 Apply Video Realtime
                  </button>
                  <a
                    href={`/channel/UCqpdVWIzEQUcbf4pAxlneOQ/analytics/tab-overview/period-last-28-days?video=${activeRealtimeVideo?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="crm-btn crm-btn-edit"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderRadius: '10px' }}
                  >
                    <span>📈 View Live Rail ↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIDEOS MANAGER ── */}
        {activeSection === 'videos' && (
          <div className="crm-section">
            <div className="crm-videos-toolbar">
              <input
                className="crm-search"
                placeholder="🔍  Search videos…"
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
              />
              <span className="crm-badge">{filteredVideos.length} results</span>
            </div>

            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Video & Thumbnail</th>
                    <th>Publish Date</th>
                    <th>Duration</th>
                    <th>Subs Gained</th>
                    <th>Views</th>
                    <th>Avg Duration (AVD)</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>RPM (₹)</th>
                    <th>Revenue</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map(v => {
                    const isEditing = editingId === v.id;
                    const handleInlineKeyDown = (e) => {
                      if (e.key === 'Enter') saveEdit(v.id);
                      else if (e.key === 'Escape') cancelEdit();
                    };
                    return (
                      <tr key={v.id} className={isEditing ? 'crm-row-editing' : ''}>
                        <td className="crm-vid-title-cell">
                          <img src={isEditing ? (editBuf.thumbnail || v.thumbnail) : v.thumbnail} alt="" className="crm-vid-thumb" />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span className="crm-vid-name">{v.title}</span>
                            {isEditing && (
                              <input
                                className="crm-inline-input"
                                style={{ width: '180px', marginTop: '4px', fontSize: '11px' }}
                                placeholder="Thumb URL"
                                value={editBuf.thumbnail || ''}
                                onChange={e => setEditBuf(b => ({ ...b, thumbnail: e.target.value }))}
                                onKeyDown={handleInlineKeyDown}
                              />
                            )}
                          </div>
                        </td>
                        {isEditing ? (
                          <>
                            <td>
                              <input
                                className="crm-inline-input"
                                type="date"
                                style={{ width: '130px', color: '#fbbf24', fontWeight: 600 }}
                                value={editBuf.publishDate || '2026-08-16'}
                                onKeyDown={handleInlineKeyDown}
                                onChange={e => setEditBuf(b => ({ ...b, publishDate: e.target.value }))}
                              />
                            </td>
                            <td><input className="crm-inline-input" type="text" style={{ width: '65px' }} value={editBuf.duration || '10:18'}
                              onKeyDown={handleInlineKeyDown}
                              placeholder="10:18"
                              onChange={e => {
                                const val = e.target.value;
                                setEditBuf(b => ({ ...b, duration: val, durationSecs: parseAvdToSeconds(val, 618) }));
                              }} /></td>
                            <td><input className="crm-inline-input" type="text" value={editBuf.subscribersGained}
                              onKeyDown={handleInlineKeyDown}
                              onChange={e => setEditBuf(b => ({ ...b, subscribersGained: parseSmartNumber(e.target.value, b.subscribersGained) }))} /></td>
                            <td><input className="crm-inline-input" type="text" value={editBuf.views}
                              onKeyDown={handleInlineKeyDown}
                              onChange={e => setEditBuf(b => ({ ...b, views: parseSmartNumber(e.target.value, b.views) }))} /></td>
                            <td><input className="crm-inline-input" type="text" style={{ width: '70px' }} value={editBuf.avgViewDuration || '1:45'}
                              onKeyDown={handleInlineKeyDown}
                              placeholder="3:45"
                              onChange={e => {
                                const val = e.target.value;
                                setEditBuf(b => ({ ...b, avgViewDuration: val, avgViewDurationSecs: parseAvdToSeconds(val, 105) }));
                              }} /></td>
                            <td><input className="crm-inline-input" type="text" value={editBuf.likes}
                              onKeyDown={handleInlineKeyDown}
                              onChange={e => setEditBuf(b => ({ ...b, likes: parseSmartNumber(e.target.value, b.likes) }))} /></td>
                            <td><input className="crm-inline-input" type="text" value={editBuf.comments}
                              onKeyDown={handleInlineKeyDown}
                              onChange={e => setEditBuf(b => ({ ...b, comments: parseSmartNumber(e.target.value, b.comments) }))} /></td>
                            <td><input className="crm-inline-input" type="text" value={editBuf.rpm}
                              onKeyDown={handleInlineKeyDown}
                              onChange={e => setEditBuf(b => ({ ...b, rpm: parseSmartNumber(e.target.value, b.rpm) }))} /></td>
                            <td className="crm-revenue-preview">
                              {fmtINR(((Number(editBuf.views) || 0) / 1000) * (Number(editBuf.rpm) || 0))}
                            </td>
                            <td className="crm-action-cell">
                              <button className="crm-btn crm-btn-save" onClick={() => saveEdit(v.id)}>Save</button>
                              <button className="crm-btn crm-btn-cancel" onClick={cancelEdit}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ color: '#fbbf24', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              📅 {v.publishDate || v.date || '2026-08-16'}
                            </td>
                            <td style={{ color: '#e2e8f0', fontWeight: 500 }}>
                              {v.duration || formatSecondsToAvd(v.durationSecs || 618)}
                            </td>
                            <td style={{ color: '#4ade80', fontWeight: 600 }}>
                              +{fmt(v.subscribersGained !== undefined ? v.subscribersGained : Math.round(v.views * 0.014))}
                            </td>
                            <td>{v.viewsFormatted || fmt(v.views)}</td>
                            <td>
                              <span style={{ color: '#38bdf8', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                ⏱️ {v.avgViewDuration || formatSecondsToAvd(v.avgViewDurationSecs || 105)}
                              </span>
                            </td>
                            <td>{(v.likes || 0).toLocaleString()}</td>
                            <td>{(v.comments || 0).toLocaleString()}</td>
                            <td>₹{(v.rpm || 33.64).toFixed(2)}</td>
                            <td className="crm-revenue-cell">{v.revenueFormatted || fmtINR(v.revenue || 0)}</td>
                            <td className="crm-action-cell">
                              <button className="crm-btn crm-btn-edit" onClick={() => startEdit(v)}>Edit</button>
                              <button
                                className="crm-btn crm-btn-cancel"
                                title="Open in dedicated Thumbnail & Subs editor"
                                onClick={() => {
                                  setSelectedVideoId(v.id);
                                  setActiveSection('growth');
                                }}
                              >
                                🖼️ Studio
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CHANNEL METRICS ── */}
        {activeSection === 'channel' && (
          <div className="crm-section">
            <div className="crm-grid-2">
              {/* Subscribers */}
              <div className="crm-card">
                <div className="crm-card-title">👥 Subscribers</div>
                <CRMInput label="Total Subscribers" value={channelDraft.subscribers}
                  onChange={v => setChannelDraft(d => ({ ...d, subscribers: v }))} min={0} step={1000} />
                <CRMInput label="Gained (Last 28 days)" value={channelDraft.subscribersGainedLast28Days}
                  onChange={v => setChannelDraft(d => ({ ...d, subscribersGainedLast28Days: v }))} min={-999999} step={100} />
              </div>

              {/* Views & Watch time */}
              <div className="crm-card">
                <div className="crm-card-title">📊 Views & Watch Time</div>
                <CRMInput label="Views (Last 28 days)" value={channelDraft.viewsLast28Days}
                  onChange={v => setChannelDraft(d => ({ ...d, viewsLast28Days: v }))} min={0} step={1000} />
                <CRMInput label="Watch Time — Hours (Last 28 days)" value={channelDraft.watchTimeLast28Days}
                  onChange={v => setChannelDraft(d => ({ ...d, watchTimeLast28Days: v }))} min={0} step={100} />
              </div>

              {/* Revenue */}
              <div className="crm-card">
                <div className="crm-card-title">💰 Revenue</div>
                <CRMInput label="Estimated Revenue (Last 28 days)" value={channelDraft.revenueLast28Days}
                  onChange={v => setChannelDraft(d => ({ ...d, revenueLast28Days: v }))} min={0} step={100} unit="₹" />
              </div>

              {/* Channel Identity */}
              <div className="crm-card">
                <div className="crm-card-title">🎭 Channel Identity</div>
                <CRMInput label="Channel Name" value={channelDraft.name} type="text"
                  onChange={v => setChannelDraft(d => ({ ...d, name: v }))} />
                <CRMInput label="Avatar URL" value={channelDraft.avatar} type="text"
                  onChange={v => setChannelDraft(d => ({ ...d, avatar: v }))} />
              </div>
            </div>

            {/* Preview row */}
            <div className="crm-card crm-preview-bar">
              <span className="crm-card-title" style={{ margin: 0 }}>Preview</span>
              <StatPreview label="Subscribers" value={fmt(channelDraft.subscribers)} />
              <StatPreview label="Gained" value={`+${fmt(channelDraft.subscribersGainedLast28Days)}`} color="#4ade80" />
              <StatPreview label="Views 28d" value={fmt(channelDraft.viewsLast28Days)} />
              <StatPreview label="Revenue 28d" value={fmtINR(channelDraft.revenueLast28Days)} color="#fbbf24" />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="crm-apply-btn" onClick={applyChannel}>
                Apply Changes to YouTube Studio
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-edit"
                onClick={() => {
                  setChannelDraft(d => ({
                    ...d,
                    viewsLast28Days: totalViews,
                    revenueLast28Days: parseFloat(totalRevenue.toFixed(2)),
                    watchTimeLast28Days: Math.round(totalViews * (2.8 / 60))
                  }));
                }}
              >
                📊 Auto-align with sum of all videos
              </button>
            </div>
          </div>
        )}

        {/* ── DATES & RANGE CONTROL ── */}
        {activeSection === 'dates' && (
          <div className="crm-section">
            <div className="crm-grid-2">
              {/* Anchor Date Card */}
              <div className="crm-card">
                <div className="crm-card-title">📅 1. Simulation Anchor Date (Today)</div>
                <p className="crm-card-desc">
                  Controls the current end date for all time-series simulations and analytics calculations across YouTube Studio.
                </p>

                <div className="crm-field">
                  <label className="crm-field-label">Anchor Date (YYYY-MM-DD)</label>
                  <input
                    className="crm-input"
                    type="date"
                    value={dateDraft.anchorDate}
                    onChange={e => {
                      const newAnchor = e.target.value;
                      if (newAnchor) {
                        const bounds = computeDatesForPreset(dateDraft.preset, newAnchor);
                        if (bounds) {
                          setDateDraft(prev => ({
                            ...prev,
                            anchorDate: newAnchor,
                            startDate: bounds.start,
                            endDate: bounds.end
                          }));
                        } else {
                          const d = new Date(`${newAnchor}T00:00:00Z`);
                          d.setUTCDate(d.getUTCDate() - 27);
                          const autoStart = d.toISOString().split('T')[0];
                          setDateDraft(prev => ({
                            ...prev,
                            anchorDate: newAnchor,
                            endDate: newAnchor,
                            startDate: autoStart
                          }));
                        }
                      }
                    }}
                  />
                </div>

                <div className="crm-quick-pill-row" style={{ marginTop: 8 }}>
                  <span className="crm-field-label" style={{ marginBottom: 0 }}>Quick anchor presets:</span>
                  {[
                    { label: 'Sep 18, 2026 (Default)', date: '2026-09-18' },
                    { label: 'Sep 11, 2026', date: '2026-09-11' },
                    { label: 'Sep 4, 2026', date: '2026-09-04' },
                    { label: 'Sep 1, 2026', date: '2026-09-01' },
                    { label: 'Aug 28, 2026', date: '2026-08-28' },
                    { label: 'Aug 14, 2026', date: '2026-08-14' },
                    { label: 'Aug 4, 2026', date: '2026-08-04' },
                    { label: 'Jul 31, 2026', date: '2026-07-31' },
                    { label: 'Device Date', date: new Date().toISOString().split('T')[0] }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      className={`crm-mini-pill ${dateDraft.anchorDate === p.date ? 'active-pill' : ''}`}
                      onClick={() => {
                        const bounds = computeDatesForPreset(dateDraft.preset, p.date);
                        if (bounds) {
                          setDateDraft(prev => ({
                            ...prev,
                            anchorDate: p.date,
                            startDate: bounds.start,
                            endDate: bounds.end
                          }));
                        } else {
                          const d = new Date(`${p.date}T00:00:00Z`);
                          d.setUTCDate(d.getUTCDate() - 27);
                          const autoStart = d.toISOString().split('T')[0];
                          setDateDraft(prev => ({
                            ...prev,
                            anchorDate: p.date,
                            endDate: p.date,
                            startDate: autoStart
                          }));
                        }
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Preset Selector */}
              <div className="crm-card">
                <div className="crm-card-title">⚙️ 2. Active Analytics Preset</div>
                <p className="crm-card-desc">
                  Select which period YouTube Studio opens by default.
                </p>

                <div className="crm-field">
                  <label className="crm-field-label">Active Preset Range</label>
                  <select
                    className="crm-input"
                    style={{ background: '#121224', color: '#fff', cursor: 'pointer' }}
                    value={dateDraft.preset}
                    onChange={e => {
                      const newPreset = e.target.value;
                      if (newPreset === 'custom') {
                        setDateDraft(prev => ({ ...prev, preset: 'custom' }));
                      } else {
                        const bounds = computeDatesForPreset(newPreset, dateDraft.anchorDate);
                        if (bounds) {
                          setDateDraft(prev => ({
                            ...prev,
                            preset: newPreset,
                            startDate: bounds.start,
                            endDate: bounds.end
                          }));
                        } else {
                          setDateDraft(prev => ({ ...prev, preset: newPreset }));
                        }
                      }
                    }}
                  >
                    <option value="last28">Last 28 days (Default)</option>
                    <option value="last7">Last 7 days</option>
                    <option value="last90">Last 90 days</option>
                    <option value="365">Last 365 days</option>
                    <option value="lifetime">Lifetime</option>
                    <option value="august">August 2026</option>
                    <option value="july">July 2026</option>
                    <option value="june">June 2026</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                <div className="crm-quick-pill-row" style={{ marginTop: 8 }}>
                  <span className="crm-field-label" style={{ marginBottom: 0 }}>Quick presets:</span>
                  {[
                    { label: 'Last 28 days', key: 'last28' },
                    { label: 'Last 7 days', key: 'last7' },
                    { label: 'Last 90 days', key: 'last90' },
                    { label: 'August', key: 'august' },
                    { label: 'Custom', key: 'custom' }
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      className={`crm-mini-pill ${dateDraft.preset === p.key ? 'active-pill' : ''}`}
                      onClick={() => {
                        if (p.key === 'custom') {
                          setDateDraft(prev => ({ ...prev, preset: 'custom' }));
                        } else {
                          const bounds = computeDatesForPreset(p.key, dateDraft.anchorDate);
                          if (bounds) {
                            setDateDraft(prev => ({
                              ...prev,
                              preset: p.key,
                              startDate: bounds.start,
                              endDate: bounds.end
                            }));
                          } else {
                            setDateDraft(prev => ({ ...prev, preset: p.key }));
                          }
                        }
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Date Range Window Card */}
              <div className="crm-card">
                <div className="crm-card-title">📆 3. Custom Date Range Window</div>
                <p className="crm-card-desc">
                  Directly customize start and end dates. Used for "Last 28 days" and "Custom" ranges.
                </p>

                <div className="crm-grid-2">
                  <div className="crm-field">
                    <label className="crm-field-label">Start Date</label>
                    <input
                      className="crm-input"
                      type="date"
                      value={dateDraft.startDate}
                      onChange={e => setDateDraft(prev => ({ ...prev, startDate: e.target.value, preset: 'custom' }))}
                    />
                  </div>
                  <div className="crm-field">
                    <label className="crm-field-label">End Date</label>
                    <input
                      className="crm-input"
                      type="date"
                      value={dateDraft.endDate}
                      onChange={e => setDateDraft(prev => ({ ...prev, endDate: e.target.value, preset: 'custom' }))}
                    />
                  </div>
                </div>

                <div className="crm-quick-pill-row" style={{ marginTop: 8 }}>
                  <span className="crm-field-label" style={{ marginBottom: 0 }}>28-day templates:</span>
                  {[
                    { label: 'Aug 22 – Sep 18, 2026 (Default)', start: '2026-08-22', end: '2026-09-18' },
                    { label: 'Aug 15 – Sep 11, 2026', start: '2026-08-15', end: '2026-09-11' },
                    { label: 'Aug 8 – Sep 4, 2026', start: '2026-08-08', end: '2026-09-04' },
                    { label: 'Aug 5 – Sep 1, 2026', start: '2026-08-05', end: '2026-09-01' },
                    { label: 'Aug 1 – 28, 2026', start: '2026-08-01', end: '2026-08-28' },
                    { label: 'Jul 18 – Aug 14, 2026', start: '2026-07-18', end: '2026-08-14' },
                    { label: 'Jul 7 – Aug 4, 2026', start: '2026-07-07', end: '2026-08-04' },
                    { label: 'Jun 18 – Jul 15, 2026', start: '2026-06-18', end: '2026-07-15' },
                  ].map(t => (
                    <button
                      key={t.label}
                      type="button"
                      className={`crm-mini-pill ${dateDraft.startDate === t.start && dateDraft.endDate === t.end ? 'active-pill' : ''}`}
                      onClick={() => setDateDraft(prev => ({
                        ...prev,
                        startDate: t.start,
                        endDate: t.end,
                        anchorDate: t.end,
                        preset: 'last28'
                      }))}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="crm-card crm-preview-bar-vertical">
                <div className="crm-card-title">🔍 Live Date Preview</div>
                <div className="crm-date-preview-box">
                  <div className="date-preview-main-badge">
                    {formatDateRangeText(dateDraft.startDate, dateDraft.endDate)}
                  </div>
                  <div className="date-preview-details">
                    <div><strong>Active Preset:</strong> {dateDraft.preset}</div>
                    <div><strong>Start Date:</strong> {dateDraft.startDate}</div>
                    <div><strong>End Date:</strong> {dateDraft.endDate}</div>
                    <div><strong>Duration:</strong> {Math.max(1, Math.round((new Date(dateDraft.endDate) - new Date(dateDraft.startDate)) / (1000 * 60 * 60 * 24)) + 1)} days</div>
                    <div style={{ color: '#4ade80', fontSize: '12px', marginTop: '6px' }}>
                      ✓ Synchronizes automatically to: Overview AreaChart, Reach/Content Chart, Engagement Chart, Audience Chart, Revenue Chart, Trends Chart & Tooltips.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="crm-apply-btn" onClick={applyDates}>
                Apply Date Range to YouTube Studio & Graphs
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-cancel"
                onClick={() => {
                  setDateDraft({
                    anchorDate: '2026-09-18',
                    startDate: '2026-08-22',
                    endDate: '2026-09-18',
                    preset: 'last28'
                  });
                }}
              >
                🔄 Reset to Aug 22 – Sep 18, 2026
              </button>
            </div>
          </div>
        )}

        {/* ── GRAPH CONTROLS SECTION (CHANNEL & PER-VIDEO) ── */}
        {activeSection === 'graph' && (
          <div className="crm-section">
            {/* ── CHANNEL GRAPH SCULPTOR ── */}
            <div className="crm-card" style={{ marginBottom: 24 }}>
              <div className="crm-card-header-flex">
                <div>
                  <div className="crm-card-title">📡 Overall Channel Graph Sculptor</div>
                  <p className="crm-card-desc" style={{ marginTop: 4 }}>
                    Directly sculpt the spikes, valleys, hardness, and end-point realtime velocity across all channel analytics. Drag circles directly on the canvas or use sliders below.
                  </p>
                </div>
                <span className="crm-badge crm-badge-green">Channel Level</span>
              </div>

              {/* Interactive Drag & Draw Canvas Preview */}
              <div style={{ marginTop: 14 }}>
                <VisualCurveCanvas
                  nodes={channelGraphDraft.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5]}
                  hardness={channelGraphDraft.hardness || 1.4}
                  color="#38bdf8"
                  onNodeChange={(nodeIdx, newVal) => {
                    setChannelGraphDraft(g => {
                      const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                      n[nodeIdx] = newVal;
                      return { ...g, nodes: n, preset: 'custom' };
                    });
                  }}
                />
              </div>

              {/* Pro Waveform Presets */}
              <div style={{ marginTop: 8 }}>
                <span className="crm-field-label">Pro Waveform Presets:</span>
                <div className="crm-preset-buttons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px', marginTop: '6px' }}>
                  {[
                    { label: '⚡ Twin Peak Viral Surge', preset: 'double_peak', nodes: [1.0, 4.2, 0.8, 6.5, 1.2, 5.8, 3.2], hardness: 1.6, spikiness: 1.0, algo: 1.2 },
                    { label: '🚀 Mega Viral Breakout (Center)', preset: 'center_viral', nodes: [0.8, 1.5, 1.0, 9.0, 1.8, 4.5, 3.0], hardness: 2.2, spikiness: 1.1, algo: 2.0 },
                    { label: '🏔️ Triple Mountain Sawtooth', preset: 'triple_peak', nodes: [1.2, 5.0, 1.0, 5.5, 0.9, 4.8, 3.0], hardness: 1.8, spikiness: 1.3, algo: 1.5 },
                    { label: '📈 Exponential Viral Ramp (High Today)', preset: 'ramp_up', nodes: [0.8, 1.2, 1.8, 2.5, 3.8, 5.5, 6.5], hardness: 1.5, spikiness: 0.9, algo: 1.8 },
                    { label: '🌲 Evergreen Plateau & Strong Tail', preset: 'evergreen', nodes: [1.0, 3.0, 2.2, 2.8, 2.5, 2.9, 2.8], hardness: 1.1, spikiness: 0.7, algo: 0.8 },
                    { label: '⚡ High Volatility Lightning Storm', preset: 'lightning', nodes: [1.0, 6.5, 0.4, 7.8, 0.5, 6.8, 3.5], hardness: 2.5, spikiness: 1.8, algo: 2.5 },
                    { label: '🌊 Smooth Flowing Wave', preset: 'smooth_wave', nodes: [1.0, 2.5, 1.8, 3.5, 2.6, 3.2, 2.5], hardness: 1.0, spikiness: 0.4, algo: 0.4 }
                  ].map(p => (
                    <button
                      key={p.preset}
                      type="button"
                      className={`crm-btn ${channelGraphDraft.preset === p.preset ? 'crm-btn-edit active-pill' : 'crm-btn-cancel'}`}
                      style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'left' }}
                      onClick={() => setChannelGraphDraft(g => ({
                        ...g,
                        preset: p.preset,
                        nodes: [...p.nodes],
                        hardness: p.hardness,
                        spikiness: p.spikiness,
                        algoFrequency: p.algo
                      }))}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7 Interactive Node Sliders */}
              <div style={{ marginTop: 20, background: '#121226', padding: '16px', borderRadius: '10px', border: '1px solid #1e1e38' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="crm-field-label" style={{ margin: 0, fontWeight: 700, color: '#e2e8f0' }}>
                    ✍️ Sculpt Timeline Spike Nodes (Start → Middle Peaks & Dips → Today Endpoint)
                  </span>
                  <span style={{ fontSize: 11, color: '#4ade80' }}>✓ Live Realtime Endpoint Grounded</span>
                </div>

                <div className="crm-grid-3" style={{ gap: 12 }}>
                  {/* Node 1 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0 }}>1. Start (Data Base)</label>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[0] || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[0] || 1.0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[0] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#94a3b8' }}
                    />
                  </div>

                  {/* Node 2 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#38bdf8' }}>2. Early Surge (Spike 1)</label>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[1] || 3.5).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[1] || 3.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[1] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  {/* Node 3 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#f43f5e' }}>3. Valley 1 (Dip)</label>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[2] || 0.9).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="6.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[2] || 0.9}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[2] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#f43f5e' }}
                    />
                  </div>

                  {/* Node 4 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#a855f7' }}>4. Main Viral Peak (Spike 2)</label>
                      <span style={{ color: '#a855f7', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[3] || 4.8).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[3] || 4.8}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[3] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#a855f7' }}
                    />
                  </div>

                  {/* Node 5 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#f43f5e' }}>5. Valley 2 (Dip)</label>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[4] || 1.1).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="6.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[4] || 1.1}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[4] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#f43f5e' }}
                    />
                  </div>

                  {/* Node 6 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#38bdf8' }}>6. Late Surge (Spike 3)</label>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[5] || 3.6).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[5] || 3.6}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[5] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  {/* Node 7 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#4ade80' }}>7. Today (Realtime Endpoint)</label>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>{Number(channelGraphDraft.nodes?.[6] || 2.5).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="8.0"
                      step="0.1"
                      value={channelGraphDraft.nodes?.[6] || 2.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setChannelGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5])];
                          n[6] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#4ade80' }}
                    />
                  </div>
                </div>
              </div>

              {/* Hardness & Dynamics */}
              <div className="crm-grid-3" style={{ marginTop: 16 }}>
                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Spike Hardness & Sharpness</label>
                    <span style={{ color: '#a855f7', fontWeight: 600 }}>{Number(channelGraphDraft.hardness || 1.4).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={channelGraphDraft.hardness || 1.4}
                    onChange={e => setChannelGraphDraft(g => ({ ...g, hardness: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Smooth (1.0)</span>
                    <span>Sharp Needles (3.5)</span>
                  </div>
                </div>

                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Daily Jaggedness / Jitter</label>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{Number(channelGraphDraft.spikiness).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={channelGraphDraft.spikiness}
                    onChange={e => setChannelGraphDraft(g => ({ ...g, spikiness: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Zero Noise (0.0x)</span>
                    <span>Extreme (2.5x)</span>
                  </div>
                </div>

                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Upload Day Surge Multiplier</label>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>{Number(channelGraphDraft.uploadSurge).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={channelGraphDraft.uploadSurge}
                    onChange={e => setChannelGraphDraft(g => ({ ...g, uploadSurge: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#4ade80', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Mild (0.5x)</span>
                    <span>Huge (3.0x)</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="crm-apply-btn" onClick={applyChannelGraph}>
                  Apply Channel Graph Settings
                </button>
                <button
                  type="button"
                  className="crm-btn crm-btn-cancel"
                  onClick={() => {
                    setChannelGraphDraft({
                      spikiness: 1.0,
                      algoFrequency: 1.0,
                      uploadSurge: 1.0,
                      hardness: 1.4,
                      nodes: [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 2.5],
                      preset: 'spiky'
                    });
                  }}
                >
                  🔄 Reset Channel Default
                </button>
              </div>
            </div>

            {/* ── PER-VIDEO GRAPH SCULPTOR ── */}
            <div className="crm-card">
              <div className="crm-card-header-flex">
                <div>
                  <div className="crm-card-title">🎬 Individual Video Curve Sculptor</div>
                  <p className="crm-card-desc" style={{ marginTop: 4 }}>
                    Sculpt the launch peak, mid recommendation spikes, decay drop-off rate, and elevated realtime end point for any specific video.
                  </p>
                </div>
                <span className="crm-badge crm-badge-blue">Per-Video Curve</span>
              </div>

              {/* Video Selector Dropdown */}
              <div style={{ marginTop: 14, background: '#121226', padding: '14px', borderRadius: '10px', border: '1px solid #1e1e38' }}>
                <label className="crm-field-label" style={{ marginBottom: 6 }}>Select Video to Sculpt:</label>
                <select
                  className="crm-input"
                  value={selectedGraphVideoId}
                  onChange={e => setSelectedGraphVideoId(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a14', color: '#e2e8f0', border: '1px solid #2a2a4a', borderRadius: '8px' }}
                >
                  {videos.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.title} ({v.viewsFormatted || Number(v.views).toLocaleString()} views)
                    </option>
                  ))}
                </select>

                {(() => {
                  const selV = videos.find(v => v.id === selectedGraphVideoId) || videos[0];
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <img
                        src={selV?.thumbnail || '/thumbnails/1.webp'}
                        alt={selV?.title}
                        style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #333' }}
                      />
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{selV?.title}</span>
                        <div style={{ marginTop: 2 }}>Published: {selV?.publishDate || selV?.date || '2026-08-16'} • Views: {selV?.viewsFormatted || Number(selV?.views).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Interactive Video Canvas Preview */}
              <div style={{ marginTop: 16 }}>
                <VisualCurveCanvas
                  nodes={videoGraphDraft.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5]}
                  hardness={videoGraphDraft.hardness || 1.4}
                  color="#a855f7"
                  onNodeChange={(nodeIdx, newVal) => {
                    setVideoGraphDraft(g => {
                      const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                      n[nodeIdx] = newVal;
                      return { ...g, nodes: n, preset: 'custom' };
                    });
                  }}
                />
              </div>

              {/* 7 Node Sliders for Video */}
              <div style={{ background: '#121226', padding: '16px', borderRadius: '10px', border: '1px solid #1e1e38', marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="crm-field-label" style={{ margin: 0, fontWeight: 700, color: '#e2e8f0' }}>
                    ✍️ Sculpt Video Nodes (Launch Peak → Mid Recommendation Surges → Realtime Endpoint)
                  </span>
                  <span style={{ fontSize: 11, color: '#4ade80' }}>Endpoint anchored to Realtime Traffic</span>
                </div>

                <div className="crm-grid-3" style={{ gap: 12 }}>
                  {/* Video Node 1 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0 }}>1. Launch Day (Base)</label>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[0] || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[0] || 1.0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[0] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#94a3b8' }}
                    />
                  </div>

                  {/* Video Node 2 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#a855f7' }}>2. Launch Surge Peak</label>
                      <span style={{ color: '#a855f7', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[1] || 4.5).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10.0"
                      step="0.25"
                      value={videoGraphDraft.nodes?.[1] || 4.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[1] = val;
                          return { ...g, nodes: n, launchSpike: val, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#a855f7' }}
                    />
                  </div>

                  {/* Video Node 3 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#f43f5e' }}>3. Decay Dip</label>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[2] || 0.9).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="6.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[2] || 0.9}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[2] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#f43f5e' }}
                    />
                  </div>

                  {/* Video Node 4 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#fbbf24' }}>4. Browse / Search Surge</label>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[3] || 3.8).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[3] || 3.8}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[3] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#fbbf24' }}
                    />
                  </div>

                  {/* Video Node 5 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#f43f5e' }}>5. Mid Dip</label>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[4] || 1.1).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="6.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[4] || 1.1}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[4] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#f43f5e' }}
                    />
                  </div>

                  {/* Video Node 6 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#38bdf8' }}>6. Recommendation Bump</label>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[5] || 2.5).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[5] || 2.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[5] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  {/* Video Node 7 */}
                  <div className="crm-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="crm-field-label" style={{ margin: 0, color: '#4ade80' }}>7. Today (Realtime Endpoint)</label>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>{Number(videoGraphDraft.nodes?.[6] || 2.5).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="8.0"
                      step="0.1"
                      value={videoGraphDraft.nodes?.[6] || 2.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setVideoGraphDraft(g => {
                          const n = [...(g.nodes || [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5])];
                          n[6] = val;
                          return { ...g, nodes: n, preset: 'custom' };
                        });
                      }}
                      style={{ width: '100%', accentColor: '#4ade80' }}
                    />
                  </div>
                </div>
              </div>

              {/* Video Hardness & Decay */}
              <div className="crm-grid-3" style={{ marginTop: 16 }}>
                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Peak Hardness & Sharpness</label>
                    <span style={{ color: '#a855f7', fontWeight: 600 }}>{Number(videoGraphDraft.hardness || 1.4).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={videoGraphDraft.hardness || 1.4}
                    onChange={e => setVideoGraphDraft(g => ({ ...g, hardness: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Smooth (1.0)</span>
                    <span>Sharp (3.5)</span>
                  </div>
                </div>

                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Decay Drop-off Rate</label>
                    <span style={{ color: '#f43f5e', fontWeight: 600 }}>{Number(videoGraphDraft.decayRate).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={videoGraphDraft.decayRate}
                    onChange={e => setVideoGraphDraft(g => ({ ...g, decayRate: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#f43f5e', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Sustained (0.2x)</span>
                    <span>Fast Drop (3.0x)</span>
                  </div>
                </div>

                <div className="crm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="crm-field-label" style={{ margin: 0 }}>Daily Jitter / Noise</label>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{Number(videoGraphDraft.spikiness).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={videoGraphDraft.spikiness}
                    onChange={e => setVideoGraphDraft(g => ({ ...g, spikiness: parseFloat(e.target.value), preset: 'custom' }))}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Zero (0.0x)</span>
                    <span>Extreme (2.5x)</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                <button className="crm-apply-btn" onClick={applyVideoGraph}>
                  Apply to Selected Video
                </button>
                <button
                  type="button"
                  className="crm-btn crm-btn-edit"
                  style={{ background: '#1e1035', color: '#a78bfa' }}
                  onClick={applyVideoGraphToAll}
                >
                  🌐 Apply this Curve to ALL Videos
                </button>
                <button
                  type="button"
                  className="crm-btn crm-btn-cancel"
                  onClick={() => {
                    setVideoGraphDraft({
                      launchSpike: 4.5,
                      spikiness: 1.0,
                      algoFrequency: 1.0,
                      decayRate: 1.0,
                      hardness: 1.4,
                      nodes: [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 2.5],
                      preset: 'standard'
                    });
                  }}
                >
                  🔄 Reset Video Curve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BULK ACTIONS ── */}
        {activeSection === 'bulk' && (
          <div className="crm-section crm-grid-2">
            <div className="crm-card">
              <div className="crm-card-title">₹ Set Global RPM</div>
              <p className="crm-card-desc">Override RPM for every video. Revenue will be recalculated automatically (Revenue = Views / 1000 × RPM).</p>
              <CRMInput label="RPM (₹)" value={bulkRPM}
                onChange={v => setBulkRPM(v)} min={0} step={0.01} unit="₹" />
              <div className="crm-quick-pill-row" style={{ marginTop: 6 }}>
                <span className="crm-field-label" style={{ marginBottom: 0 }}>Quick RPM:</span>
                {[30, 35, 50, 75, 100, 150].map(r => (
                  <button
                    key={r}
                    type="button"
                    className="crm-mini-pill"
                    onClick={() => setBulkRPM(r)}
                  >
                    ₹{r}
                  </button>
                ))}
              </div>
              <div className="crm-preview-small" style={{ marginTop: 10 }}>
                Estimated total revenue at this RPM: <strong>{fmtINR((totalViews / 1000) * bulkRPM)}</strong>
              </div>
              <button className="crm-apply-btn" onClick={applyBulkRPM}>
                Apply to All Videos
              </button>
            </div>

            <div className="crm-card">
              <div className="crm-card-title">✖️ Multiply All Views</div>
              <p className="crm-card-desc">Scale every video's views by a factor. Example: 1.5 = +50%, 0.8 = -20%.</p>
              <CRMInput label="Multiplier" value={bulkFactor}
                onChange={v => setBulkFactor(v)} min={0.01} step={0.05} />
              <div className="crm-quick-pill-row" style={{ marginTop: 6 }}>
                <span className="crm-field-label" style={{ marginBottom: 0 }}>Quick multipliers:</span>
                {[0.8, 1.25, 1.5, 2.0, 5.0, 10.0].map(m => (
                  <button
                    key={m}
                    type="button"
                    className="crm-mini-pill"
                    onClick={() => setBulkFactor(m)}
                  >
                    {m}×
                  </button>
                ))}
              </div>
              <div className="crm-preview-small" style={{ marginTop: 10 }}>
                Total views will become: <strong>{fmt(Math.round(totalViews * bulkFactor))}</strong>
                {' '}(currently {fmt(totalViews)})
              </div>
              <button className="crm-apply-btn" onClick={applyBulkMultiply}>
                Apply Multiplier
              </button>
            </div>

            <div className="crm-card">
              <div className="crm-card-title">🚀 Preset Scenarios</div>
              <p className="crm-card-desc">Instantly load pre-configured high-performance data profiles across your channel and videos.</p>
              <div className="crm-preset-buttons">
                <button className="crm-btn crm-btn-edit" style={{ background: '#1e1035', color: '#a78bfa' }} onClick={() => { crmApplyPreset('viral'); showToast('Loaded Viral Spike preset (45M views, ₹1.85L rev) ✓', 'success'); }}>
                  🚀 Viral Spike (45M Views)
                </button>
                <button className="crm-btn crm-btn-edit" style={{ background: '#172554', color: '#60a5fa' }} onClick={() => { crmApplyPreset('high_rpm'); showToast('Set High RPM preset (₹85.50 RPM) ✓', 'success'); }}>
                  💰 High RPM (₹85.50 RPM)
                </button>
                <button className="crm-btn crm-btn-cancel" onClick={() => { reloadFromSpreadsheet(); showToast('Reset to original spreadsheet data ✓', 'info'); }}>
                  🔄 Reset Baseline
                </button>
              </div>
            </div>

            <div className="crm-card crm-card-warning">
              <div className="crm-card-title">⚠️ Notes</div>
              <ul className="crm-warning-list">
                <li>Changes are saved in <strong>persistent browser state</strong>.</li>
                <li>Thumbnails and subscriber gains reflect instantly in Dashboard, Content, and Video Analytics.</li>
                <li>The YouTube Studio UI reflects changes instantly via shared state.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── LIVE PREVIEW ── */}
        {activeSection === 'preview' && (
          <div className="crm-section">
            <div className="crm-grid-3">
              {/* Channel */}
              <div className="crm-card">
                <div className="crm-card-title">📡 Channel</div>
                <StatPreview label="Name" value={channelInfo?.name || '—'} color="#e2e8f0" />
                <StatPreview label="Subscribers" value={channelInfo?.subscribersFormatted || '—'} />
                <StatPreview label="Subs Gained (28d)" value={channelInfo?.subscribersGainedLast28DaysFormatted || '—'} color="#4ade80" />
                <StatPreview label="Views (28d)" value={channelInfo?.viewsLast28DaysFormatted || '—'} />
                <StatPreview label="Watch Time (28d)" value={channelInfo?.watchTimeLast28DaysFormatted || '—'} />
                <StatPreview label="Revenue (28d)" value={channelInfo?.revenueLast28DaysFormatted || '—'} color="#fbbf24" />
              </div>

              {/* Aggregated video stats */}
              <div className="crm-card">
                <div className="crm-card-title">🎬 Aggregated Videos</div>
                <StatPreview label="Total Videos" value={videos.length} />
                <StatPreview label="Total Views" value={fmt(totalViews)} />
                <StatPreview label="Total Revenue" value={fmtINR(totalRevenue)} color="#fbbf24" />
                <StatPreview label="Avg RPM" value={`₹${avgRPM}`} color="#a78bfa" />
                <StatPreview label="Total Likes" value={fmt(videos.reduce((a, v) => a + (v.likes || 0), 0))} color="#f472b6" />
                <StatPreview label="Total Comments" value={fmt(videos.reduce((a, v) => a + (v.comments || 0), 0))} />
              </div>

              {/* Top 5 videos */}
              <div className="crm-card">
                <div className="crm-card-title">🏆 Top 5 by Revenue</div>
                {[...videos].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5).map(v => (
                  <div key={v.id} className="crm-top-item">
                    <span className="crm-top-name">{v.title}</span>
                    <span className="crm-top-val">{v.revenueFormatted || fmtINR(v.revenue || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* All videos snapshot */}
            <div className="crm-card" style={{ marginTop: 16 }}>
              <div className="crm-card-title">📋 All Videos Snapshot</div>
              <div className="crm-table-wrap">
                <table className="crm-table crm-table-compact">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title</th>
                      <th>Subs Gained</th>
                      <th>Views</th>
                      <th>Avg Duration (AVD)</th>
                      <th>Likes</th>
                      <th>RPM</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => (
                      <tr key={v.id}>
                        <td><img src={v.thumbnail} alt="" className="crm-vid-thumb" /></td>
                        <td className="crm-vid-name" style={{ maxWidth: 260 }}>{v.title}</td>
                        <td style={{ color: '#4ade80' }}>+{fmt(v.subscribersGained !== undefined ? v.subscribersGained : Math.round(v.views * 0.014))}</td>
                        <td>{v.viewsFormatted}</td>
                        <td><span style={{ color: '#38bdf8' }}>⏱️ {v.avgViewDuration || formatSecondsToAvd(v.avgViewDurationSecs || 105)}</span></td>
                        <td>{(v.likes || 0).toLocaleString()}</td>
                        <td>₹{(v.rpm || 33.64).toFixed(2)}</td>
                        <td className="crm-revenue-cell">{v.revenueFormatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
