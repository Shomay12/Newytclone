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
} from 'recharts';
import { fmtV, formatINR } from '../../store/useStore';
import {
  formatCompactINR,
  formatCountComma,
  formatPctValue,
  formatPublishDate,
  getVideoRevenueValue,
} from './analyticsFormatters';

const SERIES_COLORS = ['#1a73e8', '#e37400', '#1e8e3e', '#9334e6', '#d93025', '#00897b'];

const REPORT_DIMENSIONS = [
  { key: 'content', label: 'Content' },
  { key: 'traffic', label: 'Traffic source' },
  { key: 'geography', label: 'Geography' },
  { key: 'age', label: 'Viewer age' },
  { key: 'gender', label: 'Viewer gender' },
];

export default function AdvancedModeView({
  channelInfo,
  videos = [],
  daily = [],
  aggregated = {},
  trafficSources = [],
  audience = {},
  datePreset,
  setDatePreset,
  dateRangeLabel,
  videoId,
  onClose,
}) {
  const [dimension, setDimension] = useState(videoId ? 'traffic' : 'content');
  const [metric, setMetric] = useState('views');
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [granularity, setGranularity] = useState('daily');
  const [searchFilter, setSearchFilter] = useState('');
  const [checkedRowIds, setCheckedRowIds] = useState(() => {
    const initial = [];
    if (videos.length > 0) {
      videos.slice(0, 3).forEach((v) => initial.push(v.id));
    }
    return initial;
  });

  const tableRows = useMemo(() => {
    let list = [];
    if (dimension === 'traffic') {
      list = (trafficSources || []).map((s, i) => {
        const share = Number(s.percentage ?? s.share ?? 15) / 100;
        return {
          id: `tr-${i}`,
          name: s.source || s.name || `Source ${i + 1}`,
          views: s.views ?? Math.round((aggregated.views || 0) * share),
          watchTimeHrs: s.watchTimeHrs ?? Number(((aggregated.watchTimeHrs || 0) * share).toFixed(1)),
          subscribers: Math.round((aggregated.subscribersNet || 0) * share),
          revenue: Number(((aggregated.revenue || 0) * share).toFixed(2)),
          impressions: Math.round((aggregated.impressions || (aggregated.views || 0) * 14) * share),
          ctr: s.ctr || '6.3%',
        };
      });
    } else if (dimension === 'geography') {
      const geos = [
        { country: 'United States', percentage: 47.3 },
        { country: 'Canada', percentage: 18.4 },
        { country: 'Germany', percentage: 14.6 },
        { country: 'Italy', percentage: 10.9 },
        { country: 'France', percentage: 8.8 },
      ];
      list = geos.map((g, i) => {
        const share = Number(g.percentage ?? g.share ?? 15) / 100;
        return {
          id: `geo-${i}`,
          name: g.country || g.name || `Region ${i + 1}`,
          views: Math.round((aggregated.views || 0) * share),
          watchTimeHrs: Number(((aggregated.watchTimeHrs || 0) * share).toFixed(1)),
          subscribers: Math.round((aggregated.subscribersNet || 0) * share),
          revenue: Number(((aggregated.revenue || 0) * share).toFixed(2)),
          impressions: Math.round((aggregated.impressions || (aggregated.views || 0) * 14) * share),
          ctr: '8.9%',
        };
      });
    } else if (dimension === 'gender') {
      const genders = [
        { group: 'Male', percentage: 85.0 },
        { group: 'Female', percentage: 14.9 },
        { group: 'User-specified', percentage: 0.1 },
      ];
      list = genders.map((g, i) => {
        const share = Number(g.percentage) / 100;
        return {
          id: `gen-${i}`,
          name: g.group,
          views: Math.round((aggregated.views || 0) * share),
          watchTimeHrs: Number(((aggregated.watchTimeHrs || 0) * share).toFixed(1)),
          subscribers: Math.round((aggregated.subscribersNet || 0) * share),
          revenue: Number(((aggregated.revenue || 0) * share).toFixed(2)),
          impressions: Math.round((aggregated.impressions || (aggregated.views || 0) * 14) * share),
          ctr: '8.9%',
        };
      });
    } else if (dimension === 'age') {
      const ages = [
        { group: '13–17 years', percentage: 4.6 },
        { group: '18–24 years', percentage: 27.6 },
        { group: '25–34 years', percentage: 43.3 },
        { group: '35–44 years', percentage: 19.1 },
        { group: '45–54 years', percentage: 4.4 },
        { group: '55–64 years', percentage: 0.6 },
        { group: '65+ years', percentage: 0.3 },
      ];
      list = ages.map((a, i) => {
        const share = Number(a.percentage ?? a.total ?? 25) / 100;
        return {
          id: `ag-${i}`,
          name: a.group || a.age || `Segment ${i + 1}`,
          views: Math.round((aggregated.views || 0) * share),
          watchTimeHrs: Number(((aggregated.watchTimeHrs || 0) * share).toFixed(1)),
          subscribers: Math.round((aggregated.subscribersNet || 0) * share),
          revenue: Number(((aggregated.revenue || 0) * share).toFixed(2)),
          impressions: Math.round((aggregated.impressions || (aggregated.views || 0) * 14) * share),
          ctr: '8.9%',
        };
      });
    } else {
      const srcVideos = videoId ? videos.filter((v) => v.id === videoId) : videos;
      list = srcVideos.map((v) => ({
        id: v.id,
        name: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration || '12:40',
        publishDate: formatPublishDate(v),
        views: v.views || 0,
        watchTimeHrs: v.watchTimeHrs || Math.round((v.views || 0) * 0.065),
        subscribers: v.subscribersGained || Math.max(1, Math.round((v.views || 0) * 0.008)),
        revenue: getVideoRevenueValue(v),
        impressions: v.impressions || Math.round((v.views || 0) * 14.5),
        ctr: formatPctValue(v.ctr, '6.7%'),
      }));
    }

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter((r) => r.name.toLowerCase().includes(q));
  }, [dimension, videos, trafficSources, audience, aggregated, videoId, searchFilter]);

  const activeSeriesList = useMemo(() => {
    const selectedRows = tableRows.filter((r) => checkedRowIds.includes(r.id));
    const list = [];
    if (selectedRows.length === 0 || checkedRowIds.includes('total')) {
      list.push({ id: 'total', name: 'Total', color: SERIES_COLORS[0], weight: 1 });
    }
    const denom = Math.max(1, aggregated[metric] || aggregated.views || 100);
    selectedRows.forEach((r, idx) => {
      list.push({
        id: r.id,
        name: r.name.length > 28 ? `${r.name.slice(0, 28)}…` : r.name,
        color: SERIES_COLORS[(idx + 1) % SERIES_COLORS.length],
        weight: Math.min(0.95, Math.max(0.06, (r[metric] || r.views || 10) / denom)),
      });
    });
    return list;
  }, [tableRows, checkedRowIds, aggregated, metric]);

  const chartData = useMemo(() => {
    return (daily || []).map((d, idx) => {
      const baseVal = Number(d[metric] ?? d.views ?? 0);
      const rawDate = d.label || d.dateLabel || d.date || `Day ${idx + 1}`;
      const label = /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))
        ? formatPublishDate(rawDate)
        : rawDate;
      const point = {
        label,
        fullDate: d.date || label,
      };
      activeSeriesList.forEach((ser) => {
        point[ser.id] =
          ser.id === 'total'
            ? baseVal
            : Math.round(baseVal * ser.weight * (0.85 + (idx % 4) * 0.08));
      });
      return point;
    });
  }, [daily, metric, activeSeriesList]);

  const toggleRowCheck = (id) => {
    setCheckedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sumRows = (key, fallback) => {
    const s = tableRows.reduce((acc, r) => acc + Math.max(0, Number(r[key] || 0)), 0);
    return Math.max(1, s > 0 ? s : Number(fallback || 1));
  };
  const totalViews = sumRows('views', aggregated.views);
  const totalWt = sumRows('watchTimeHrs', aggregated.watchTimeHrs);
  const totalSubs = sumRows('subscribers', aggregated.subscribersNet);
  const totalRev = sumRows('revenue', aggregated.revenue);
  const [savedReport, setSavedReport] = useState(false);
  const isContentDim = dimension === 'content';

  const handleExportCsv = () => {
    const header = `${dimension},Views,WatchTimeHours,Subscribers,EstimatedRevenue,Impressions,CTR\n`;
    const body = tableRows
      .map(
        (r) =>
          `"${String(r.name || '').replace(/"/g, '""')}",${r.views},${r.watchTimeHrs},${r.subscribers},${r.revenue},${r.impressions},${r.ctr}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-studio-${dimension}-${datePreset || 'report'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="an26-adv-shell">
      {/* Top Advanced Mode Bar */}
      <div className="an26-adv-topbar">
        <div className="an26-adv-title-group">
          <h1 className="yt-display-font">Advanced mode</h1>
          <div className="an26-adv-report-sel">
            <span className="an26-adv-rep-sub">Report</span>
            <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
              {REPORT_DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" className="an26-icon-circle" onClick={onClose} title="Close Advanced mode">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Left Controls Rail + Main Explore Canvas */}
      <div className="an26-adv-body">
        <aside className="an26-adv-controls">
          <button
            type="button"
            className="an26-adv-compare-btn"
            onClick={() => setCheckedRowIds(['total', ...videos.slice(0, 3).map((v) => v.id)])}
          >
            Add comparison
          </button>

          <h3 className="an26-ctrl-heading">Controls</h3>

          <div className="an26-ctrl-box">
            <span className="an26-ctrl-box-lbl">Channel</span>
            <span className="an26-ctrl-box-val">{channelInfo?.name || 'Jesus Is The Lord'}</span>
          </div>

          <div className="an26-ctrl-box">
            <span className="an26-ctrl-box-lbl">{dateRangeLabel}</span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="an26-ctrl-box-sel"
            >
              <option value="last7">Last 7 days</option>
              <option value="last28">Last 28 days</option>
              <option value="last90">Last 90 days</option>
              <option value="last365">Last 365 days</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          <div className="an26-ctrl-field">
            <span className="an26-ctrl-lbl">Breakdown</span>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="an26-ctrl-outline-sel"
            >
              {REPORT_DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="an26-ctrl-field">
            <span className="an26-ctrl-lbl">Metrics</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="an26-ctrl-outline-sel"
            >
              <option value="views">Views, Watch time (h)…</option>
              <option value="watchTimeHrs">Watch time (hours)</option>
              <option value="subscribers">Subscribers</option>
              <option value="revenue">Estimated revenue</option>
            </select>
          </div>

          <div className="an26-ctrl-field">
            <span className="an26-ctrl-lbl">Filter</span>
            <input
              type="text"
              placeholder="Search for filter"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="an26-ctrl-filter-inp"
            />
          </div>
        </aside>

        <div className="an26-adv-main">
          <div className="an26-adv-chart-toolbar">
            <h2 className="an26-adv-chart-title">
              {metric === 'watchTimeHrs'
                ? 'Watch time (hours)'
                : metric === 'subscribers'
                ? 'Subscribers'
                : metric === 'revenue'
                ? 'Estimated revenue'
                : 'Views'}{' '}
              by {REPORT_DIMENSIONS.find((d) => d.key === dimension)?.label || 'Content'}
            </h2>

            <div className="an26-adv-right-tools">
              <div
                className="an26-toggle-label"
                onClick={() => setShowChart((prev) => !prev)}
                role="presentation"
              >
                <span>Show chart</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showChart}
                  className={`an26-switch ${showChart ? 'on' : ''}`}
                  aria-label="Show chart"
                >
                  <span className="an26-switch-thumb" />
                </button>
              </div>

              <button
                type="button"
                className="an26-adv-tool-ic"
                title={savedReport ? 'Report saved' : 'Save report'}
                onClick={() => setSavedReport((v) => !v)}
              >
                <span className="material-symbols-outlined">
                  {savedReport ? 'bookmark' : 'bookmark_border'}
                </span>
              </button>

              <button
                type="button"
                className="an26-adv-tool-ic"
                title="Export CSV"
                onClick={handleExportCsv}
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>

          {showChart && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="an26-adv-pill-sel"
                >
                  <option value="line">Line chart</option>
                  <option value="bar">Bar chart</option>
                </select>
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value)}
                  className="an26-adv-pill-sel"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div className="an26-adv-chart-wrap">
                <div style={{ width: '100%', height: 245 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} stroke="#ececec" />
                        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#606060' }} minTickGap={26} />
                        <YAxis
                          orientation="left"
                          tick={{ fontSize: 10.5, fill: '#606060' }}
                          width={52}
                          tickFormatter={(v) => (metric === 'revenue' ? formatCompactINR(v) : fmtV(v))}
                        />
                        <Tooltip />
                        {activeSeriesList.map((ser) => (
                          <Bar key={ser.id} dataKey={ser.id} name={ser.name} fill={ser.color} isAnimationActive={false} />
                        ))}
                      </BarChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid vertical={false} stroke="#ececec" />
                        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#606060' }} minTickGap={26} />
                        <YAxis
                          orientation="left"
                          tick={{ fontSize: 10.5, fill: '#606060' }}
                          width={52}
                          tickFormatter={(v) => (metric === 'revenue' ? formatCompactINR(v) : fmtV(v))}
                        />
                        <Tooltip />
                        {activeSeriesList.map((ser) => (
                          <Line
                            key={ser.id}
                            type="linear"
                            dataKey={ser.id}
                            name={ser.name}
                            stroke={ser.color}
                            strokeWidth={1.6}
                            dot={false}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Breakdown Data Table */}
          <div className="an26-adv-table-wrap">
            <table className="an26-adv-table">
              <thead>
                <tr>
                  <th className="col-name">
                    <div>{REPORT_DIMENSIONS.find((d) => d.key === dimension)?.label || 'Content'}</div>
                    {isContentDim && (
                      <div className="an26-adv-subcols">
                        <span>Duration</span>
                        <span>Publish date</span>
                      </div>
                    )}
                  </th>
                  <th style={{ width: 32, textAlign: 'center' }}>
                    <button
                      type="button"
                      className="an26-adv-add-col"
                      title="Compare metric"
                      onClick={() =>
                        setMetric((m) =>
                          m === 'views'
                            ? 'watchTimeHrs'
                            : m === 'watchTimeHrs'
                            ? 'subscribers'
                            : m === 'subscribers'
                            ? 'revenue'
                            : 'views'
                        )
                      }
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </th>
                  <th>Views ↓</th>
                  <th className="an26-adv-th-wrap">Watch time (hours)</th>
                  <th>Subscribers</th>
                  <th>
                    <span className="an26-adv-th-ic">
                      <span>Estimated revenue</span>
                      <span className="material-symbols-outlined">schedule</span>
                    </span>
                  </th>
                  <th className="an26-adv-th-wrap">Thumbnail impressions</th>
                  <th className="an26-adv-th-wrap">Thumbnail click-through rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="total-row">
                  <td className="col-name">
                    <div
                      className="an26-row-check"
                      onClick={() => toggleRowCheck('total')}
                      role="presentation"
                    >
                      <span
                        className="an26-row-chkbox"
                        style={{
                          borderColor: SERIES_COLORS[0],
                          backgroundColor: checkedRowIds.includes('total') ? SERIES_COLORS[0] : '#ffffff',
                        }}
                      >
                        {checkedRowIds.includes('total') ? '✓' : ''}
                      </span>
                      <strong>Total</strong>
                    </div>
                  </td>
                  <td />
                  <td>
                    <strong>{formatCountComma(aggregated.views || 0)}</strong>
                  </td>
                  <td>
                    <strong>{Number(aggregated.watchTimeHrs || 0).toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong>
                  </td>
                  <td>
                    <strong>{formatCountComma(aggregated.subscribersNet || 0)}</strong>
                  </td>
                  <td>
                    <strong>{formatINR(aggregated.revenue || 0)}</strong>
                  </td>
                  <td>
                    <strong>{formatCountComma(aggregated.impressions || Math.round((aggregated.views || 0) * 14))}</strong>
                  </td>
                  <td>
                    <strong>{formatPctValue(aggregated.ctr, '8.9%')}</strong>
                  </td>
                </tr>

                {tableRows.map((row, idx) => {
                  const isChecked = checkedRowIds.includes(row.id);
                  const accentColor = SERIES_COLORS[(idx + 1) % SERIES_COLORS.length];
                  return (
                    <tr key={row.id}>
                      <td className="col-name">
                        <div
                          className="an26-row-check"
                          onClick={() => toggleRowCheck(row.id)}
                          role="presentation"
                        >
                          <span
                            className="an26-row-chkbox"
                            style={{
                              borderColor: isChecked ? accentColor : '#909090',
                              backgroundColor: isChecked ? accentColor : '#ffffff',
                            }}
                          >
                            {isChecked ? '✓' : ''}
                          </span>
                          {row.thumbnail && (
                            <div className="an26-adv-thumb-box">
                              <img src={row.thumbnail} alt="" className="an26-adv-thumb" />
                              {row.duration && (
                                <span className="an26-adv-dur-badge">{row.duration}</span>
                              )}
                            </div>
                          )}
                          <span className="an26-row-title">{row.name}</span>
                        </div>
                      </td>
                      <td />
                      <td>
                        <span>{formatCountComma(row.views || 0)}</span>
                        <span className="an26-pct-sub">
                          {((Number(row.views || 0) / totalViews) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span>{Number(row.watchTimeHrs || 0).toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
                        <span className="an26-pct-sub">
                          {((Number(row.watchTimeHrs || 0) / totalWt) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span>{formatCountComma(row.subscribers || 0)}</span>
                        <span className="an26-pct-sub">
                          {((Number(row.subscribers || 0) / totalSubs) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span>{formatINR(row.revenue || 0)}</span>
                        <span className="an26-pct-sub">
                          {((Number(row.revenue || 0) / totalRev) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>{formatCountComma(row.impressions || 0)}</td>
                      <td>{formatPctValue(row.ctr, '6.3%')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
