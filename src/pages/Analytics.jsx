import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, fmtV, formatINR } from '../store/useStore';
import { StudioUpBadge, StudioDownBadge, StudioCheckBadge } from '../components/StudioBadges';
import {
  AskSparkleIcon,
  AiReportIcon,
  HubContentIcon,
  HubAudienceIcon,
  HubRevenueIcon,
  HubResearchIcon,
  HubReachIcon,
  HubEngagementIcon,
} from '../components/StudioIcons';
import { openAskStudio } from '../components/AskStudioDrawer';
import {
  formatCompactINR,
  formatCountComma,
  formatHoursValue,
  formatPctValue,
  formatPublishDate,
  getVideoRevenueFormatted,
  getVideoRevenueValue,
} from './analytics/analyticsFormatters';
import {
  StudioLineMetricChart,
  MiniSparklineChart,
  Realtime48hBarChart,
  StudioProgressList,
  SegmentedStatList,
  AudienceHeatmapGrid,
  ReachFunnelCard,
  NotificationFunnelCard,
  RetentionCurveChart,
} from './analytics/HubCharts';
import ResearchHub from './analytics/ResearchHub';
import AdvancedModeView from './analytics/AdvancedModeView';
import './Analytics.css';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

export default function Analytics() {
  const { id: routeVideoId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    channelInfo,
    videos = [],
    playlists = [],
    selectedDateRange,
    dateRangeVersion: _dateRangeVersion,
    customStartDate: _customStartDate,
    customEndDate: _customEndDate,
    setDateRange,
    getAnalyticsForRange,
    realtimeDataset,
    tickRealtime,
    showToast,
  } = useStore();

  const activeVideoId = routeVideoId || searchParams.get('video') || null;
  const currentVideo = useMemo(() => {
    if (!activeVideoId) return null;
    return videos.find((v) => v.id === activeVideoId) || videos[0] || null;
  }, [activeVideoId, videos]);

  const isVideoMode = Boolean(currentVideo);
  const analyticsBasePath = isVideoMode
    ? `${CHANNEL_PREFIX}/video/${currentVideo.id}/analytics`
    : `${CHANNEL_PREFIX}/analytics`;

  const hubMode = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('explore') || p.includes('advanced')) return 'explore';
    if (p.includes('hub_reach')) return 'hub_reach';
    if (p.includes('hub_engagement')) return 'hub_engagement';
    if (p.includes('hub_content') || p.includes('tab-content')) return 'hub_content';
    if (p.includes('hub_audience') || p.includes('tab-audience')) return 'hub_audience';
    if (p.includes('hub_revenue') || p.includes('tab-revenue')) return 'hub_revenue';
    if (p.includes('hub_research') || p.includes('tab-trends')) return 'hub_research';
    return 'hub_overview';
  }, [location.pathname]);

  const [heroMetric, setHeroMetric] = useState('views');
  const [contentFormatTab, setContentFormatTab] = useState('all');
  const [retentionMomentTab, setRetentionMomentTab] = useState('intro');
  const [trafficFilterTab, setTrafficFilterTab] = useState('overall');
  const [popularAudTab, setPopularAudTab] = useState('new');
  const [deviceFilterTab, setDeviceFilterTab] = useState('all');
  const [demoGeoTab, setDemoGeoTab] = useState('all');
  const [demoAgeTab, setDemoAgeTab] = useState('all');
  const [demoGenderTab, setDemoGenderTab] = useState('all');
  const [revTab, setRevTab] = useState('all');
  const [topEarnFilter, setTopEarnFilter] = useState('all');
  const [waysFilter, setWaysFilter] = useState('all');
  const [contentEarnTab, setContentEarnTab] = useState('videos');
  const [showMorePeriods, setShowMorePeriods] = useState(false);
  const [aiThumbVote, setAiThumbVote] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof tickRealtime === 'function') tickRealtime();
    }, 6000);
    return () => clearInterval(timer);
  }, [tickRealtime]);

  const rangeKey = selectedDateRange || 'lifetime';
  const snapshot = getAnalyticsForRange(rangeKey, currentVideo?.id || null);

  const agg = snapshot?.aggregated || {};
  const rawDaily = useMemo(() => snapshot?.daily || [], [snapshot?.daily]);

  const buildMetricSeries = useCallback((metricName) => {
    const pickVal = (d) => {
      if (metricName === 'watchTimeHrs') return Number(d.watchTimeHrs ?? d.watchTimeHours ?? d.watchTime ?? 0);
      if (metricName === 'subscribers') return Number(d.subscribersNet ?? d.subscribers ?? d.subs ?? 0);
      if (metricName === 'revenue') return Number(d.revenue ?? d.estimatedRevenue ?? 0);
      if (metricName === 'impressions') return Number(d.impressions ?? Math.round((d.views || 0) * 14));
      if (metricName === 'ctr') return Number(d.ctr ?? 6.4);
      if (metricName === 'unique') return Math.round(Number(d.views ?? 0) * 0.72);
      return Number(d.views ?? 0);
    };
    const avg =
      rawDaily.length > 0
        ? rawDaily.reduce((acc, d) => acc + pickVal(d), 0) / rawDaily.length
        : 0;

    return rawDaily.map((d, idx) => {
      const rawLabel = d.label || d.dateLabel || d.shortDate || d.date || `D${idx + 1}`;
      const label = /^\d{4}-\d{2}-\d{2}/.test(String(rawLabel))
        ? formatPublishDate(rawLabel)
        : rawLabel;
      const rawFull = d.fullDate || d.date || rawLabel;
      const fullDate = /^\d{4}-\d{2}-\d{2}/.test(String(rawFull))
        ? formatPublishDate(rawFull)
        : rawFull;
      return {
        date: d.date || String(rawLabel),
        label,
        fullDate,
        value: pickVal(d),
        typical: Math.round(avg * (0.9 + Math.sin(idx * 0.3) * 0.08)),
      };
    });
  }, [rawDaily]);

  const heroChartData = useMemo(
    () => buildMetricSeries(heroMetric),
    [buildMetricSeries, heroMetric]
  );

  const searchTermItems = useMemo(() => {
    const terms = [
      { label: 'motu patlu ai video kaise banaye', pct: 17.3 },
      { label: 'how to make motu patlu ai video', pct: 4.8 },
      { label: 'ai motu patlu video kaise banaye', pct: 2.5 },
      { label: 'how to create motu patlu ai video', pct: 1.9 },
      { label: 'motu patlu ai video editing', pct: 1.9 },
    ];
    return terms.map((item) => ({
      label: item.label,
      pct: item.pct,
      display: `${item.pct.toFixed(1)}%`,
      viewsDisplay: fmtV(Math.round(((agg.views || 0) * item.pct) / 100)),
    }));
  }, [agg.views]);

  const overallTrafficItems = useMemo(() => {
    if (isVideoMode) {
      const videoSources = [
        { label: 'YouTube search', pct: 81.2 },
        { label: 'Browse features', pct: 8.0 },
        { label: 'Other YouTube features', pct: 6.9 },
        { label: 'Direct or unknown', pct: 1.1 },
        { label: 'External', pct: 0.9 },
        { label: 'Others', pct: 2.0 },
      ];
      return videoSources.map((s) => ({
        label: s.label,
        pct: s.pct,
        display: `${s.pct.toFixed(1)}%`,
        viewsDisplay: fmtV(Math.round(((agg.views || 0) * s.pct) / 100)),
      }));
    }
    const raw = snapshot?.trafficSources || [];
    if (raw.length > 0) {
      return raw.slice(0, 5).map((s) => {
        const pct = Number(s.percentage ?? s.share ?? 0);
        return {
          label: s.source || s.name || s.label || 'Browse Features',
          pct,
          display: `${pct.toFixed(1)}%`,
          viewsDisplay: fmtV(Math.round(((agg.views || 0) * pct) / 100)),
        };
      });
    }
    return [
      { label: 'Browse Features', pct: 43.0, display: '43.0%', viewsDisplay: fmtV((agg.views || 0) * 0.43) },
      { label: 'Suggested Videos', pct: 24.0, display: '24.0%', viewsDisplay: fmtV((agg.views || 0) * 0.24) },
      { label: 'YouTube Search', pct: 18.0, display: '18.0%', viewsDisplay: fmtV((agg.views || 0) * 0.18) },
      { label: 'Direct', pct: 8.0, display: '8.0%', viewsDisplay: fmtV((agg.views || 0) * 0.08) },
      { label: 'External', pct: 7.0, display: '7.0%', viewsDisplay: fmtV((agg.views || 0) * 0.07) },
    ];
  }, [isVideoMode, snapshot?.trafficSources, agg.views]);

  const trafficItems = useMemo(() => {
    if (trafficFilterTab === 'external') {
      return [
        { label: 'WhatsApp', pct: 50.0, display: '50.0%', viewsDisplay: fmtV((agg.views || 0) * 0.0045) },
        { label: 'whatsapp.com', pct: 19.4, display: '19.4%', viewsDisplay: fmtV((agg.views || 0) * 0.0017) },
        { label: 'Google Search', pct: 13.0, display: '13.0%', viewsDisplay: fmtV((agg.views || 0) * 0.0012) },
        { label: 'WhatsApp Business', pct: 6.4, display: '6.4%', viewsDisplay: fmtV((agg.views || 0) * 0.0006) },
        { label: 'instagram.com', pct: 1.5, display: '1.5%', viewsDisplay: fmtV((agg.views || 0) * 0.0001) },
      ];
    }
    if (trafficFilterTab === 'search') {
      return searchTermItems;
    }
    if (trafficFilterTab === 'suggested') {
      const weights = [4.4, 4.2, 4.2, 2.5, 1.9];
      return videos.slice(0, 5).map((v, i) => ({
        label: v.title,
        pct: weights[i] || 1.9,
        display: `${weights[i] || 1.9}%`,
      }));
    }
    if (trafficFilterTab === 'playlists') {
      if (playlists.length > 0) {
        const totalPl = playlists.length;
        return playlists.slice(0, 5).map((p, i) => {
          const pct = Number((Math.max(12, 65 - i * 18) / Math.max(1, totalPl * 0.6)).toFixed(1));
          return { label: p.title, pct: Math.min(100, pct), display: `${Math.min(100, pct)}%` };
        });
      }
      return [{ label: 'All uploads playlist', pct: 100, display: '100.0%' }];
    }
    return overallTrafficItems;
  }, [trafficFilterTab, overallTrafficItems, searchTermItems, videos, playlists, agg.views]);

  const geoItems = useMemo(() => {
    const base = [
      { label: 'United States', pct: 47.3 },
      { label: 'Canada', pct: 18.4 },
      { label: 'Germany', pct: 14.6 },
      { label: 'Italy', pct: 10.9 },
      { label: 'France', pct: 8.8 },
    ];
    const mult =
      demoGeoTab === 'shorts' ? 0.92 : demoGeoTab === 'live' ? 0.88 : demoGeoTab === 'videos' ? 1.0 : 1.0;
    return base.map((item, idx) => {
      const pct = Number(Math.max(0.2, Math.min(99, idx === 0 ? item.pct * mult : item.pct * (2 - mult))).toFixed(1));
      return { label: item.label, pct, display: `${pct.toFixed(1)}%` };
    });
  }, [demoGeoTab]);

  const ageItems = useMemo(() => {
    const base = [
      { label: '13–17 years', pct: 4.6 },
      { label: '18–24 years', pct: 27.6 },
      { label: '25–34 years', pct: 43.3 },
      { label: '35–44 years', pct: 19.1 },
      { label: '45–54 years', pct: 4.4 },
      { label: '55–64 years', pct: 0.6 },
      { label: '65+ years', pct: 0.3 },
    ];
    return base.map((item, idx) => {
      const adj =
        demoAgeTab === 'shorts'
          ? idx <= 1
            ? 1.25
            : 0.92
          : demoAgeTab === 'videos'
          ? idx >= 2 && idx <= 4
            ? 1.04
            : 0.96
          : 1;
      const pct = Number(Math.max(0.1, Math.min(80, item.pct * adj)).toFixed(1));
      return { label: item.label, pct, display: `${pct.toFixed(1)}%` };
    });
  }, [demoAgeTab]);

  const genderItems = useMemo(() => {
    const shift = demoGenderTab === 'shorts' ? 4.2 : demoGenderTab === 'videos' ? 0.4 : 0;
    const female = Number((14.9 + shift).toFixed(1));
    const userSpec = 0.1;
    const male = Number((100 - female - userSpec).toFixed(1));
    return [
      { label: 'Female', pct: female, display: `${female.toFixed(1)}%` },
      { label: 'Male', pct: male, display: `${male.toFixed(1)}%` },
      { label: 'User-specified', pct: userSpec, display: `${userSpec.toFixed(1)}%` },
    ];
  }, [demoGenderTab]);

  const languageItems = useMemo(() => {
    return [
      { label: 'No subtitles/CC', pct: 90.7, display: '90.7%' },
      { label: 'English', pct: 4.8, display: '4.8%' },
      { label: 'English (United States)', pct: 2.5, display: '2.5%' },
      { label: 'German', pct: 1.2, display: '1.2%' },
      { label: 'French', pct: 0.8, display: '0.8%' },
    ];
  }, []);

  const viewerLoyaltySegments = useMemo(
    () => [
      { label: 'New viewers', pct: 81.0, display: '81.0%' },
      { label: 'Casual viewers', pct: 16.0, display: '16.0%' },
      { label: 'Regular viewers', pct: 3.1, display: '3.1%' },
    ],
    []
  );

  const rtTotal48h = useMemo(() => {
    if (isVideoMode) {
      if (currentVideo?.realtimeViews48h !== undefined && currentVideo?.realtimeViews48h !== null) {
        return Number(currentVideo.realtimeViews48h);
      }
      return currentVideo?.views ? Math.round(Number(currentVideo.views) * 0.0055) : 0;
    }
    if (channelInfo?.realtimeViews48h !== undefined && channelInfo?.realtimeViews48h !== null) {
      return Number(channelInfo.realtimeViews48h);
    }
    return 189;
  }, [isVideoMode, currentVideo?.realtimeViews48h, currentVideo?.views, channelInfo?.realtimeViews48h]);

  const realtimeScaledBars = useMemo(() => {
    if (rtTotal48h <= 0) {
      return Array.from({ length: 48 }, () => ({ views: 0 }));
    }
    const rawBars = realtimeDataset?.last48Hours || realtimeDataset?.hourlyBars || [];
    if (rawBars.length === 0) {
      return Array.from({ length: 48 }, (_, idx) => ({
        views: Math.max(0, Math.round((rtTotal48h / 48) * (0.7 + ((idx * 7) % 7) * 0.1))),
      }));
    }
    const rawTotal =
      rawBars.reduce((s, b) => s + (typeof b === 'object' ? Number(b.views || 0) : Number(b || 0)), 0) || 1;
    const factor = rtTotal48h / rawTotal;
    return rawBars.map((b) => {
      const val = typeof b === 'object' ? Number(b.views || 0) : Number(b || 0);
      return {
        ...(typeof b === 'object' ? b : {}),
        views: Math.max(0, Math.round(val * factor)),
      };
    });
  }, [realtimeDataset, rtTotal48h]);

  const rtTopVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .slice(0, 3)
      .map((v) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail || '/thumbnails/latest_video.png',
        views48h:
          v.realtimeViews48h !== undefined &&
          v.realtimeViews48h !== null &&
          Number(v.realtimeViews48h) > 0
            ? Number(v.realtimeViews48h)
            : Number(v.views || 0),
      }));
  }, [videos]);

  const parseRupeeNumber = (val, fallback = 0) => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (val === null || val === undefined || val === '') return fallback;
    const parsed = Number(String(val).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const parseDurationToSeconds = (durStr) => {
    if (typeof durStr === 'number' && Number.isFinite(durStr)) return Math.max(0, durStr);
    if (!durStr) return 0;
    const parts = String(durStr)
      .trim()
      .split(':')
      .map((n) => Number(n));
    if (parts.some((n) => !Number.isFinite(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };

  const computeAvgPctViewed = (avgDurStr, totalDurStr) => {
    const avgSec = parseDurationToSeconds(avgDurStr);
    const totalSec = parseDurationToSeconds(totalDurStr);
    if (avgSec > 0 && totalSec > 0) {
      const pct = Math.min(99, Math.max(1, Math.round((avgSec / totalSec) * 100)));
      return `${pct}%`;
    }
    return '14%';
  };

  const topEarningVideos = useMemo(() => {
    return [...videos]
      .map((v) => ({
        ...v,
        revNum: getVideoRevenueValue(v),
      }))
      .sort((a, b) => b.revNum - a.revNum);
  }, [videos]);

  const navigateHub = (targetHub) => {
    navigate(`${analyticsBasePath}/${targetHub}`);
  };

  const handleSelectDateRange = (key) => {
    setShowMorePeriods(false);
    if (typeof setDateRange === 'function') setDateRange(key);
  };

  const renderDatePills = () => {
    const primaryPresets = isVideoMode
      ? [
          { key: 'last7', label: '7 days' },
          { key: 'last28', label: '28 days' },
          { key: 'lifetime', label: 'Since uploaded' },
        ]
      : [
          { key: 'last7', label: '7 days' },
          { key: 'last28', label: '28 days' },
          { key: 'last90', label: '90 days' },
        ];

    const isMoreActive =
      rangeKey === 'first24' ||
      rangeKey === 'last365' ||
      rangeKey === '365' ||
      rangeKey === '2026' ||
      rangeKey === '2025' ||
      rangeKey === 'august' ||
      rangeKey === 'july' ||
      rangeKey === 'june' ||
      (!isVideoMode && rangeKey === 'lifetime');

    const moreBtnLabel =
      rangeKey === 'first24'
        ? 'First 24 hours'
        : rangeKey === 'last365' || rangeKey === '365'
        ? '365 days'
        : !isVideoMode && rangeKey === 'lifetime'
        ? 'Lifetime'
        : rangeKey === '2026' || rangeKey === '2025'
        ? rangeKey
        : rangeKey === 'august' || rangeKey === 'july' || rangeKey === 'june'
        ? rangeKey[0].toUpperCase() + rangeKey.slice(1)
        : 'More';

    return (
      <div className="an26-date-controls">
        {primaryPresets.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`an26-pill-filter ${rangeKey === p.key ? 'active' : ''}`}
            onClick={() => handleSelectDateRange(p.key)}
          >
            {p.label}
          </button>
        ))}

        <div className="an26-more-wrap">
          <button
            type="button"
            className={`an26-pill-filter ${isMoreActive ? 'active' : ''}`}
            onClick={() => setShowMorePeriods((m) => !m)}
          >
            <span>{moreBtnLabel}</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>

          {showMorePeriods && (
            <div className="an26-more-menu">
              {isVideoMode && (
                <button type="button" onClick={() => handleSelectDateRange('first24')}>
                  First 24 hours
                </button>
              )}
              <button type="button" onClick={() => handleSelectDateRange('last365')}>
                Last 365 days
              </button>
              <button type="button" onClick={() => handleSelectDateRange('lifetime')}>
                {isVideoMode ? 'Since uploaded (lifetime)' : 'Lifetime'}
              </button>
              <button type="button" onClick={() => handleSelectDateRange('2026')}>
                2026
              </button>
              <button type="button" onClick={() => handleSelectDateRange('2025')}>
                2025
              </button>
              <button type="button" onClick={() => handleSelectDateRange('august')}>
                August
              </button>
              <button type="button" onClick={() => handleSelectDateRange('july')}>
                July
              </button>
              <button type="button" onClick={() => handleSelectDateRange('june')}>
                June
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMorePeriods(false);
                  navigateHub('explore');
                }}
              >
                Custom in Advanced mode
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Advanced Mode
  if (hubMode === 'explore') {
    return (
      <div className="an26-page">
        <AdvancedModeView
          channelInfo={channelInfo}
          videos={videos}
          daily={rawDaily}
          aggregated={agg}
          trafficSources={snapshot?.trafficSources}
          audience={snapshot?.audience}
          datePreset={rangeKey}
          setDatePreset={handleSelectDateRange}
          dateRangeLabel={snapshot?.dateRangeLabel}
          videoId={currentVideo?.id || null}
          onClose={() => navigateHub('hub_overview')}
        />
      </div>
    );
  }

  // Channel Research Sub-Hub
  if (hubMode === 'hub_research') {
    return (
      <div className="an26-page">
        <ResearchHub
          channelInfo={channelInfo}
          videos={videos}
          channelPrefix={CHANNEL_PREFIX}
          onBack={() => navigateHub('hub_overview')}
        />
      </div>
    );
  }

  // Sub-Hub: Content (Channel mode) — 1+3 Sparkline Grid + Retention Intros + Tapered Funnel + Traffic Bars
  if (hubMode === 'hub_content') {
    const scopedVideos = videos.filter((v) => {
      const fmt = String(v.format || v.type || '').toLowerCase();
      if (contentFormatTab === 'shorts') return fmt === 'short' || Boolean(v.isShort);
      if (contentFormatTab === 'live') return fmt === 'live';
      if (contentFormatTab === 'videos') return fmt !== 'short' && fmt !== 'live' && !v.isShort;
      if (contentFormatTab === 'posts' || contentFormatTab === 'podcasts') return false;
      if (contentFormatTab === 'playlists') return true;
      return true;
    });
    const allVideosViews = videos.reduce((acc, v) => acc + Number(v.views || 0), 0);
    const scopedVideosViews = scopedVideos.reduce((acc, v) => acc + Number(v.views || 0), 0);
    const formatScale =
      contentFormatTab === 'all'
        ? 1
        : contentFormatTab === 'playlists'
        ? playlists.length > 0
          ? 0.28
          : 0
        : allVideosViews > 0
        ? scopedVideosViews / allVideosViews
        : 0;

    const scopedViews = Math.round((agg.views || 0) * formatScale);
    const impTotal = Math.round((agg.impressions || Math.round((agg.views || 0) * 14)) * formatScale);
    const scaleSeries = (series) =>
      formatScale === 1
        ? series
        : series.map((pt) => ({ ...pt, value: Math.round((pt.value || 0) * formatScale) }));

    const impSeries = scaleSeries(buildMetricSeries('impressions'));
    const ctrSeries = formatScale === 0 ? [] : buildMetricSeries('ctr');
    const wtSeries = scaleSeries(buildMetricSeries('watchTimeHrs'));
    const viewsSeries = scaleSeries(buildMetricSeries('views'));

    const retentionRanked = [...scopedVideos]
      .map((v, i) => ({
        ...v,
        retPct:
          retentionMomentTab === 'spikes'
            ? Math.min(78, 52 + ((i * 5) % 19))
            : retentionMomentTab === 'dips'
            ? Math.max(24, 42 - ((i * 3) % 15))
            : Math.max(41, 54 - i),
      }))
      .sort((a, b) => b.retPct - a.retPct)
      .slice(0, 6);

    const hasContentData = formatScale > 0 && (scopedVideos.length > 0 || contentFormatTab === 'playlists');
    const displayAvgDur = hasContentData
      ? scopedVideos[0]?.avgViewDuration || scopedVideos[0]?.avgDuration || '4:01'
      : '0:00';
    const targetAvgDurSec = hasContentData ? parseDurationToSeconds(displayAvgDur) : 0;
    const wtMean =
      wtSeries.reduce((acc, pt) => acc + Math.max(0, Number(pt.value || 0)), 0) /
        Math.max(1, wtSeries.length) || 1;
    const avgDurSeries = wtSeries.map((pt) => ({
      ...pt,
      value: hasContentData
        ? Math.max(15, Math.round(targetAvgDurSec * (0.88 + 0.14 * (Number(pt.value || 0) / wtMean))))
        : 0,
    }));

    return (
      <div className="an26-page">
        <div className="an26-subhub-header">
          <button type="button" className="an26-back-btn" onClick={() => navigateHub('hub_overview')}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="yt-display-font">Content</span>
          </button>
          <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
            Advanced mode
          </button>
        </div>

        <div className="an26-pill-tabs" style={{ marginBottom: 18 }}>
          {['all', 'videos', 'shorts', 'live', 'posts', 'playlists', 'podcasts'].map((t) => (
            <button
              key={t}
              type="button"
              className={`an26-pill-filter ${contentFormatTab === t ? 'active' : ''}`}
              onClick={() => setContentFormatTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="an26-section-toolbar">
          <h2 className="an26-section-h2">Key metrics</h2>
          {renderDatePills()}
        </div>

        {/* 1 + 3 Sparkline Grid */}
        <div className="an26-split-60-40">
          <div className="an26-card">
            <h3 className="an26-card-t-sm">Views</h3>
            <div className="an26-hero-kpi-inline">
              <strong className="an26-kpi-big-num yt-display-font">
                {contentFormatTab === 'all' ? agg.viewsFormatted || fmtV(agg.views || 0) : fmtV(scopedViews)}
              </strong>
              {hasContentData && <StudioUpBadge />}
              {hasContentData && (
                <span className="an26-delta-muted">{fmtV(Math.round(scopedViews * 0.45))}</span>
              )}
            </div>
            <StudioLineMetricChart
              data={viewsSeries}
              metricKey="views"
              height={205}
              showUploadMarkers={hasContentData}
              isLifetime={!isVideoMode && rangeKey === 'lifetime'}
            />
          </div>

          <div className="an26-stack-3">
            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Thumbnail impressions</h4>
                <div className="an26-spark-num-row">
                  <strong className="yt-display-font">{fmtV(impTotal)}</strong>
                  {hasContentData && <StudioDownBadge />}
                </div>
              </div>
              <MiniSparklineChart data={impSeries} metricKey="views" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Thumbnail click-through rate</h4>
                <div className="an26-spark-num-row">
                  <strong className="yt-display-font">
                    {hasContentData ? formatPctValue(agg.ctr, '6.6%') : '0.0%'}
                  </strong>
                </div>
              </div>
              <MiniSparklineChart data={ctrSeries} metricKey="ctr" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Avg. view duration</h4>
                <div className="an26-spark-num-row">
                  <strong className="yt-display-font">{displayAvgDur}</strong>
                </div>
              </div>
              <MiniSparklineChart data={avgDurSeries} metricKey="duration" />
            </div>
          </div>
        </div>

        <div className="an26-bento-3" style={{ marginTop: 18 }}>
          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Key moments for audience retention</h3>
                <span className="an26-card-sub">Latest videos · Last 365 days</span>
              </div>
            </div>
            <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
              {[
                { key: 'intro', label: 'Intro' },
                { key: 'spikes', label: 'Spikes' },
                { key: 'dips', label: 'Dips' },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`an26-pill-filter ${retentionMomentTab === m.key ? 'active' : ''}`}
                  onClick={() => setRetentionMomentTab(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="an26-card-subhead-row">
              <strong>
                {retentionMomentTab === 'intro'
                  ? 'Above typical intros'
                  : retentionMomentTab === 'spikes'
                  ? 'Top viewer replays'
                  : 'Key viewer drop-offs'}
              </strong>
              <span>
                {retentionMomentTab === 'intro'
                  ? 'Still watching at 00:30'
                  : retentionMomentTab === 'spikes'
                  ? 'Peak moment %'
                  : 'Avg segment retained'}
              </span>
            </div>
            {retentionRanked.length === 0 ? (
              <p className="an26-card-sub" style={{ padding: '12px 0' }}>
                No published content for this format in the selected period.
              </p>
            ) : (
              <div className="an26-top-videos-list">
                {retentionRanked.map((v) => (
                  <div
                    key={v.id}
                    className="an26-top-video-row"
                    onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_engagement`)}
                  >
                    <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                    <div className="an26-tv-meta">
                      <p>{v.title}</p>
                    </div>
                    <span className="an26-tv-views">{v.retPct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>How impressions lead to watch time</h3>
                <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <ReachFunnelCard
              impressions={impTotal}
              ctr={hasContentData ? formatPctValue(agg.ctr, '6.3%') : '0.0%'}
              views={scopedViews}
              avgDuration={displayAvgDur}
              watchTimeHrs={Math.round((agg.watchTimeHrs || 0) * formatScale)}
            />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>How viewers find your videos</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <div className="an26-pill-tabs" style={{ marginBottom: 14 }}>
              {[
                { key: 'overall', label: 'Overall' },
                { key: 'external', label: 'External' },
                { key: 'search', label: 'YouTube Search' },
                { key: 'suggested', label: 'Suggested videos' },
                { key: 'playlists', label: 'Playlists' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`an26-pill-filter ${trafficFilterTab === t.key ? 'active' : ''}`}
                  onClick={() => setTrafficFilterTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <StudioProgressList items={hasContentData ? trafficItems : []} />
          </div>
        </div>

        <div className="an26-third-card an26-card">
          <div className="an26-card-head">
            <div>
              <h3>
                {contentFormatTab === 'playlists'
                  ? 'Top playlists'
                  : contentFormatTab === 'shorts'
                  ? 'Top Shorts'
                  : 'Top videos'}
              </h3>
              <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
            </div>
          </div>
          {contentFormatTab === 'playlists' ? (
            <div className="an26-top-videos-list">
              {(playlists || []).slice(0, 5).map((p) => (
                <div key={p.id} className="an26-top-video-row">
                  <img src={p.thumbnail || '/thumbnails/latest_video.png'} alt={p.title} />
                  <div className="an26-tv-meta">
                    <p>{p.title}</p>
                  </div>
                  <span className="an26-tv-views">{p.videoCount || 0} videos</span>
                </div>
              ))}
            </div>
          ) : scopedVideos.length === 0 ? (
            <p className="an26-card-sub" style={{ padding: '12px 0' }}>
              No published content for this format in the selected period.
            </p>
          ) : (
            <div className="an26-top-videos-list">
              {scopedVideos.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  className="an26-top-video-row"
                  onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_overview`)}
                >
                  <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                  <div className="an26-tv-meta">
                    <p>{v.title}</p>
                  </div>
                  <strong className="an26-tv-views">{v.viewsFormatted || fmtV(v.views)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sub-Hub: Reach (Video mode)
  if (hubMode === 'hub_reach') {
    const impTotal = agg.impressions || Math.round((agg.views || 1000) * 14.2);
    const impSeries = buildMetricSeries('impressions');
    const viewsSeries = buildMetricSeries('views');
    const ctrSeries = buildMetricSeries('ctr');
    const uniqSeries = buildMetricSeries('unique');
    const matchingPlaylists = playlists.filter(
      (p) => Array.isArray(p.videoIds) && p.videoIds.includes(currentVideo?.id)
    );
    const suggestingVideos = [
      {
        id: currentVideo?.id || 'VID001',
        title: currentVideo?.title || 'This video',
        thumbnail: currentVideo?.thumbnail || '/thumbnails/latest_video.png',
        suggestShare: '4.4%',
      },
      {
        id: 'VID002',
        title: 'Why Is There Still Another Woman in His Life?...',
        thumbnail: videos[1]?.thumbnail || '/thumbnails/2.webp',
        suggestShare: '4.2%',
      },
      {
        id: 'VID003',
        title: 'Signs He Truly Loves You Deeply...',
        thumbnail: videos[2]?.thumbnail || '/thumbnails/3.webp',
        suggestShare: '4.2%',
      },
      {
        id: 'VID004',
        title: 'Relationship Truths You Need To Know...',
        thumbnail: videos[3]?.thumbnail || '/thumbnails/4.webp',
        suggestShare: '2.5%',
      },
      {
        id: 'VID005',
        title: 'Understanding Men in Difficult Relationships...',
        thumbnail: videos[4]?.thumbnail || '/thumbnails/5.webp',
        suggestShare: '1.9%',
      },
    ];

    return (
      <div className="an26-page">
        <div className="an26-subhub-header">
          <button type="button" className="an26-back-btn" onClick={() => navigateHub('hub_overview')}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="yt-display-font">Reach</span>
          </button>
          <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
            Advanced mode
          </button>
        </div>

        <div className="an26-section-toolbar">
          <h2 className="an26-section-h2">Key metrics</h2>
          {renderDatePills()}
        </div>

        {/* 1 + 3 Sparkline Grid matching 20.20.21 */}
        <div className="an26-split-60-40">
          <div className="an26-card">
            <h3 className="an26-card-t-sm">Thumbnail impressions</h3>
            <strong className="an26-kpi-big-num yt-display-font">{fmtV(impTotal)}</strong>
            <StudioLineMetricChart data={impSeries} metricKey="views" height={200} />
          </div>

          <div className="an26-stack-3">
            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Views</h4>
                <strong className="yt-display-font">{agg.viewsFormatted || fmtV(agg.views || 0)}</strong>
              </div>
              <MiniSparklineChart data={viewsSeries} metricKey="views" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Thumbnail click-through rate</h4>
                <strong className="yt-display-font">
                  {formatPctValue(agg.ctr ?? currentVideo?.ctr, '6.2%')}
                </strong>
              </div>
              <MiniSparklineChart data={ctrSeries} metricKey="ctr" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Unique viewers</h4>
                <strong className="yt-display-font">{fmtV(Math.round((agg.views || 0) * 0.72))}</strong>
              </div>
              <MiniSparklineChart data={uniqSeries} metricKey="views" showProcessingZone />
            </div>
          </div>
        </div>

        <div className="an26-bento-3" style={{ marginTop: 18 }}>
          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>How impressions lead to watch time</h3>
                <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <ReachFunnelCard
              impressions={impTotal}
              ctr={formatPctValue(agg.ctr ?? currentVideo?.ctr, '6.2%')}
              views={agg.views || 0}
              avgDuration={currentVideo?.avgViewDuration || currentVideo?.avgDuration || '4:15'}
              watchTimeHrs={agg.watchTimeHrs || 0}
            />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>How viewers found this video</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <SegmentedStatList
              segments={overallTrafficItems.slice(0, 5).map((t) => ({
                label: t.label,
                pct: t.pct,
                display: t.display,
              }))}
            />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>External sites or apps</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <div className="an26-card-metric-row">
              <span>Proportion of your total traffic</span>
              <strong>0.9%</strong>
            </div>
            <StudioProgressList
              items={[
                { label: 'WhatsApp', pct: 50.0, display: '50.0%' },
                { label: 'whatsapp.com', pct: 19.4, display: '19.4%' },
                { label: 'Google Search', pct: 13.0, display: '13.0%' },
                { label: 'WhatsApp Business', pct: 6.4, display: '6.4%' },
                { label: 'instagram.com', pct: 1.5, display: '1.5%' },
              ]}
            />
          </div>
        </div>

        <div className="an26-bento-3" style={{ marginTop: 18 }}>
          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>YouTube search terms</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <div className="an26-card-metric-row">
              <span>Proportion of your total traffic</span>
              <strong>81.2%</strong>
            </div>
            <StudioProgressList items={searchTermItems} />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Playlists featuring this video</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <div className="an26-card-metric-row">
              <span>Proportion of your total traffic</span>
              <strong>0.1%</strong>
            </div>
            {matchingPlaylists.length === 0 ? (
              <p className="an26-card-sub" style={{ marginTop: 10 }}>
                Not enough traffic data to show this report
              </p>
            ) : (
              <StudioProgressList
                items={matchingPlaylists.slice(0, 4).map((p, idx) => ({
                  label: p.title,
                  pct: Math.max(10, 100 - idx * 30),
                  display: `${p.videoCount || 1} videos`,
                }))}
              />
            )}
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Content suggesting this video</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <div className="an26-card-metric-row">
              <span>Proportion of your total traffic</span>
              <strong>0.8%</strong>
            </div>
            <div className="an26-top-videos-list">
              {suggestingVideos.map((v) => (
                <div
                  key={v.id}
                  className="an26-top-video-row"
                  onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_overview`)}
                >
                  <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                  <div className="an26-tv-meta">
                    <p>{v.title}</p>
                  </div>
                  <span className="an26-tv-views">{v.suggestShare}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="an26-third-card an26-card">
          <div className="an26-card-head">
            <div>
              <h3>Bell notifications sent</h3>
            </div>
          </div>
          <NotificationFunnelCard
            pushSent={Math.round((channelInfo?.subscribers || 53884) * 0.07)}
            ctr="0.8%"
            viewsFromNotifs={Math.max(1, Math.round((agg.views || 0) * 0.001))}
          />
        </div>
      </div>
    );
  }

  // Sub-Hub: Engagement (Video mode) — 1+3 Sparkline Grid + Retention Curve + Likes ratio + Comments + Hype
  if (hubMode === 'hub_engagement') {
    const wtSeries = buildMetricSeries('watchTimeHrs');
    const avgDurStr = currentVideo?.avgViewDuration || currentVideo?.avgDuration || '4:15';
    const targetAvgDurSec = parseDurationToSeconds(avgDurStr);
    const wtMean =
      wtSeries.reduce((acc, d) => acc + Math.max(0, Number(d.value || 0)), 0) /
        Math.max(1, wtSeries.length) || 1;
    const avgDurSeries = wtSeries.map((d) => ({
      ...d,
      value: Math.max(15, Math.round(targetAvgDurSec * (0.86 + 0.16 * (Number(d.value || 0) / wtMean)))),
    }));
    const sharesTotal = Number(
      currentVideo?.shares ?? Math.max(4, Math.round((agg.views || 100) * 0.008))
    );
    const likesTotal = Number(currentVideo?.likes ?? 41);
    const dailyShareBase = sharesTotal / Math.max(4, wtSeries.length * 0.5);
    const dailyLikeBase = likesTotal / Math.max(4, wtSeries.length * 0.5);
    const sharesSeries = wtSeries.map((d) => ({
      ...d,
      value: Math.max(0, Math.round(dailyShareBase * Math.max(0.15, Number(d.value || 0) / wtMean))),
    }));
    const likesSeries = wtSeries.map((d) => ({
      ...d,
      value: Math.max(0, Math.round(dailyLikeBase * Math.max(0.15, Number(d.value || 0) / wtMean))),
    }));
    const avgPctViewedStr = computeAvgPctViewed(avgDurStr, currentVideo?.duration);
    const videoCommentsCount =
      currentVideo?.comments ?? currentVideo?.commentsCount ?? currentVideo?.commentCount ?? 0;

    return (
      <div className="an26-page">
        <div className="an26-subhub-header">
          <button type="button" className="an26-back-btn" onClick={() => navigateHub('hub_overview')}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="yt-display-font">Engagement</span>
          </button>
          <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
            Advanced mode
          </button>
        </div>

        <div className="an26-section-toolbar">
          <h2 className="an26-section-h2">Key metrics</h2>
          {renderDatePills()}
        </div>

        <div className="an26-split-60-40">
          <div className="an26-card">
            <h3 className="an26-card-t-sm">Watch time (hours)</h3>
            <strong className="an26-kpi-big-num yt-display-font">
              {formatHoursValue(agg.watchTimeHrs || 0)}
            </strong>
            <StudioLineMetricChart
              data={wtSeries}
              metricKey="watchTimeHrs"
              height={200}
              showTypical
            />
          </div>

          <div className="an26-stack-3">
            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Average view duration</h4>
                <strong className="yt-display-font">{avgDurStr}</strong>
              </div>
              <MiniSparklineChart data={avgDurSeries} metricKey="duration" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Shares</h4>
                <strong className="yt-display-font">{formatCountComma(sharesTotal)}</strong>
              </div>
              <MiniSparklineChart data={sharesSeries} metricKey="views" />
            </div>

            <div className="an26-card an26-spark-card">
              <div>
                <h4 className="an26-spark-title">Likes</h4>
                <strong className="yt-display-font">
                  {currentVideo?.likesFormatted || fmtV(likesTotal)}
                </strong>
              </div>
              <MiniSparklineChart data={likesSeries} metricKey="views" />
            </div>
          </div>
        </div>

        <div className="an26-bento-2" style={{ marginTop: 18 }}>
          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Key moments for audience retention</h3>
                <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <RetentionCurveChart
              duration={currentVideo?.duration || '15:14'}
              showTabs
              avgDuration={avgDurStr}
              avgPctViewed={avgPctViewedStr}
              introRetainedPct="50.0%"
            />
          </div>

          <div className="an26-stack-2">
            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Likes (vs. dislikes)</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <div className="an26-hero-kpi-inline">
                <strong className="an26-kpi-big-num yt-display-font">96.5%</strong>
                <span className="an26-delta-muted" style={{ color: '#606060' }}>Channel avg: 97.7%</span>
              </div>
            </div>

            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Comments</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <strong className="an26-kpi-big-num yt-display-font">{videoCommentsCount}</strong>
            </div>

            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Hype</h3>
                  <span className="an26-card-sub">First 7 days</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 28, marginTop: 6 }}>
                <div>
                  <strong className="an26-kpi-big-num yt-display-font">
                    {fmtV(Math.round((agg.views || 0) * 0.1))}
                  </strong>
                  <div className="an26-card-sub">Hype points</div>
                </div>
                <div>
                  <strong className="an26-kpi-big-num yt-display-font">
                    {Math.max(1, Math.round((agg.views || 0) * 0.0016)).toLocaleString('en-IN')}
                  </strong>
                  <div className="an26-card-sub">Hypes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sub-Hub: Audience (Channel & Video)
  if (hubMode === 'hub_audience') {
    const uniqSeries = buildMetricSeries('unique');
    const subSeries = buildMetricSeries('subscribers');
    const monthlyAudience = Math.round((agg.views || 0) * 0.72);
    const subWatchShare = isVideoMode ? 66.2 : 9.4;
    const notSubWatchShare = Number((100 - subWatchShare).toFixed(1));

    const deviceSegments = [
      { label: 'Mobile phone', pct: 86.4, display: '86.4%' },
      { label: 'Computer', pct: 9.2, display: '9.2%' },
      { label: 'Others', pct: 4.4, display: '4.4%' },
    ];

    const popularAudVideos = videos.slice(0, 5).map((v) => ({
      ...v,
      segViews: v.viewsFormatted || fmtV(v.views || 0),
    }));

    const otherChannelsList = [
      {
        name: 'Invisible Gyan',
        subs: '477.0K subscribers',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
      {
        name: 'Rahul Upmanyu',
        subs: '318.0K subscribers',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      },
      {
        name: 'Shivani Raaz Shukla 2.0',
        subs: '117.0K subscribers',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      },
      {
        name: 'THE RADIO TV',
        subs: '366.0K subscribers',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      },
      {
        name: 'Saddam Kassim',
        subs: '1.0M subscribers',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      },
    ];

    return (
      <div className="an26-page">
        <div className="an26-subhub-header">
          <button type="button" className="an26-back-btn" onClick={() => navigateHub('hub_overview')}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="yt-display-font">Audience</span>
          </button>
          <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
            Advanced mode
          </button>
        </div>

        <div className="an26-section-toolbar">
          <h2 className="an26-section-h2">Key metrics</h2>
          {renderDatePills()}
        </div>

        <div className="an26-bento-2" style={{ marginBottom: 22 }}>
          <div className="an26-card">
            <div className="an26-card-head-ic">
              <div>
                <h3>{isVideoMode ? 'Unique viewers' : 'Monthly audience'}</h3>
                <strong className="an26-kpi-big-num yt-display-font">{fmtV(monthlyAudience)}</strong>
              </div>
              {!isVideoMode && (
                <span className="material-symbols-outlined an26-clock-ic" title="Last few days processing">
                  schedule
                </span>
              )}
            </div>
            <StudioLineMetricChart
              data={uniqSeries}
              metricKey="views"
              height={185}
              showProcessingZone
              showUploadMarkers={!isVideoMode}
              isLifetime={!isVideoMode && rangeKey === 'lifetime'}
            />
          </div>

          <div className="an26-card">
            <h3>Subscribers</h3>
            <div className="an26-hero-kpi-inline" style={{ marginBottom: 4 }}>
              <strong className="an26-kpi-big-num yt-display-font">
                {agg.subscribersNetFormatted || '+0'}
              </strong>
              {!isVideoMode && (
                <>
                  <StudioUpBadge />
                  <span className="an26-delta-muted">
                    {fmtV(Math.round(Math.abs(agg.subscribersNet || 0) * 0.4))}
                  </span>
                </>
              )}
            </div>
            <StudioLineMetricChart
              data={subSeries}
              metricKey="subscribers"
              height={185}
              showUploadMarkers={!isVideoMode}
              isLifetime={!isVideoMode && rangeKey === 'lifetime'}
            />
          </div>
        </div>

        <h2 className="an26-section-h2" style={{ marginBottom: 14 }}>Watch behavior</h2>

        {isVideoMode ? (
          <>
            <div className="an26-bento-3" style={{ marginBottom: 18 }}>
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Audience by watch behavior</h3>
                    <span className="an26-card-sub">Unique viewers · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <SegmentedStatList segments={viewerLoyaltySegments} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top subtitle/CC languages</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <StudioProgressList items={languageItems.slice(0, 4)} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Device type</h3>
                    <span className="an26-card-sub">Watch time (hours) · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <SegmentedStatList segments={deviceSegments} />
              </div>
            </div>

            <div className="an26-third-card an26-card" style={{ marginTop: 0, marginBottom: 22 }}>
              <div className="an26-card-head">
                <div>
                  <h3>Watch time from subscribers</h3>
                  <span className="an26-card-sub">Watch time (hours) · {snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <div className="an26-wt-sub-bar-track">
                <div className="an26-wt-sub-bar-fill" style={{ width: `${subWatchShare}%` }} />
              </div>
              <div className="an26-wt-sub-split">
                <div>
                  <strong className="yt-display-font">{subWatchShare}%</strong>
                  <span>Subscribed</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="yt-display-font">{notSubWatchShare}%</strong>
                  <span>Not subscribed</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="an26-bento-3" style={{ marginBottom: 18 }}>
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Audience by watch behavior</h3>
                    <span className="an26-card-sub">Monthly audience</span>
                  </div>
                </div>
                <SegmentedStatList segments={viewerLoyaltySegments} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Popular with different audiences</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
                  {[
                    { key: 'new', label: 'New' },
                    { key: 'casual', label: 'Casual' },
                    { key: 'regular', label: 'Regular' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`an26-pill-filter ${popularAudTab === tab.key ? 'active' : ''}`}
                      onClick={() => setPopularAudTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="an26-top-videos-list">
                  {popularAudVideos.map((v) => (
                    <div
                      key={v.id}
                      className="an26-top-video-row"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_audience`)}
                    >
                      <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                      <div className="an26-tv-meta">
                        <p>{v.title}</p>
                      </div>
                      <span className="an26-tv-views">{v.segViews}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Videos growing your audience</h3>
                    <span className="an26-card-sub">New viewers who returned · Last 90 days</span>
                  </div>
                </div>
                <div className="an26-top-videos-list">
                  {videos.slice(0, 6).map((v, idx) => (
                    <div
                      key={v.id}
                      className="an26-top-video-row"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_audience`)}
                    >
                      <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                      <div className="an26-tv-meta">
                        <p>{v.title}</p>
                      </div>
                      <span className="an26-grow-badge">
                        <span>{idx === 0 ? 'Very high' : idx < 4 ? 'Moderate' : 'Low'}</span>
                        {idx < 4 ? <StudioCheckBadge size={16} /> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="an26-bento-3" style={{ marginBottom: 18 }}>
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top subtitle/CC languages</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <StudioProgressList items={languageItems} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>When your viewers are on YouTube</h3>
                    <span className="an26-card-sub">
                      Your local time ({channelInfo?.country === 'India' ? 'GMT+05:30' : 'GMT-05:00'}) · Last 28 days
                    </span>
                  </div>
                </div>
                <AudienceHeatmapGrid matrix={snapshot?.audience?.viewerHeatmap} />
                <p className="an26-card-sub" style={{ marginTop: 12 }}>
                  Publish time is not known to directly affect the long-term performance of a video.{' '}
                  <span className="an26-link-blue">Learn more</span>
                </p>
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Subscribers with notifications</h3>
                  </div>
                </div>
                <div className="an26-notif-list">
                  <div className="an26-notif-row">
                    <div className="an26-notif-left">
                      <span className="material-symbols-outlined">notifications_active</span>
                      <div>
                        <div>Turned on &ldquo;All notifications&rdquo; for your channel</div>
                        <div className="an26-card-sub">Typical on YouTube: 10% - 30%</div>
                      </div>
                    </div>
                    <span className="an26-notif-val">
                      7.0% ({fmtV(Math.round((channelInfo?.subscribers || 53884) * 0.07))})
                    </span>
                  </div>
                  <div className="an26-notif-row">
                    <div className="an26-notif-left">
                      <span className="material-symbols-outlined">phonelink_ring</span>
                      <div>
                        <div>Turned on &ldquo;All notifications&rdquo; and YouTube notifications</div>
                        <div className="an26-card-sub">Typical on YouTube: 5% - 20%</div>
                      </div>
                    </div>
                    <span className="an26-notif-val">
                      3.9% ({fmtV(Math.round((channelInfo?.subscribers || 53884) * 0.039))})
                    </span>
                  </div>
                </div>
                <p className="an26-card-sub">
                  Notifications won&apos;t reach subscribers who turned off notifications in the YouTube app or signed out.{' '}
                  <span className="an26-link-blue">Learn more</span>
                </p>
              </div>
            </div>

            <div className="an26-bento-3" style={{ marginBottom: 22 }}>
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Device type</h3>
                    <span className="an26-card-sub">Watch time (hours) · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
                  {['all', 'videos', 'shorts', 'live'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`an26-pill-filter ${deviceFilterTab === t ? 'active' : ''}`}
                      onClick={() => setDeviceFilterTab(t)}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <SegmentedStatList segments={deviceSegments} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Watch time from subscribers</h3>
                    <span className="an26-card-sub">Watch time (hours) · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div className="an26-wt-sub-bar-track">
                  <div className="an26-wt-sub-bar-fill" style={{ width: `${subWatchShare}%` }} />
                </div>
                <div className="an26-wt-sub-split">
                  <div>
                    <strong className="yt-display-font">{subWatchShare}%</strong>
                    <span>Subscribed</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong className="yt-display-font">{notSubWatchShare}%</strong>
                    <span>Not subscribed</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <h2 className="an26-section-h2" style={{ marginBottom: 14 }}>Demographics</h2>
        <div className="an26-bento-3" style={{ marginBottom: 22 }}>
          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Top geographies</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            {!isVideoMode && (
              <div className="an26-pill-tabs" style={{ marginBottom: 14 }}>
                {['all', 'videos', 'shorts', 'live'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`an26-pill-filter ${demoGeoTab === t ? 'active' : ''}`}
                    onClick={() => setDemoGeoTab(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <StudioProgressList items={isVideoMode ? geoItems.slice(0, 1) : geoItems} />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Age</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            {!isVideoMode && (
              <div className="an26-pill-tabs" style={{ marginBottom: 14 }}>
                {['all', 'videos', 'shorts'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`an26-pill-filter ${demoAgeTab === t ? 'active' : ''}`}
                    onClick={() => setDemoAgeTab(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <StudioProgressList items={ageItems} />
          </div>

          <div className="an26-card">
            <div className="an26-card-head">
              <div>
                <h3>Gender</h3>
                <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            {!isVideoMode && (
              <div className="an26-pill-tabs" style={{ marginBottom: 14 }}>
                {['all', 'videos', 'shorts'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`an26-pill-filter ${demoGenderTab === t ? 'active' : ''}`}
                    onClick={() => setDemoGenderTab(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {isVideoMode ? (
              <SegmentedStatList segments={genderItems} />
            ) : (
              <StudioProgressList items={genderItems} />
            )}
          </div>
        </div>

        <h2 className="an26-section-h2" style={{ marginBottom: 14 }}>
          {isVideoMode ? 'Interests across your channel' : 'Watch behavior on other channels'}
        </h2>
        {isVideoMode ? (
          <div className="an26-third-card an26-card" style={{ marginTop: 0 }}>
            <div className="an26-card-head">
              <div>
                <h3>What your audience watches</h3>
                <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
              </div>
            </div>
            <p className="an26-card-sub">Not enough data</p>
          </div>
        ) : (
          <div className="an26-bento-3">
            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Channels your audience watches</h3>
                  <span className="an26-card-sub">Last 28 days</span>
                </div>
              </div>
              <div className="an26-top-videos-list">
                {otherChannelsList.map((ch) => (
                  <div key={ch.name} className="an26-chan-watch-row">
                    <img
                      src={ch.avatar}
                      alt={ch.name}
                      className="an26-chan-watch-avatar"
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="an26-chan-watch-meta">
                      <strong>{ch.name}</strong>
                      <span>{ch.subs}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>What your audience watches</h3>
                  <span className="an26-card-sub">Last 7 days</span>
                </div>
              </div>
              <p className="an26-card-sub" style={{ marginTop: 12 }}>
                Not enough eligible audience data to show this report.{' '}
                <span className="an26-link-blue">Learn more</span>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sub-Hub: Revenue (Channel & Video)
  if (hubMode === 'hub_revenue') {
    const rawRevSeries = buildMetricSeries('revenue');
    const totalRev = Number(
      isVideoMode && currentVideo ? getVideoRevenueValue(currentVideo) : agg.revenue || 0
    );
    const revFactor =
      !isVideoMode && revTab === 'Watch Page ads'
        ? 0.999
        : !isVideoMode && revTab === 'Shorts Feed ads'
        ? 0.001
        : !isVideoMode && (revTab === 'Supers & gifts' || revTab === 'Affiliate program')
        ? 0
        : 1;
    const displayedRev = totalRev * revFactor;
    const revSeries =
      revFactor === 1
        ? rawRevSeries
        : rawRevSeries.map((pt) => ({
            ...pt,
            value: Number(((pt.value || 0) * revFactor).toFixed(2)),
          }));

    const channelRpm =
      agg.views > 0
        ? Number(((totalRev / agg.views) * 1000).toFixed(2))
        : parseRupeeNumber(agg.rpm, 1595.74);
    const videoRpm = parseRupeeNumber(currentVideo?.rpm ?? agg.rpm, 33.64);
    const videoCpm = parseRupeeNumber(currentVideo?.cpm ?? agg.cpm, 58.14);

    const allWaysItems = [
      {
        key: 'videos',
        label: 'Watch Page ads',
        pct: 99.9,
        display: formatINR(totalRev * 0.999),
      },
      {
        key: 'shorts',
        label: 'Shorts Feed ads',
        pct: 0.1,
        display: formatINR(totalRev * 0.001),
      },
    ];
    const visibleWaysItems =
      waysFilter === 'all'
        ? allWaysItems
        : waysFilter === 'videos'
        ? [{ ...allWaysItems[0], pct: 100 }]
        : waysFilter === 'shorts'
        ? [{ ...allWaysItems[1], pct: 100 }]
        : [];

    const contentEarnRev =
      contentEarnTab === 'videos'
        ? totalRev
        : contentEarnTab === 'shorts'
        ? totalRev * 0.001
        : 0;
    const contentEarnViews =
      contentEarnTab === 'videos'
        ? Number(agg.views || 0)
        : contentEarnTab === 'shorts'
        ? Math.round((agg.views || 0) * 0.001)
        : 0;
    const contentEarnRpm =
      contentEarnTab === 'videos'
        ? channelRpm
        : contentEarnTab === 'shorts'
        ? Number((channelRpm * 0.22).toFixed(2))
        : 0;

    const filteredTopEarning = topEarningVideos
      .filter((v) => {
        const fmt = String(v.format || v.type || '').toLowerCase();
        if (topEarnFilter === 'shorts') return fmt === 'short' || Boolean(v.isShort);
        if (topEarnFilter === 'live') return fmt === 'live';
        if (topEarnFilter === 'videos') return fmt !== 'short' && fmt !== 'live' && !v.isShort;
        return true;
      })
      .slice(0, 5);

    const monthlyBaseRev = rangeKey === 'lifetime' ? 12532.97 : Number(displayedRev || 12532.97);
    const monthlyItems = [
      { label: 'August (ongoing)', pct: 37, ratio: 0.35 },
      { label: 'July', pct: 100, ratio: 0.95 },
      { label: 'June', pct: 62, ratio: 0.59 },
      { label: 'May', pct: 98, ratio: 0.93 },
      { label: 'April', pct: 78, ratio: 0.74 },
      { label: 'March', pct: 40, ratio: 0.38 },
    ].map((m) => ({
      label: m.label,
      pct: m.pct,
      display: formatINR(monthlyBaseRev * m.ratio),
    }));

    return (
      <div className="an26-page">
        <div className="an26-subhub-header">
          <button type="button" className="an26-back-btn" onClick={() => navigateHub('hub_overview')}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="yt-display-font">Revenue</span>
          </button>
          <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
            Advanced mode
          </button>
        </div>

        {!isVideoMode && (
          <div className="an26-pill-tabs" style={{ marginBottom: 18 }}>
            {['all', 'Watch Page ads', 'Shorts Feed ads', 'Supers & gifts', 'Affiliate program'].map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  className={`an26-pill-filter ${revTab === t ? 'active' : ''}`}
                  onClick={() => setRevTab(t)}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              )
            )}
          </div>
        )}

        <div className="an26-section-toolbar">
          <h2 className="an26-section-h2">Key metrics</h2>
          {renderDatePills()}
        </div>

        <div className="an26-card" style={{ marginBottom: 18 }}>
          <div className="an26-card-head-ic">
            <div>
              <h3>Estimated revenue</h3>
              <div className="an26-hero-kpi-inline">
                <strong
                  className="an26-kpi-big-num yt-display-font"
                  title={formatINR(displayedRev)}
                >
                  {formatINR(displayedRev)}
                </strong>
                {!isVideoMode && rangeKey !== 'lifetime' && displayedRev > 0 && (
                  <>
                    <StudioUpBadge />
                    <span className="an26-delta-muted" style={{ color: '#137333' }}>
                      {formatCompactINR(displayedRev * 0.28)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined an26-clock-ic" title="Last few days processing">
              schedule
            </span>
          </div>
          <StudioLineMetricChart
            data={revSeries}
            metricKey="revenue"
            height={220}
            showProcessingZone
            showUploadMarkers={!isVideoMode}
            isLifetime={!isVideoMode && rangeKey === 'lifetime'}
          />
        </div>

        {isVideoMode ? (
          <>
            <div className="an26-bento-3">
              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>How you make money</h3>
                    <span className="an26-card-sub">Estimated · {snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioProgressList
                  items={[
                    {
                      label: 'Watch Page ads',
                      pct: 100,
                      display: formatCompactINR(totalRev),
                    },
                  ]}
                />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Earnings by ad type</h3>
                    <span className="an26-card-sub">YouTube ad revenue</span>
                  </div>
                </div>
                <SegmentedStatList
                  segments={[
                    { label: 'Skippable video ads', pct: 63.4, display: '63.4%' },
                    { label: 'Display ads', pct: 26.7, display: '26.7%' },
                    { label: 'Non-skippable video ads', pct: 8.1, display: '8.1%' },
                    { label: 'Bumper ads', pct: 1.8, display: '1.8%' },
                  ]}
                />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Video performance</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div
                  className="an26-kpi-big-num yt-display-font"
                  style={{ marginBottom: 4 }}
                  title={formatINR(totalRev)}
                >
                  {formatCompactINR(totalRev)}
                </div>
                <p className="an26-card-sub" style={{ marginBottom: 14 }}>
                  Estimated revenue
                </p>
                <div className="an26-rpm-cards">
                  <div className="an26-rpm-row">
                    <span>Engaged views</span>
                    <span>{fmtV(Math.round((agg.views || 0) * 0.72))}</span>
                  </div>
                  <div className="an26-rpm-row">
                    <span>Revenue per 1K engaged views (RPM)</span>
                    <span>{formatINR(videoRpm)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="an26-bento-3" style={{ marginTop: 18 }}>
              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Top affiliate products</h3>
                    <span className="an26-card-sub">
                      Estimated revenue · {snapshot?.dateRangeLabel}
                    </span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <p className="an26-card-sub" style={{ marginTop: 14 }}>
                  Not enough data
                </p>
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>How much advertisers pay</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <div className="an26-kpi-big-num yt-display-font" style={{ marginTop: 8, marginBottom: 4 }}>
                  {formatINR(videoCpm)}
                </div>
                <p className="an26-card-sub">Playback-based cost for every 1K views (CPM)</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="an26-bento-3">
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top earning</h3>
                    <span className="an26-card-sub">
                      Estimated revenue · {snapshot?.dateRangeLabel}
                    </span>
                  </div>
                </div>
                <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'videos', label: 'Videos' },
                    { key: 'shorts', label: 'Shorts' },
                    { key: 'live', label: 'Live' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`an26-pill-filter ${topEarnFilter === f.key ? 'active' : ''}`}
                      onClick={() => setTopEarnFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="an26-top-videos-list">
                  {filteredTopEarning.length === 0 ? (
                    <p className="an26-card-sub" style={{ padding: '12px 0' }}>
                      No revenue data for this format in the selected period.
                    </p>
                  ) : (
                    filteredTopEarning.map((v) => (
                      <div
                        key={v.id}
                        className="an26-top-video-row"
                        onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_revenue`)}
                      >
                        <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                        <div className="an26-tv-meta">
                          <p>{v.title}</p>
                        </div>
                        <span className="an26-tv-views" title={formatINR(v.revNum || 0)}>
                          {formatINR(v.revNum || 0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Monthly revenue</h3>
                    <span className="an26-card-sub">Estimated revenue</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioProgressList items={monthlyItems} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Ways of earning</h3>
                    <span className="an26-card-sub">
                      Estimated revenue · {snapshot?.dateRangeLabel}
                    </span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <div className="an26-pill-tabs" style={{ marginBottom: 12 }}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'videos', label: 'Videos' },
                    { key: 'shorts', label: 'Shorts' },
                    { key: 'live', label: 'Live' },
                  ].map((w) => (
                    <button
                      key={w.key}
                      type="button"
                      className={`an26-pill-filter ${waysFilter === w.key ? 'active' : ''}`}
                      onClick={() => setWaysFilter(w.key)}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                {visibleWaysItems.length === 0 ? (
                  <p className="an26-card-sub" style={{ padding: '12px 0' }}>
                    No revenue recorded for Live in this period.
                  </p>
                ) : (
                  <StudioProgressList items={visibleWaysItems} />
                )}
              </div>
            </div>

            <div className="an26-third-card an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Content earnings</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <div className="an26-pill-tabs" style={{ marginBottom: 14 }}>
                {[
                  { key: 'videos', label: 'Videos' },
                  { key: 'shorts', label: 'Shorts' },
                  { key: 'live', label: 'Live' },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`an26-pill-filter ${contentEarnTab === c.key ? 'active' : ''}`}
                    onClick={() => setContentEarnTab(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div
                className="an26-kpi-big-num yt-display-font"
                style={{ marginBottom: 2 }}
                title={formatINR(contentEarnRev)}
              >
                {formatINR(contentEarnRev)}
              </div>
              <p className="an26-card-sub" style={{ marginBottom: 16 }}>
                Estimated revenue
              </p>
              <div className="an26-rpm-cards">
                <div className="an26-rpm-row">
                  <span>Views</span>
                  <span>{contentEarnTab === 'videos' ? agg.viewsFormatted || fmtV(contentEarnViews) : fmtV(contentEarnViews)}</span>
                </div>
                <div className="an26-rpm-row">
                  <span>Revenue per 1K views (RPM)</span>
                  <span>{formatINR(contentEarnRpm)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN OVERVIEW HUB (Channel Insights OR Video Insights)
  // =========================================================================
  const hubCards = isVideoMode
    ? [
        { key: 'hub_reach', Icon: HubReachIcon, title: 'Reach' },
        { key: 'hub_engagement', Icon: HubEngagementIcon, title: 'Engagement' },
        { key: 'hub_audience', Icon: HubAudienceIcon, title: 'Audience' },
        { key: 'hub_revenue', Icon: HubRevenueIcon, title: 'Revenue' },
      ]
    : [
        { key: 'hub_content', Icon: HubContentIcon, title: 'Content' },
        { key: 'hub_audience', Icon: HubAudienceIcon, title: 'Audience' },
        { key: 'hub_revenue', Icon: HubRevenueIcon, title: 'Revenue' },
        { key: 'hub_research', Icon: HubResearchIcon, title: 'Research' },
      ];

  const watchTimeDisplay = (
    agg.watchTimeHrsFormatted || formatHoursValue(agg.watchTimeHrs || 0)
  ).replace(/\s*hrs\s*/gi, '');
  const revenueDisplay = agg.revenueFormatted || formatINR(agg.revenue || 0);
  const showPeriodDelta = !isVideoMode;

  const allKpis = [
    {
      key: 'views',
      label: 'Views',
      val: agg.viewsFormatted || fmtV(agg.views || 0),
      delta: fmtV(Math.round((agg.views || 0) * 0.32)),
      fullVal: formatCountComma(agg.views || 0),
    },
    {
      key: 'watchTimeHrs',
      label: 'Watch time (hours)',
      val: watchTimeDisplay,
      delta: formatHoursValue((agg.watchTimeHrs || 0) * 0.25),
      icon: 'error',
    },
    {
      key: 'subscribers',
      label: 'Subscribers',
      val: agg.subscribersNetFormatted || '+0',
      delta: fmtV(Math.round(Math.abs(agg.subscribersNet || 0) * 0.35)),
    },
    {
      key: 'revenue',
      label: 'Estimated revenue',
      val: formatCompactINR(agg.revenue || 0),
      delta: formatCompactINR((agg.revenue || 0) * 0.28),
      fullVal: revenueDisplay,
      icon: 'schedule',
    },
  ];

  const activeKpiObj = allKpis.find((k) => k.key === heroMetric) || allKpis[0];
  const secondaryKpis = allKpis.filter((k) => k.key !== activeKpiObj.key);

  return (
    <div className="an26-page">
      {/* Header */}
      <div className="an26-header">
        <h1 className="an26-title yt-display-font">{isVideoMode ? 'Video insights' : 'Channel insights'}</h1>
        <button type="button" className="an26-outline-pill" onClick={() => navigateHub('explore')}>
          Advanced mode
        </button>
      </div>

      {/* 4 Compact Single-Line Hub Pill Cards */}
      <div className="an26-hub-cards-row">
        {hubCards.map((card) => {
          const HubIcon = card.Icon;
          return (
            <button
              key={card.key}
              type="button"
              className="an26-hub-pill-card"
              onClick={() => navigateHub(card.key)}
            >
              <HubIcon size={20} className="an26-hub-pill-ic" />
              <span className="an26-hub-pill-title">{card.title}</span>
            </button>
          );
        })}
      </div>

      {/* Key Metrics Toolbar */}
      <div className="an26-section-toolbar">
        <h2 className="an26-section-h2">Key metrics</h2>
        {renderDatePills()}
      </div>

      {/* Overview Main Bento: Left Hero + 3 Mini Cards | Right Separate Stacked Cards */}
      <div className="an26-overview-grid">
        <div className="an26-left-hero-stack">
          <div className="an26-card">
            <h3 className="an26-card-t-sm">{activeKpiObj.label}</h3>
            <div className="an26-hero-kpi-inline">
              <strong
                className="an26-hero-big-num yt-display-font"
                title={activeKpiObj.fullVal || activeKpiObj.val}
              >
                {activeKpiObj.val}
              </strong>
              {showPeriodDelta && <StudioUpBadge />}
              {showPeriodDelta && <span className="an26-delta-muted">{activeKpiObj.delta}</span>}
            </div>

            <StudioLineMetricChart
              data={heroChartData}
              metricKey={heroMetric}
              height={215}
              showTypical={isVideoMode && heroMetric === 'views'}
              showProcessingZone={heroMetric === 'revenue'}
              showUploadMarkers={!isVideoMode}
              isLifetime={!isVideoMode && rangeKey === 'lifetime'}
            />

            {isVideoMode && heroMetric === 'views' && (
              <div className="an26-ret-legend" style={{ marginTop: 8 }}>
                <span>
                  <i className="dot indigo" /> Views
                </span>
                <span>
                  <i className="dot gray" /> Typical performance
                </span>
              </div>
            )}
          </div>

          {/* 3 Clickable Mini KPI Cards underneath Hero Chart */}
          <div className="an26-kpi-3-row">
            {secondaryKpis.map((k) => (
              <button
                key={k.key}
                type="button"
                className="an26-card an26-kpi-mini-card"
                onClick={() => setHeroMetric(k.key)}
              >
                <div className="an26-kpi-mini-top">
                  <span className="an26-kpi-mini-lbl">{k.label}</span>
                  {k.icon && <span className="material-symbols-outlined an26-clock-sm">{k.icon}</span>}
                </div>
                <div className="an26-hero-kpi-inline">
                  <strong
                    className="an26-kpi-mini-val yt-display-font"
                    title={k.fullVal || k.val}
                  >
                    {k.val}
                  </strong>
                  {showPeriodDelta && <StudioUpBadge />}
                  {showPeriodDelta && <span className="an26-delta-sm">{k.delta}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Rail: Separate Cards */}
        <div className="an26-right-cards-stack">
          <div className="an26-card">
            <h3 className="an26-card-t-sm">48 hour views</h3>
            <div className="an26-rt-big-num yt-display-font">{formatCountComma(rtTotal48h)}</div>
            <Realtime48hBarChart hourlyBars={realtimeScaledBars} height={96} />
          </div>

          {isVideoMode ? (
            <div className="an26-card">
              <div className="an26-card-head" style={{ marginBottom: 12 }}>
                <div>
                  <h3>How viewers found this video</h3>
                  <span className="an26-rt-views-sub">
                    <i /> Views · 48 hours
                  </span>
                </div>
              </div>
              <StudioProgressList
                items={(() => {
                  const rts = currentVideo?.realtimeTrafficSources;
                  if (rts && typeof rts === 'object') {
                    const mapped = [
                      { label: 'Browse features', pct: Number(rts.browse || 0) },
                      { label: 'YouTube search', pct: Number(rts.search || 0) },
                      { label: 'Channel pages', pct: Number(rts.channel || 0) },
                      { label: 'Other YouTube features', pct: Number(rts.other || 0) },
                      { label: 'External', pct: Number(rts.external || 0) },
                    ]
                      .filter((x) => x.pct > 0)
                      .sort((a, b) => b.pct - a.pct)
                      .slice(0, 3);
                    const pctSum = mapped.reduce((s, x) => s + x.pct, 0) || 100;
                    return mapped.map((t) => ({
                      label: t.label,
                      pct: t.pct,
                      display: fmtV(Math.round((rtTotal48h * t.pct) / pctSum)),
                    }));
                  }
                  const top3 = overallTrafficItems.slice(0, 3);
                  const pctSum = top3.reduce((sum, item) => sum + Number(item.pct || 0), 0) || 100;
                  return top3.map((t) => ({
                    label: t.label,
                    pct: t.pct,
                    display: fmtV(Math.round((rtTotal48h * Number(t.pct || 0)) / pctSum)),
                  }));
                })()}
              />
            </div>
          ) : (
            <>
              <div className="an26-card">
                <h3 className="an26-card-t-sm">Total subscribers</h3>
                <div className="an26-rt-big-num yt-display-font" style={{ marginBottom: 0 }}>
                  {channelInfo?.subscribersFormatted || fmtV(channelInfo?.subscribers || 0)}
                </div>
              </div>

              <div className="an26-card">
                <h3 className="an26-card-t-sm" style={{ marginBottom: 12 }}>Watched right now</h3>
                <div className="an26-rt-videos">
                  {rtTopVideos.map((item) => (
                    <div
                      key={item.id}
                      className="an26-rt-vid-row"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${item.id}/analytics/hub_overview`)}
                    >
                      <img src={item.thumbnail} alt={item.title} className="an26-rt-thumb" />
                      <span className="an26-rt-vid-title">{item.title}</span>
                      <span className="an26-rt-vid-val">{Number(item.views48h || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Summary Banner (Channel Overview only) */}
      {!isVideoMode && (() => {
        const topPanelVid = videos[0] || null;
        const totalViewsNum = Number(agg.views || 0);

        return (
          <div className="an26-ai-section">
            <div className="an26-ai-banner">
              <div className="an26-ai-left">
                <h3>
                  Views and watch time are above typical, driven by your top channel video.
                </h3>
                <button
                  type="button"
                  className="an26-ai-report-btn"
                  onClick={() => navigateHub('hub_content')}
                >
                  <AiReportIcon size={18} />
                  <span>View report</span>
                </button>
              </div>
              <div className="an26-ai-right">
                <p>
                  Your channel earned {agg.viewsFormatted || fmtV(totalViewsNum)} views and{' '}
                  {watchTimeDisplay} watch hours across{' '}
                  {snapshot?.dateRangeLabel}, remaining well above typical benchmarks.{' '}
                  {topPanelVid && (
                    <button
                      type="button"
                      className="an26-ai-vid-link"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${topPanelVid.id}/analytics/hub_overview`)}
                    >
                      {topPanelVid.title}
                    </button>
                  )}{' '}
                  led audience engagement with{' '}
                  {topPanelVid?.viewsFormatted || fmtV(topPanelVid?.views || 0)} views and a{' '}
                  {topPanelVid?.avgViewDuration || topPanelVid?.avgDuration || '12:51'} average view
                  duration, powered primarily by Browse features and new viewers. Consistent
                  storytelling hooks and strong emotional pacing will keep deepening viewer
                  retention.
                </p>
                <div className="an26-ai-meta">
                  <span>Generated by AI · AI can make mistakes, so double-check it</span>
                  <div className="an26-ai-votes">
                    <button
                      type="button"
                      className={aiThumbVote === 'up' ? 'active' : ''}
                      onClick={() => {
                        setAiThumbVote('up');
                        showToast?.('Thanks for your feedback', 'info');
                      }}
                      aria-label="Helpful"
                    >
                      <span className="material-symbols-outlined">thumb_up_off_alt</span>
                    </button>
                    <button
                      type="button"
                      className={aiThumbVote === 'down' ? 'active' : ''}
                      onClick={() => {
                        setAiThumbVote('down');
                        showToast?.('Feedback recorded', 'info');
                      }}
                      aria-label="Not helpful"
                    >
                      <span className="material-symbols-outlined">thumb_down_off_alt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="an26-ai-chip-btn"
              onClick={() => openAskStudio('Analyze my audience loyalty')}
            >
              <AskSparkleIcon size={13} />
              <span>Analyze my audience loyalty</span>
            </button>
          </div>
        );
      })()}

      {/* Stacked Overview Section Summaries */}
      {isVideoMode ? (
        <>
          <div className="an26-summary-block">
            <div className="an26-summary-head">
              <h2>Reach</h2>
              <button type="button" className="an26-viewall-pill" onClick={() => navigateHub('hub_reach')}>
                View all
              </button>
            </div>
            <div className="an26-reach-split">
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>How viewers found this video</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <StudioProgressList
                  items={trafficItems.slice(0, 3).map((t) => ({
                    label: t.label,
                    pct: t.pct,
                    display: t.viewsDisplay,
                  }))}
                />
              </div>

              <div className="an26-stack-2">
                <div className="an26-card">
                  <h3>Impressions</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  <div className="an26-kpi-big-num yt-display-font" style={{ marginTop: 8 }}>
                    {fmtV(agg.impressions || Math.round((agg.views || 0) * 14))}
                  </div>
                </div>
                <div className="an26-card">
                  <h3>Click-through rate</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  <div className="an26-kpi-big-num yt-display-font" style={{ marginTop: 8 }}>
                    {formatPctValue(agg.ctr ?? currentVideo?.ctr, '6.2%')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="an26-summary-block">
            <div className="an26-summary-head">
              <h2>Engagement</h2>
              <button type="button" className="an26-viewall-pill" onClick={() => navigateHub('hub_engagement')}>
                View all
              </button>
            </div>
            <div className="an26-reach-split">
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Audience retention</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <RetentionCurveChart duration={currentVideo?.duration || '15:14'} />
              </div>

              <div className="an26-stack-2">
                <div className="an26-card">
                  <h3>Average view duration</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  <div className="an26-kpi-big-num yt-display-font" style={{ marginTop: 8 }}>
                    {currentVideo?.avgViewDuration || currentVideo?.avgDuration || '4:15'} (
                    {computeAvgPctViewed(
                      currentVideo?.avgViewDuration || currentVideo?.avgDuration || '4:15',
                      currentVideo?.duration
                    )})
                  </div>
                </div>
                <div className="an26-card">
                  <h3>Likes (vs. dislikes)</h3>
                  <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  <div className="an26-hero-kpi-inline" style={{ marginTop: 8 }}>
                    <strong className="an26-kpi-big-num yt-display-font">96.5%</strong>
                    <span className="an26-delta-muted" style={{ color: '#606060' }}>Channel avg: 97.7%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="an26-summary-block">
          <div className="an26-summary-head">
            <h2>Content</h2>
            <button type="button" className="an26-viewall-pill" onClick={() => navigateHub('hub_content')}>
              View all
            </button>
          </div>
          <div className="an26-bento-3">
            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Recent video performance</h3>
                  <span className="an26-card-sub">Published {formatPublishDate(videos[0])}</span>
                </div>
              </div>
              {videos[0] && (
                <>
                  <div
                    className="an26-top-video-row"
                    style={{ marginBottom: 14 }}
                    onClick={() => navigate(`${CHANNEL_PREFIX}/video/${videos[0].id}/analytics/hub_overview`)}
                  >
                    <img src={videos[0].thumbnail || '/thumbnails/latest_video.png'} alt={videos[0].title} />
                    <div className="an26-tv-meta">
                      <p>{videos[0].title}</p>
                    </div>
                  </div>
                  <div className="an26-rpm-cards">
                    <div className="an26-rpm-row">
                      <span>Views</span>
                      <strong>{videos[0].viewsFormatted || fmtV(videos[0].views || 0)}</strong>
                    </div>
                    <div className="an26-rpm-row">
                      <span>Thumbnail click-through rate</span>
                      <strong>{formatPctValue(videos[0].ctr, '6.2%')}</strong>
                    </div>
                    <div className="an26-rpm-row">
                      <span>Average view duration</span>
                      <strong>{videos[0].avgViewDuration || videos[0].avgDuration || '4:15'}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>Top content</h3>
                  <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <div className="an26-top-videos-list">
                {[...videos]
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .slice(0, 3)
                  .map((v) => (
                  <div
                    key={v.id}
                    className="an26-top-video-row"
                    onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_overview`)}
                  >
                    <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                    <div className="an26-tv-meta">
                      <p>{v.title}</p>
                    </div>
                    <span className="an26-tv-views">{v.viewsFormatted || fmtV(v.views)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="an26-card">
              <div className="an26-card-head">
                <div>
                  <h3>How viewers find your content</h3>
                  <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                </div>
              </div>
              <StudioProgressList items={overallTrafficItems.slice(0, 3)} />
            </div>
          </div>
        </div>
      )}

      {/* Audience Summary Block */}
      <div className="an26-summary-block">
        <div className="an26-summary-head">
          <h2>Audience</h2>
          <button type="button" className="an26-viewall-pill" onClick={() => navigateHub('hub_audience')}>
            View all
          </button>
        </div>
        <div className="an26-bento-3">
          {isVideoMode ? (
            <>
              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Watch behavior</h3>
                    <span className="an26-card-sub">Unique viewers · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <SegmentedStatList segments={viewerLoyaltySegments} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top demographics</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div className="an26-demo-big yt-display-font">Male</div>
                <div className="an26-demo-big yt-display-font">25–34 years</div>
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top geographies</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <StudioProgressList items={geoItems.slice(0, 2)} />
              </div>
            </>
          ) : (
            <>
              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Monthly audience</h3>
                    <strong className="an26-kpi-big-num yt-display-font">
                      {fmtV(Math.round((agg.views || 0) * 0.72))}
                    </strong>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioLineMetricChart
                  data={buildMetricSeries('unique')}
                  metricKey="views"
                  height={110}
                  showProcessingZone
                />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Watch behavior</h3>
                    <span className="an26-card-sub">Monthly audience</span>
                  </div>
                </div>
                <SegmentedStatList segments={viewerLoyaltySegments} />
              </div>

              <div className="an26-card">
                <div className="an26-card-head">
                  <div>
                    <h3>Top demographics</h3>
                    <span className="an26-card-sub">Views · {snapshot?.dateRangeLabel}</span>
                  </div>
                </div>
                <div className="an26-demo-big yt-display-font">Male</div>
                <div className="an26-demo-big yt-display-font">25–34 years</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Revenue Summary Block */}
      <div className="an26-summary-block">
        <div className="an26-summary-head">
          <h2>Revenue</h2>
          <button type="button" className="an26-viewall-pill" onClick={() => navigateHub('hub_revenue')}>
            View all
          </button>
        </div>
        <div className="an26-bento-3">
          {isVideoMode ? (
            <>
              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>How you make money</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioProgressList
                  items={[
                    {
                      label: 'Watch Page ads',
                      pct: 100,
                      display: formatCompactINR(
                        currentVideo ? getVideoRevenueValue(currentVideo) : agg.revenue || 0
                      ),
                    },
                  ]}
                />
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Top ad type</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <div className="an26-demo-big yt-display-font" style={{ marginTop: 10 }}>
                  Skippable video ads
                </div>
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>RPM</h3>
                    <span className="an26-card-sub">{snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <div className="an26-demo-big yt-display-font" style={{ marginTop: 10 }}>
                  {formatINR(parseRupeeNumber(agg.rpm ?? currentVideo?.rpm, 48.2))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Top earning</h3>
                    <span className="an26-card-sub">Estimated revenue · {snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <div className="an26-top-videos-list">
                  {topEarningVideos.slice(0, 3).map((v) => (
                    <div
                      key={v.id}
                      className="an26-top-video-row"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/analytics/hub_revenue`)}
                    >
                      <img src={v.thumbnail || '/thumbnails/latest_video.png'} alt={v.title} />
                      <div className="an26-tv-meta">
                        <p>{v.title}</p>
                      </div>
                      <span className="an26-tv-views" title={formatINR(v.revNum || 0)}>
                        {getVideoRevenueFormatted(v, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Ways of earning</h3>
                    <span className="an26-card-sub">Estimated revenue · {snapshot?.dateRangeLabel}</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioProgressList
                  items={[
                    {
                      label: 'Watch Page ads',
                      pct: 99.9,
                      display: formatINR((agg.revenue || 0) * 0.999),
                    },
                    {
                      label: 'Shorts Feed ads',
                      pct: 0.1,
                      display: formatINR((agg.revenue || 0) * 0.001),
                    },
                  ]}
                />
              </div>

              <div className="an26-card">
                <div className="an26-card-head-ic">
                  <div>
                    <h3>Monthly revenue</h3>
                    <span className="an26-card-sub">Estimated revenue</span>
                  </div>
                  <span className="material-symbols-outlined an26-clock-ic">schedule</span>
                </div>
                <StudioProgressList
                  items={[
                    {
                      label: 'August (ongoing)',
                      pct: 37,
                      display: formatINR((rangeKey === 'lifetime' ? 12532.97 : (agg.revenue || 12532.97)) * 0.35),
                    },
                    {
                      label: 'July',
                      pct: 100,
                      display: formatINR((rangeKey === 'lifetime' ? 12532.97 : (agg.revenue || 12532.97)) * 0.95),
                    },
                    {
                      label: 'June',
                      pct: 62,
                      display: formatINR((rangeKey === 'lifetime' ? 12532.97 : (agg.revenue || 12532.97)) * 0.59),
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
