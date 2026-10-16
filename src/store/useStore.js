import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SpreadsheetDataService } from '../services/SpreadsheetDataService.js';
import { InsforgeService, parseAvdToSeconds, formatSecondsToAvd } from '../services/InsforgeService.js';
import {
  CHANNEL_BENCHMARKS,
  PROCESSED_VIDEOS,
  DAILY_SERIES,
  VIDEO_ID_TO_DATE,
  TITLE_TO_SCHEDULE_DATE,
  VIDEO_PUBLISH_SCHEDULE,
  filterDailyMetricsByRange,
  aggregateMetrics,
  getTrafficSources,
  getAudienceBreakdown,
  generateDailyTimeSeries,
  generateLifetimeTimeSeries,
  generateRealtimeDataset,
  tickRealtimeData,
  formatDateRangeText,
  formatSingleDate,
  getDeterministicRandom,
  interpolateCurve
} from '../engine/AnalyticsSimulationEngine.js';

export const formatINR = (val) => {
  if (val === null || val === undefined) return '₹0.00';
  if (typeof val === 'number') {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (typeof val === 'string') {
    let s = val.trim();
    if (s.startsWith('₹')) return s;
    if (s.startsWith('$')) s = s.slice(1);
    const num = parseFloat(s.replace(/,/g, ''));
    if (!isNaN(num)) {
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${s}`;
  }
  return String(val);
};

export const fmtV = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.round(num));
};

export const fmtW = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M hrs`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K hrs`;
  return `${Math.round(num)} hrs`;
};

export const fmtS = (s) => {
  const num = Number(s) || 0;
  const prefix = num > 0 ? '+' : '';
  if (Math.abs(num) >= 1_000_000) return `${prefix}${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${prefix}${(num / 1_000).toFixed(1)}K`;
  return `${prefix}${num.toLocaleString('en-IN')}`;
};

export function distributeWithRealtimeEnd(weights, totalViews, targetEndViews, isPublishedArr = null) {
  const n = weights.length;
  if (n === 0) return [];
  if (n === 1) return [totalViews];

  // Identify valid published indices
  const activeIndices = [];
  weights.forEach((w, idx) => {
    if (!isPublishedArr || isPublishedArr[idx]) {
      activeIndices.push(idx);
    }
  });

  if (activeIndices.length <= 1) {
    return weights.map((w, idx) => (isPublishedArr && !isPublishedArr[idx]) ? 0 : totalViews);
  }

  const lastActiveIdx = activeIndices[activeIndices.length - 1];
  const secondLastIdx = activeIndices.length >= 2 ? activeIndices[activeIndices.length - 2] : null;
  const avgPerActive = Math.round(totalViews / activeIndices.length);

  const earlierIndices = activeIndices.filter(idx => idx !== lastActiveIdx);
  const earlierWeightSum = earlierIndices.reduce((acc, idx) => acc + (weights[idx] || 0.01), 0) || 1;

  const rawEndRatio = (weights[lastActiveIdx] || 0.01) / (earlierWeightSum / earlierIndices.length || 1);
  const endFromCurve = Math.round(avgPerActive * rawEndRatio);

  // Ensure end views stay elevated as per realtime views velocity & user curve, never dipping
  const endViews = Math.max(
    targetEndViews || 0,
    endFromCurve,
    Math.round(avgPerActive * 0.95)
  );

  const remainingViews = Math.max(0, totalViews - endViews);
  let currentSum = 0;
  const result = new Array(n).fill(0);
  earlierIndices.forEach(idx => {
    const val = Math.round(remainingViews * ((weights[idx] || 0.01) / earlierWeightSum));
    result[idx] = val;
    currentSum += val;
  });

  const prevVal = secondLastIdx !== null ? result[secondLastIdx] : avgPerActive;
  const finalEnd = Math.max(endViews, Math.round(prevVal * 0.85));

  result[lastActiveIdx] = finalEnd;
  return result;
}

const INITIAL_ANCHOR_DATE = '2026-09-18';
const INITIAL_REALTIME = generateRealtimeDataset(INITIAL_ANCHOR_DATE);
const INITIAL_LAST28_DAILY = filterDailyMetricsByRange(DAILY_SERIES, '2026-08-22', '2026-09-18');
const INITIAL_AGG = aggregateMetrics(INITIAL_LAST28_DAILY);

// Baseline lifetime totals from the original simulation data
const BASELINE_VIEWS = PROCESSED_VIDEOS.reduce((acc, v) => acc + (Number(v.views) || 0), 0) || 21450000;
const BASELINE_REVENUE = PROCESSED_VIDEOS.reduce((acc, v) => acc + ((Number(v.views) || 0) / 1000 * (Number(v.rpm) || 33.64)), 0) || 722000;

const EMPTY_STATE = {
  channelInfo: {
    ...CHANNEL_BENCHMARKS,
    subscribers: 53883,
    subscribersFormatted: '53,883',
    lifetimeViewsFormatted: '37L',
    totalUploads: PROCESSED_VIDEOS.length,
    hasExplicitChannelMetrics: true,
    viewsLast28Days: 3696747,
    viewsLast28DaysFormatted: '37L',
    watchTimeLast28Days: 640000,
    watchTimeLast28DaysFormatted: '6.4L',
    subscribersGainedLast28Days: 53873,
    subscribersGainedLast28DaysFormatted: '+53.9K',
    revenueLast28Days: 5899062.78,
    revenueLast28DaysFormatted: '₹58,99,062.78',
    totalRevenueFormatted: '₹58,99,062.78',
    realtimeSubscribers: 53883,
    realtimeViews48h: 264,
    realtimeViews60m: 0,
    currency: 'INR'
  },
  videos: PROCESSED_VIDEOS,
  shorts: [],
  liveStreams: [],
  playlists: [
    { id: 'pl_01', title: 'AI & Autonomous Agents Masterclass', videoCount: 4, visibility: 'Public', lastUpdated: '3 days ago' },
    { id: 'pl_02', title: 'Full Stack SaaS Engineering', videoCount: 3, visibility: 'Public', lastUpdated: '1 week ago' },
    { id: 'pl_03', title: 'System Design & Distributed Systems', videoCount: 3, visibility: 'Public', lastUpdated: '2 weeks ago' }
  ],
  podcasts: [],
  comments: [
    { id: 'c_1', videoId: 'vid_01', author: 'Alex Tech', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80', text: 'This AI agent video is incredible! The tool calling architecture makes total sense now.', likes: 342, heart: true, time: '2 hours ago', status: 'Published' },
    { id: 'c_2', videoId: 'vid_02', author: 'DevGirl_99', authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', text: 'Giving an agent control of your bank account was wild 🤯 great explanation!', likes: 189, heart: false, time: '5 hours ago', status: 'Published' },
    { id: 'c_3', videoId: 'vid_10', author: 'CodeMaster', authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80', text: 'Best system design video on YouTube. Period.', likes: 512, heart: true, time: '1 day ago', status: 'Published' }
  ],
  subtitles: PROCESSED_VIDEOS.map(v => ({
    id: `sub_${v.id}`,
    videoId: v.id,
    videoTitle: v.title,
    languages: ['English (Automatic)'],
    modified: v.publishDate,
    titleDescriptionState: 'Published',
    subtitlesState: 'Published'
  })),
  copyrightClaims: [],
  audioTracks: [
    { id: 'track_1', title: 'Synthwave Dreams', artist: 'Axiom Audio', duration: '3:45', genre: 'Electronic', mood: 'Dramatic', starred: true },
    { id: 'track_2', title: 'Lofi Study Beats', artist: 'Chillhop Lab', duration: '2:30', genre: 'Lofi', mood: 'Calm', starred: false }
  ],
  notifications: [
    { id: 'n_1', title: 'System Design video reached 2.8M views!', message: 'Your video is trending #1 in Tech.', time: '1 hour ago', read: false }
  ],
  spreadsheetWarnings: [],
  graphSettings: {
    channelSpikiness: 1.0,
    videoLaunchSpike: 4.5,
    algorithmFrequency: 1.0,
    spikinessPreset: 'spiky'
  },
  settings: {
    currency: 'INR - Indian Rupee',
    theme: 'Dark',
    country: 'United States',
    keywords: 'AI, Autonomous Agents, Software Engineering, React, Node.js, System Design',
    defaultVisibility: 'Public',
    defaultCategory: 'Science & Technology'
  },
  analytics: {
    daily: INITIAL_LAST28_DAILY,
    trafficSources: getTrafficSources(INITIAL_AGG.views),
    audience: getAudienceBreakdown(INITIAL_AGG.views),
    realtime: INITIAL_REALTIME,
    subscribers: [],
    charts: {
      overview: INITIAL_LAST28_DAILY,
      revenue: INITIAL_LAST28_DAILY,
      realtime: INITIAL_REALTIME.last48Hours,
      engagement: INITIAL_LAST28_DAILY,
      trafficSources: getTrafficSources(INITIAL_AGG.views),
      audience: getAudienceBreakdown(INITIAL_AGG.views),
      videoMetrics: null
    }
  },
  engine: {
    totalViews: INITIAL_AGG.views,
    totalRevenue: INITIAL_AGG.revenue,
    totalWatchTimeHrs: INITIAL_AGG.watchTimeHrs,
    averageRpm: INITIAL_AGG.rpm,
    averageCpm: INITIAL_AGG.cpm,
    averageCtr: INITIAL_AGG.ctr,
    averageViewDuration: '04:15',
    subscriberGrowth: INITIAL_AGG.subscribersNet,
    monthlyRevenue: [],
    topVideos: {
      mostViewed: [...PROCESSED_VIDEOS].sort((a, b) => b.views - a.views),
      highestRpm: [...PROCESSED_VIDEOS].sort((a, b) => b.rpm - a.rpm),
      highestRevenue: [...PROCESSED_VIDEOS].sort((a, b) => b.revenue - a.revenue),
      fastestGrowing: [...PROCESSED_VIDEOS].sort((a, b) => b.ctr - a.ctr)
    }
  }
};

function applySpreadsheetData(data) {
  const rawList = data.videos && data.videos.length > 0 ? data.videos : EMPTY_STATE.videos;
  const normalizedVideos = rawList.map((v, i) => {
    const pubDate = v.publishDate || v.date;
    return {
      ...v,
      publishDate: pubDate,
      date: pubDate,
      sortOrder: v.sortOrder !== undefined ? v.sortOrder : i + 1
    };
  });

  return {
    channelInfo: { ...EMPTY_STATE.channelInfo, ...(data.channelInfo || {}) },
    videos: normalizedVideos,
    shorts: data.shorts || [],
    liveStreams: data.liveStreams || [],
    playlists: data.playlists && data.playlists.length > 0 ? data.playlists : EMPTY_STATE.playlists,
    podcasts: data.podcasts || [],
    comments: data.comments && data.comments.length > 0 ? data.comments : EMPTY_STATE.comments,
    subtitles: data.subtitles || EMPTY_STATE.subtitles,
    copyrightClaims: data.copyrightClaims || [],
    audioTracks: data.audioTracks || EMPTY_STATE.audioTracks,
    notifications: data.notifications || EMPTY_STATE.notifications,
    settings: data.settings || EMPTY_STATE.settings,
    analytics: data.analytics || EMPTY_STATE.analytics,
    engine: data.engine || EMPTY_STATE.engine,
    spreadsheetWarnings: data.warnings || []
  };
}

export const useStore = create(
  persist(
    (set, get) => ({
      mode: 'simulation',
      isSpreadsheetLoading: false,
      spreadsheetError: null,
      lastSpreadsheetSync: null,
      spreadsheetConfig: {
        source: 'excel',
        autoRefreshInterval: 60,
        liveSync: true
      },

      // Database Connectivity State (Disconnected)
      isDatabaseLoading: false,
      isDatabaseConnected: false,
      lastDatabaseSync: null,
      databaseError: null,

      // Date filtering state
      simulationAnchorDate: '2026-10-16',
      selectedDateRange: 'last28',
      customStartDate: '2026-09-05',
      customEndDate: '2026-10-16',
      realtimeDataset: INITIAL_REALTIME,

      ...EMPTY_STATE,
      toast: null,

      showToast: (message, type = 'info') => {
        set({ toast: { id: Date.now(), message, type } });
      },
      clearToast: () => set({ toast: null }),

      // ─── Permanent Local Storage Persistence (No Database) ───
      loadPermanentState: async (silent = true) => {
        try {
          const res = await fetch('/api/crm/data');
          if (res.ok) {
            const body = await res.json();
            if (body && body.data) {
              const { channelInfo, videos, stateData } = body.data;
              const curState = get();
              const updates = {};
              if (channelInfo) {
                updates.channelInfo = { ...curState.channelInfo, ...channelInfo, hasExplicitChannelMetrics: true };
              }
              if (videos && videos.length > 0) {
                updates.videos = videos;
              }
              if (stateData) {
                if (stateData.channelInfo) updates.channelInfo = { ...curState.channelInfo, ...updates.channelInfo, ...stateData.channelInfo };
                if (stateData.videos && stateData.videos.length > 0) updates.videos = stateData.videos;
                if (stateData.graphSettings) updates.graphSettings = stateData.graphSettings;
                if (stateData.simulationAnchorDate) updates.simulationAnchorDate = stateData.simulationAnchorDate;
                if (stateData.selectedDateRange) updates.selectedDateRange = stateData.selectedDateRange;
                if (stateData.customStartDate) updates.customStartDate = stateData.customStartDate;
                if (stateData.customEndDate) updates.customEndDate = stateData.customEndDate;
              }
              set({
                ...updates,
                hasCrmOverrides: true,
                dateRangeVersion: (curState.dateRangeVersion || 0) + 1
              });
              return true;
            }
          }
        } catch (err) {
          console.warn('[Store] Local permanent state load note:', err.message);
        }
        return false;
      },

      loadFromDatabase: async () => {
        return get().loadPermanentState();
      },

      persistPermanentState: async () => {
        const state = get();
        const payload = {
          channelInfo: state.channelInfo,
          videos: state.videos,
          settings: state.settings,
          graphSettings: state.graphSettings,
          selectedDateRange: state.selectedDateRange,
          simulationAnchorDate: state.simulationAnchorDate,
          customStartDate: state.customStartDate,
          customEndDate: state.customEndDate,
          savedAt: new Date().toISOString()
        };
        try {
          await fetch('/api/crm/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch {
          // Local storage persistence serves as seamless browser fallback
        }
      },

      persistToDatabase: async () => {
        return get().persistPermanentState();
      },

      // Date range changer
      setDateRange: (rangeKey, customStart = null, customEnd = null) => {
        set(state => {
          const updates = { 
            selectedDateRange: rangeKey,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1,
            hasCrmOverrides: true
          };
          if (customStart) updates.customStartDate = customStart;
          if (customEnd) updates.customEndDate = customEnd;
          return updates;
        });
        get().persistToDatabase();
      },

      // Set simulation anchor date (e.g. '2026-08-28') and update date ranges
      setSimulationAnchorDate: (anchorDate, customStart = null, customEnd = null) => {
        set(state => {
          const cleanAnchor = anchorDate ? anchorDate.split('T')[0] : '2026-08-28';
          let startStr = customStart;
          if (!startStr) {
            const d = new Date(`${cleanAnchor}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() - 27);
            startStr = d.toISOString().split('T')[0];
          }
          const endStr = customEnd ? customEnd : cleanAnchor;
          return {
            hasCrmOverrides: true,
            simulationAnchorDate: cleanAnchor,
            customStartDate: startStr,
            customEndDate: endStr,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1
          };
        });
        get().persistToDatabase();
      },

      // Graph visual spikiness & curve controls (Channel & Per-Video with 7-node sculptors)
      updateGraphSettings: (newSettings) => {
        set(state => {
          const current = state.graphSettings || {};
          return {
            hasCrmOverrides: true,
            graphSettings: {
              ...current,
              ...newSettings,
              channel: newSettings.channel ? { ...(current.channel || {}), ...newSettings.channel } : (current.channel || { spikiness: 1.0, algoFrequency: 1.0, uploadSurge: 1.0, hardness: 1.4, nodes: [1.0, 3.5, 0.9, 4.8, 1.1, 3.6, 1.2], preset: 'spiky' }),
              videoDefaults: newSettings.videoDefaults ? { ...(current.videoDefaults || {}), ...newSettings.videoDefaults } : (current.videoDefaults || { launchSpike: 4.5, spikiness: 1.0, algoFrequency: 1.0, decayRate: 1.0, hardness: 1.4, nodes: [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 1.0], preset: 'standard' }),
              perVideo: newSettings.perVideo ? { ...(current.perVideo || {}), ...newSettings.perVideo } : (current.perVideo || {})
            },
            dateRangeVersion: (state.dateRangeVersion || 0) + 1
          };
        });
        get().persistToDatabase();
      },

      updateVideoGraphConfig: (videoId, config) => {
        set(state => {
          const current = state.graphSettings || {};
          const perVideo = { ...(current.perVideo || {}) };
          perVideo[videoId] = {
            ...(perVideo[videoId] || current.videoDefaults || { launchSpike: 4.5, spikiness: 1.0, algoFrequency: 1.0, decayRate: 1.0, hardness: 1.4, nodes: [1.0, 4.5, 0.9, 3.8, 1.1, 2.5, 1.0], preset: 'standard' }),
            ...config
          };
          return {
            hasCrmOverrides: true,
            graphSettings: {
              ...current,
              perVideo
            },
            dateRangeVersion: (state.dateRangeVersion || 0) + 1
          };
        });
        get().persistToDatabase();
      },

      // Live realtime ticker tick function
      tickRealtime: () => {
        set(state => ({
          realtimeDataset: tickRealtimeData(state.realtimeDataset)
        }));
      },

      // Helper to retrieve computed analytics for any date range and video
      getAnalyticsForRange: (rangeKey = null, videoId = null) => {
        const state = get();
        const activeKey = rangeKey || state.selectedDateRange;
        const anchorDateStr = state.simulationAnchorDate || '2026-08-28';
        const today = new Date(anchorDateStr.includes('T') ? anchorDateStr : `${anchorDateStr}T00:00:00Z`);

        const formatDate = (d) => d.toISOString().split('T')[0];
        const subDays = (d, count) => {
          const res = new Date(d);
          res.setUTCDate(res.getUTCDate() - count);
          return res;
        };

        const todayStr = formatDate(today);
        let startStr = '2026-08-01';
        let endStr = todayStr;

        if (activeKey === 'today') {
          startStr = todayStr;
          endStr = todayStr;
        } else if (activeKey === 'first24') {
          startStr = formatDate(subDays(today, 1));
          endStr = todayStr;
        } else if (activeKey === 'yesterday') {
          const y = formatDate(subDays(today, 1));
          startStr = y;
          endStr = y;
        } else if (activeKey === 'last7') {
          startStr = formatDate(subDays(today, 6));
          endStr = todayStr;
        } else if (activeKey === 'last28') {
          startStr = (state.customStartDate && state.customEndDate && state.selectedDateRange === 'last28') ? state.customStartDate : formatDate(subDays(today, 27));
          endStr = (state.customStartDate && state.customEndDate && state.selectedDateRange === 'last28') ? state.customEndDate : todayStr;
        } else if (activeKey === 'last90') {
          startStr = formatDate(subDays(today, 89));
          endStr = todayStr;
        } else if (activeKey === '365') {
          startStr = formatDate(subDays(today, 364));
          endStr = todayStr;
        } else if (activeKey === 'lifetime' || activeKey === 'since_published') {
          startStr = '2023-02-11';
          endStr = '2026-10-16';
        } else if (activeKey === '2026') {
          startStr = '2026-01-01';
          endStr = todayStr;
        } else if (activeKey === '2025') {
          startStr = '2025-01-01';
          endStr = '2025-12-31';
        } else if (activeKey === 'august') {
          startStr = '2026-08-01';
          endStr = todayStr > '2026-08-31' ? '2026-08-31' : todayStr;
        } else if (activeKey === 'july') {
          startStr = '2026-07-01';
          endStr = '2026-07-31';
        } else if (activeKey === 'june') {
          startStr = '2026-06-01';
          endStr = '2026-06-30';
        } else if (activeKey === 'custom') {
          startStr = state.customStartDate || formatDate(subDays(today, 27));
          endStr = state.customEndDate || todayStr;
        }

        let dynamicDailySeries;
        let filteredDaily;
        if ((activeKey === 'lifetime' || activeKey === 'since_published') && !videoId) {
          dynamicDailySeries = generateLifetimeTimeSeries();
          filteredDaily = dynamicDailySeries;
        } else {
          const channelConfig = state.graphSettings?.channel || state.graphSettings || {};
          const diffDays = Math.max(365, Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);
          dynamicDailySeries = generateDailyTimeSeries(diffDays, endStr || anchorDateStr, state.videos, channelConfig);
          filteredDaily = filterDailyMetricsByRange(dynamicDailySeries, startStr, endStr);
        }

        let agg;
        if ((activeKey === 'lifetime' || activeKey === 'since_published') && !videoId) {
          agg = {
            views: 3696747,
            viewsFormatted: '37L',
            watchTimeHrs: 640000,
            watchTimeHrsFormatted: '6.4L',
            impressions: 41536483,
            impressionsFormatted: '41.5M',
            ctr: 8.9,
            revenue: 5899062.78,
            revenueFormatted: '₹58,99,062.78',
            subscribersGained: 58128,
            subscribersLost: 4306,
            subscribersNet: 53883,
            subscribersNetFormatted: '+53.9K',
            rpm: 1595.74,
            cpm: 2744.67,
            likes: 170050,
            comments: 12569
          };
        } else {
          agg = aggregateMetrics(filteredDaily, videoId);
        }
        const formattedDateRange = (activeKey === 'lifetime' || activeKey === 'since_published') && !videoId ? '11 Feb 2023 – 16 Oct 2026' : formatDateRangeText(startStr, endStr);

        // Per-video analytics: use the video's actual stored metrics directly
        if (videoId) {
          const targetVideo = state.videos.find(v => v.id === videoId || String(v.id) === String(videoId)) || state.videos[0];
          const videoViews = targetVideo ? (Number(targetVideo.views) || 0) : 0;
          const videoRpm = targetVideo?.rpm ? Number(targetVideo.rpm) : 33.64;
          const videoRevenue = targetVideo
            ? (targetVideo.revenue != null ? Number(targetVideo.revenue) : parseFloat(((videoViews / 1000) * videoRpm).toFixed(2)))
            : 0;
          const videoAvgDurationSecs = targetVideo?.avgViewDurationSecs || parseAvdToSeconds(targetVideo?.avgViewDuration, 105);
          const videoWatchTime = (targetVideo?.watchTimeHrs !== undefined && targetVideo?.watchTimeHrs !== null && Number(targetVideo?.watchTimeHrs) > 0)
            ? Number(targetVideo.watchTimeHrs)
            : parseFloat((videoViews * videoAvgDurationSecs / 3600).toFixed(1));

          const videoSubsGained = (targetVideo?.subscribersGained !== undefined && targetVideo?.subscribersGained !== null && Number(targetVideo?.subscribersGained) > 0)
            ? Number(targetVideo.subscribersGained)
            : ((targetVideo?.netSubscribers !== undefined && targetVideo?.netSubscribers !== null && Number(targetVideo?.netSubscribers) > 0)
                ? Number(targetVideo.netSubscribers)
                : Math.round(videoViews * 0.014));
          const videoSubsLost = targetVideo?.subscribersLost !== undefined
            ? Number(targetVideo.subscribersLost)
            : 0;
          const videoSubsNet = videoSubsGained;

          const videoCtr = targetVideo?.ctr ? Number(targetVideo.ctr) : 8.9;
          const videoImpressions = Math.round(videoViews * (100 / (videoCtr || 8.9)));

          const pubDateStr = targetVideo?.publishDate || targetVideo?.date || (TITLE_TO_SCHEDULE_DATE[targetVideo?.title] || VIDEO_ID_TO_DATE[targetVideo?.id] || '2026-08-16');

          // In video analytics, compute realistic spiky daily views with launch spike, decay, and algorithm surges
          const activeItems = filteredDaily.filter(d => d.date >= pubDateStr);
          const numActive = activeItems.length;

          const vConfig = state.graphSettings?.perVideo?.[targetVideo?.id] || state.graphSettings?.videoDefaults || state.graphSettings || {};
          const launchSpike = Number(vConfig.launchSpike ?? (state.graphSettings?.videoLaunchSpike ?? 4.5));
          const vSpikiness = Number(vConfig.spikiness ?? (state.graphSettings?.channelSpikiness ?? 1.0));
          const algoFreq = Number(vConfig.algoFrequency ?? (state.graphSettings?.algorithmFrequency ?? 1.0));
          const decayFactor = Number(vConfig.decayRate ?? 1.0);
          const vSeed = targetVideo?.id ? (String(targetVideo.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 997) : 42;

          const userNodes = (vConfig.nodes && Array.isArray(vConfig.nodes) && vConfig.nodes.length >= 2)
            ? vConfig.nodes
            : [1.0, launchSpike, 0.9, 3.8, 1.1, 2.5, 1.0];
          const vHardness = Number(vConfig.hardness ?? 1.4);

          const rawWeights = filteredDaily.map((d, k) => {
            if (numActive > 0 && d.date < pubDateStr) return 0;
            const progress = (k / (filteredDaily.length - 1 || 1));
            const userCurveVal = interpolateCurve(userNodes, progress, vHardness);

            const uTime = new Date(`${pubDateStr}T00:00:00Z`).getTime();
            const cTime = new Date(`${d.date}T00:00:00Z`).getTime();
            const diffDays = Math.round((cTime - uTime) / (1000 * 60 * 60 * 24));

            let base = userCurveVal;
            if (diffDays === 0) base = Math.max(base, 0.85 * launchSpike);
            else if (diffDays === 1) base = Math.max(base, 1.20 * launchSpike);
            else if (diffDays > 1 && diffDays <= 6) base = base * Math.exp(-(diffDays - 1) * 0.18 * decayFactor);

            // Video-unique seed so every video has its own distinct signature
            const r1 = getDeterministicRandom(d.date, vSeed + 11);
            const r2 = getDeterministicRandom(d.date, vSeed + 22);
            const r3 = getDeterministicRandom(d.date, vSeed + 33);

            let algo = 0;
            if (r1 > 0.80) algo = (1.6 + r2 * 2.0) * algoFreq;
            else if (r1 > 0.56) algo = (0.5 + r2 * 0.9) * algoFreq;

            const jitterSpread = Math.min(1.4, 0.70 * vSpikiness);
            const jitter = Math.max(0.25, (1.0 - jitterSpread / 2) + r3 * jitterSpread);
            return base * (1.0 + algo) * jitter;
          });

          const videoRealtime48h = (targetVideo?.realtimeViews48h !== undefined && targetVideo?.realtimeViews48h !== null && Number(targetVideo.realtimeViews48h) > 0)
            ? Number(targetVideo.realtimeViews48h)
            : Math.max(10, Math.round(videoViews * 0.055));
          const targetVideoEndViews = Math.max(1, Math.round(videoRealtime48h * 0.50));

          const isPublishedArr = filteredDaily.map(d => numActive > 0 ? d.date >= pubDateStr : true);
          const computedVideoDailyViews = distributeWithRealtimeEnd(rawWeights, videoViews, targetVideoEndViews, isPublishedArr);

          const scaledDaily = filteredDaily.map((d, k) => {
            const isPublished = isPublishedArr[k];
            const dViews = computedVideoDailyViews[k] || 0;
            const ratio = (videoViews > 0 && isPublished) ? (dViews / videoViews) : 0;
            const dRev = isPublished ? parseFloat(((videoRevenue) * ratio).toFixed(2)) : 0;
            const dWatch = isPublished ? parseFloat(((videoWatchTime) * ratio).toFixed(1)) : 0;
            const dSubsNet = isPublished ? Math.round(videoSubsNet * ratio) : 0;
            const dSubsGained = isPublished ? Math.round(videoSubsGained * ratio) : 0;
            const dSubsLost = isPublished ? Math.round(videoSubsLost * ratio) : 0;

            return {
              ...d,
              views: dViews,
              revenue: dRev,
              watchTimeHrs: dWatch,
              subscribersNet: dSubsNet,
              subscribersGained: dSubsGained,
              subscribersLost: dSubsLost,
              impressions: isPublished ? Math.round(videoImpressions * ratio) : 0,
              ctr: isPublished ? videoCtr : 0,
            };
          });

          return {
            dateRangeLabel: formattedDateRange,
            daily: scaledDaily,
            aggregated: {
              ...agg,
              views: videoViews,
              viewsFormatted: targetVideo?.viewsFormatted || fmtV(videoViews),
              watchTimeHrs: videoWatchTime,
              watchTimeHrsFormatted: targetVideo?.watchTimeHrsFormatted || fmtW(videoWatchTime),
              revenue: videoRevenue,
              revenueFormatted: targetVideo?.revenueFormatted ? formatINR(targetVideo.revenueFormatted) : formatINR(videoRevenue),
              subscribersNet: videoSubsNet,
              subscribersGained: videoSubsGained,
              subscribersLost: videoSubsLost,
              subscribersNetFormatted: targetVideo?.subscribersNetFormatted || fmtS(videoSubsNet),
              subscribersGainedFormatted: targetVideo?.subscribersGainedFormatted || fmtS(videoSubsGained),
              impressions: videoImpressions,
              impressionsFormatted: fmtV(videoImpressions),
              rpm: videoRpm,
              cpm: targetVideo?.cpm ? Number(targetVideo.cpm) : 58.00,
              ctr: videoCtr
            },
            trafficSources: getTrafficSources(videoViews),
            audience: getAudienceBreakdown(videoViews)
          };
        }

        // ── Channel analytics: always derive from actual video store data ──
        const storeVideos = state.videos || [];
        const currentTotalViews = storeVideos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
        const currentTotalRevenue = storeVideos.reduce((acc, v) => acc + (v.revenue != null ? Number(v.revenue) : ((Number(v.views) || 0) / 1000 * (Number(v.rpm) || 33.64))), 0);
        const currentTotalWatch = storeVideos.reduce((acc, v) => acc + (v.watchTimeHrs != null ? Number(v.watchTimeHrs) : ((Number(v.views) || 0) * (Number(v.avgViewDurationSecs) || 105) / 3600)), 0);
        const scaledSubsGained = storeVideos.reduce((acc, v) => acc + Number(v.subscribersGained !== undefined ? v.subscribersGained : (v.netSubscribers !== undefined ? v.netSubscribers : (v.subscribers || 0))), 0) || Math.round(agg.subscribersNet);
        const scaledSubsLost   = 0;
        const scaledSubsNet    = scaledSubsGained;

        const ci = state.channelInfo || {};
        const is28Days = (activeKey === 'last28');
        
        // Dynamic channel totals directly from actual video sums or explicit CRM metrics
        const base28Views   = (ci.hasExplicitChannelMetrics && ci.viewsLast28Days !== undefined && ci.viewsLast28Days > 0) ? ci.viewsLast28Days : currentTotalViews;
        const base28Revenue = (ci.hasExplicitChannelMetrics && ci.revenueLast28Days !== undefined && ci.revenueLast28Days > 0) ? ci.revenueLast28Days : currentTotalRevenue;
        const base28Watch   = (ci.hasExplicitChannelMetrics && ci.watchTimeLast28Days !== undefined && ci.watchTimeLast28Days > 0) ? ci.watchTimeLast28Days : currentTotalWatch;
        const base28SubsNet = (ci.hasExplicitChannelMetrics && ci.subscribersGainedLast28Days !== undefined && ci.subscribersGainedLast28Days > 0) ? ci.subscribersGainedLast28Days : scaledSubsNet;

        const finalViews   = is28Days ? base28Views : Math.round(base28Views * (agg.views / (INITIAL_AGG.views || 1)));
        const finalRevenue = is28Days ? base28Revenue : parseFloat((base28Revenue * (agg.revenue / (INITIAL_AGG.revenue || 1))).toFixed(2));
        const finalWatch   = is28Days ? base28Watch : parseFloat((base28Watch * (agg.watchTimeHrs / (INITIAL_AGG.watchTimeHrs || 1))).toFixed(1));
        const finalSubsNet = is28Days ? base28SubsNet : Math.round(base28SubsNet * (agg.subscribersNet / (INITIAL_AGG.subscribersNet || 1)));
        const finalImpressions = Math.round(finalViews * 11.2);

        const viewsFmt = (is28Days && ci.hasExplicitChannelMetrics && ci.viewsLast28DaysFormatted) ? ci.viewsLast28DaysFormatted : fmtV(finalViews);
        const watchFmt = (is28Days && ci.hasExplicitChannelMetrics && ci.watchTimeLast28DaysFormatted) ? ci.watchTimeLast28DaysFormatted : fmtW(finalWatch);
        const revFmt   = (is28Days && ci.hasExplicitChannelMetrics && ci.revenueLast28DaysFormatted) ? formatINR(ci.revenueLast28DaysFormatted) : formatINR(finalRevenue);
        const subsFmt  = (is28Days && ci.hasExplicitChannelMetrics && ci.subscribersGainedLast28DaysFormatted) ? ci.subscribersGainedLast28DaysFormatted : fmtS(finalSubsNet);

        // Calculate target end views for channel from 48h realtime views velocity
        const channelRealtime48h = (ci.realtimeViews48h !== undefined && ci.realtimeViews48h !== null && Number(ci.realtimeViews48h) > 0)
          ? Number(ci.realtimeViews48h)
          : (storeVideos.reduce((acc, v) => acc + (Number(v.realtimeViews48h) || 0), 0) || Math.max(100, Math.round(finalViews * 0.055)));
        const targetChannelEndViews = Math.max(1, Math.round(channelRealtime48h * 0.50));

        const channelWeights = filteredDaily.map(d => Math.max(0.01, d.views || 1));
        const computedChannelDailyViews = distributeWithRealtimeEnd(channelWeights, finalViews, targetChannelEndViews, null);

        const scaledDaily = filteredDaily.map((d, k) => {
          const dViews = computedChannelDailyViews[k] || 0;
          const w = finalViews > 0 ? (dViews / finalViews) : (1 / (filteredDaily.length || 1));
          return {
            ...d,
            views:          dViews,
            revenue:        parseFloat((finalRevenue * w).toFixed(2)),
            watchTimeHrs:   parseFloat((finalWatch   * w).toFixed(1)),
            subscribersNet: Math.round(finalSubsNet  * w),
            impressions:    Math.round(finalImpressions * w),
            ctr:            agg.ctr || 8.9,
          };
        });

        return {
          dateRangeLabel: formattedDateRange,
          daily: scaledDaily,
          aggregated: {
            ...agg,
            views:                   finalViews,
            viewsFormatted:          viewsFmt,
            watchTimeHrs:            finalWatch,
            watchTimeHrsFormatted:   watchFmt,
            revenue:                 finalRevenue,
            revenueFormatted:        revFmt,
            subscribersNet:          finalSubsNet,
            subscribersNetFormatted: subsFmt,
            subscribersGained:       finalSubsNet,
            subscribersGainedFormatted: subsFmt,
            subscribersLost:         scaledSubsLost,
            impressions:             finalImpressions,
            impressionsFormatted:    fmtV(finalImpressions),
            ctr:                     agg.ctr || 8.9,
            rpm:                     finalViews > 0 ? parseFloat(((finalRevenue / finalViews) * 1000).toFixed(2)) : (agg.rpm || 33.64),
            cpm:                     agg.cpm || 58.00,
          },
          trafficSources: getTrafficSources(finalViews),
          audience:       getAudienceBreakdown(finalViews),
        };
      },

      loadFromSpreadsheet: async (silent = false, fromLiveSync = false) => {
        if (get().isSpreadsheetLoading && !fromLiveSync) return;
        set({ isSpreadsheetLoading: true, spreadsheetError: null });

        try {
          const [data, status] = await Promise.all([
            SpreadsheetDataService.getData(),
            SpreadsheetDataService.getStatus()
          ]);

          const parsedData = applySpreadsheetData(data);
          const currentStore = get();
          const hasCrm = currentStore.hasCrmOverrides;

          if (hasCrm) {
            set({
              mode: 'spreadsheet',
              isSpreadsheetLoading: false,
              lastSpreadsheetSync: status.lastLoadedAt || new Date().toISOString(),
              spreadsheetConfig: {
                source: status.source,
                excelPath: status.excelPath,
                googleSheetsId: status.googleSheetsId,
                autoRefreshInterval: status.autoRefreshInterval,
                liveSync: status.liveSync
              },
              spreadsheetError: null
            });
            return;
          }

          set({
            ...parsedData,
            hasCrmOverrides: false,
            mode: 'spreadsheet',
            isSpreadsheetLoading: false,
            lastSpreadsheetSync: status.lastLoadedAt || new Date().toISOString(),
            spreadsheetConfig: {
              source: status.source,
              excelPath: status.excelPath,
              googleSheetsId: status.googleSheetsId,
              autoRefreshInterval: status.autoRefreshInterval,
              liveSync: status.liveSync
            },
            spreadsheetError: null
          });

          if (!silent) {
            get().showToast('Spreadsheet data loaded', 'success');
          }
        } catch (err) {
          console.error('Spreadsheet load error:', err);
          set({
            isSpreadsheetLoading: false,
            spreadsheetError: err.message
          });
          if (!silent) {
            get().showToast(`Spreadsheet load failed: ${err.message}`, 'warning');
          }
        }
      },

      refreshSpreadsheet: async () => {
        set({ isSpreadsheetLoading: true });
        try {
          await SpreadsheetDataService.refresh();
          await get().loadFromSpreadsheet(true);
          get().showToast('Spreadsheet refreshed successfully', 'success');
        } catch (err) {
          set({ isSpreadsheetLoading: false, spreadsheetError: err.message });
          get().showToast(`Refresh failed: ${err.message}`, 'warning');
        }
      },

      updateSpreadsheetConfig: async (config) => {
        try {
          await SpreadsheetDataService.updateConfig(config);
          await get().loadFromSpreadsheet(true);
          get().showToast('Spreadsheet configuration updated', 'success');
        } catch (err) {
          get().showToast(`Config update failed: ${err.message}`, 'warning');
        }
      },

      addVideo: (newVid) => set((state) => {
        const videoObj = {
          id: `v${Date.now()}`,
          views: 0,
          viewsFormatted: '0',
          comments: 0,
          likes: 0,
          date: new Date().toISOString().split('T')[0],
          restrictions: 'None',
          monetization: true,
          type: 'video',
          visibility: 'Private',
          ...newVid
        };
        return {
          videos: [videoObj, ...state.videos],
          channelInfo: {
            ...state.channelInfo,
            totalUploads: state.videos.length + 1
          }
        };
      }),

      updateVideo: (id, updates) => set((state) => ({
        videos: state.videos.map(v => v.id === id ? { ...v, ...updates } : v)
      })),

      deleteVideo: (id) => set((state) => ({
        videos: state.videos.filter(v => v.id !== id),
        comments: state.comments.filter(c => c.videoId !== id),
        subtitles: state.subtitles.filter(s => s.videoId !== id),
        copyrightClaims: state.copyrightClaims.filter(c => c.videoId !== id)
      })),

      bulkDeleteVideos: (ids) => set((state) => ({
        videos: state.videos.filter(v => !ids.includes(v.id))
      })),

      bulkUpdateVisibility: (ids, visibility) => set((state) => ({
        videos: state.videos.map(v => ids.includes(v.id) ? { ...v, visibility } : v)
      })),

      addPlaylist: (title) => set((state) => ({
        playlists: [
          { id: `pl${Date.now()}`, title, videoCount: 0, visibility: 'Public', lastUpdated: 'Just now' },
          ...state.playlists
        ]
      })),

      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter(p => p.id !== id)
      })),

      addCommentReply: (commentId, replyText) => set((state) => ({
        comments: state.comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `r_${Date.now()}`,
                  author: state.channelInfo.name,
                  authorAvatar: state.channelInfo.avatar,
                  time: 'Just now',
                  text: replyText
                }
              ]
            };
          }
          return c;
        })
      })),

      toggleCommentHeart: (commentId) => set((state) => ({
        comments: state.comments.map(c => c.id === commentId ? { ...c, heart: !c.heart } : c)
      })),

      toggleCommentLike: (commentId) => set((state) => ({
        comments: state.comments.map(c => c.id === commentId ? { ...c, likes: c.likes + (c.userLiked ? -1 : 1), userLiked: !c.userLiked } : c)
      })),

      deleteComment: (commentId) => set((state) => ({
        comments: state.comments.filter(c => c.id !== commentId)
      })),

      hideUserFromChannel: (authorName) => set((state) => ({
        comments: state.comments.filter(c => c.author !== authorName),
        settings: {
          ...state.settings,
          blockedWords: (state.settings.blockedWords || '') + `, ${authorName}`
        }
      })),

      updateSubtitles: (id, updates) => set((state) => ({
        subtitles: state.subtitles.map(s => s.id === id ? { ...s, ...updates } : s)
      })),

      resolveCopyrightClaim: (claimId) => set((state) => ({
        copyrightClaims: state.copyrightClaims.map(c => c.id === claimId ? { ...c, status: 'Resolved', impact: 'Claim Released' } : c)
      })),

      toggleStarAudioTrack: (trackId) => set((state) => ({
        audioTracks: state.audioTracks.map(t => t.id === trackId ? { ...t, starred: !t.starred } : t)
      })),

      updateChannelInfo: (updates) => set((state) => ({
        channelInfo: { ...state.channelInfo, ...updates }
      })),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),

      // ─── CRM Actions ───────────────────────────────────────────────────
      // Update a single video's numeric metrics, subscriber gain, AVD & thumbnail
      updateVideoMetrics: (id, updates) => {
        set((state) => {
          const updatedVideos = state.videos.map(v => {
            if (String(v.id) !== String(id)) return v;
            const merged = { ...v, ...updates };
            const views = Number(updates.views !== undefined ? updates.views : (v.views ?? 0));
            const rpm = Number(updates.rpm !== undefined ? updates.rpm : (v.rpm ?? 33.64));
            const revenue = updates.revenue !== undefined && updates.revenue !== null && Number(updates.revenue) > 0
              ? Number(updates.revenue)
              : parseFloat(((views / 1000) * rpm).toFixed(2));
            const likes = Number(updates.likes !== undefined ? updates.likes : (v.likes ?? Math.round(views * 0.046)));
            const comments = Number(updates.comments !== undefined ? updates.comments : (v.comments ?? Math.round(views * 0.0034)));
            const subsGained = Number(updates.subscribersGained !== undefined ? updates.subscribersGained : (updates.subscribers !== undefined ? updates.subscribers : (v.subscribersGained ?? v.subscribers ?? Math.round(views * 0.014))));
            const subsLost = 0;
            const netSubs = subsGained;
            const thumbnail = updates.thumbnail !== undefined ? updates.thumbnail : v.thumbnail;

            // Handle Video Duration & Average View Timing (AVD)
            const durationSecs = updates.durationSecs !== undefined
              ? Number(updates.durationSecs)
              : (updates.duration !== undefined ? parseAvdToSeconds(updates.duration, v.durationSecs || 618) : (v.durationSecs || 618));
            const duration = updates.duration !== undefined
              ? updates.duration
              : (updates.durationSecs !== undefined ? formatSecondsToAvd(durationSecs) : (v.duration || formatSecondsToAvd(durationSecs)));

            const avgViewDurationSecs = updates.avgViewDurationSecs !== undefined
              ? Number(updates.avgViewDurationSecs)
              : (updates.avgViewDuration !== undefined ? parseAvdToSeconds(updates.avgViewDuration, v.avgViewDurationSecs || 105) : (v.avgViewDurationSecs || 105));
            const avgViewDuration = updates.avgViewDuration !== undefined
              ? updates.avgViewDuration
              : (updates.avgViewDurationSecs !== undefined ? formatSecondsToAvd(avgViewDurationSecs) : (v.avgViewDuration || formatSecondsToAvd(avgViewDurationSecs)));
            const watchTimeHrs = (updates.watchTimeHrs !== undefined && Number(updates.watchTimeHrs) > 0)
              ? Number(updates.watchTimeHrs)
              : parseFloat(((views * avgViewDurationSecs) / 3600).toFixed(1));

            // Handle Video Publish Date
            const publishDate = updates.publishDate !== undefined ? updates.publishDate : (updates.date !== undefined ? updates.date : (v.publishDate || v.date || '2026-08-16'));

            return {
              ...merged,
              publishDate,
              date: publishDate,
              thumbnail,
              duration,
              durationSecs,
              rpm,
              views,
              revenue,
              likes,
              comments,
              avgViewDuration,
              avgViewDurationSecs,
              avd: avgViewDuration,
              watchTimeHrs,
              subscribersGained: subsGained,
              subscribersLost: subsLost,
              netSubscribers: netSubs,
              subscribersNet: netSubs,
              viewsFormatted: fmtV(views),
              revenueFormatted: formatINR(revenue),
              watchTimeHrsFormatted: fmtW(watchTimeHrs),
              subscribersNetFormatted: fmtS(netSubs),
              subscribersGainedFormatted: fmtS(subsGained),
              realtimeViews48h: updates.realtimeViews48h !== undefined ? Number(updates.realtimeViews48h) : (v.realtimeViews48h || Math.round(views * 0.0055)),
              realtimeViews60m: updates.realtimeViews60m !== undefined ? Number(updates.realtimeViews60m) : (v.realtimeViews60m || Math.round(views * 0.0006)),
              realtimeTrafficSources: updates.realtimeTrafficSources || v.realtimeTrafficSources || null
            };
          });

          // Sort updatedVideos strictly newest to oldest (descending by publishDate)
          updatedVideos.sort((a, b) => {
            const dateA = a.publishDate || a.date || '';
            const dateB = b.publishDate || b.date || '';
            if (dateA && dateB && dateA !== dateB) {
              return dateB.localeCompare(dateA);
            }
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          });

          const totalViews = updatedVideos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
          const totalRevenue = updatedVideos.reduce((acc, v) => acc + (v.revenue != null ? Number(v.revenue) : ((Number(v.views) || 0) / 1000 * (Number(v.rpm) || 33.64))), 0);
          const totalWatch = updatedVideos.reduce((acc, v) => acc + (v.watchTimeHrs != null ? Number(v.watchTimeHrs) : ((Number(v.views) || 0) * (Number(v.avgViewDurationSecs) || 105) / 3600)), 0);
          const totalSubsGained = updatedVideos.reduce((acc, v) => acc + (Number(v.subscribersGained) || 0), 0);
          const totalSubsLost = updatedVideos.reduce((acc, v) => acc + (Number(v.subscribersLost) || 0), 0);
          const netSubs = totalSubsGained - totalSubsLost;
          const ci = state.channelInfo || {};
          const preserveExplicit = Boolean(ci.hasExplicitChannelMetrics);

          return {
            hasCrmOverrides: true,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1,
            videos: updatedVideos,
            channelInfo: {
              ...ci,
              totalViews: (preserveExplicit && ci.totalViews) ? ci.totalViews : totalViews,
              lifetimeViewsFormatted: (preserveExplicit && ci.lifetimeViewsFormatted) ? ci.lifetimeViewsFormatted : fmtV(totalViews),
              totalRevenue: (preserveExplicit && ci.totalRevenue) ? ci.totalRevenue : totalRevenue,
              totalRevenueFormatted: (preserveExplicit && ci.totalRevenueFormatted) ? ci.totalRevenueFormatted : formatINR(totalRevenue),
              viewsLast28Days: (preserveExplicit && ci.viewsLast28Days) ? ci.viewsLast28Days : totalViews,
              viewsLast28DaysFormatted: (preserveExplicit && ci.viewsLast28DaysFormatted) ? ci.viewsLast28DaysFormatted : fmtV(totalViews),
              revenueLast28Days: (preserveExplicit && ci.revenueLast28Days) ? ci.revenueLast28Days : parseFloat(totalRevenue.toFixed(2)),
              revenueLast28DaysFormatted: (preserveExplicit && ci.revenueLast28DaysFormatted) ? ci.revenueLast28DaysFormatted : formatINR(totalRevenue),
              watchTimeLast28Days: (preserveExplicit && ci.watchTimeLast28Days) ? ci.watchTimeLast28Days : parseFloat(totalWatch.toFixed(1)),
              watchTimeLast28DaysFormatted: (preserveExplicit && ci.watchTimeLast28DaysFormatted) ? ci.watchTimeLast28DaysFormatted : fmtW(totalWatch),
              subscribersGainedLast28Days: (preserveExplicit && ci.subscribersGainedLast28Days !== undefined) ? ci.subscribersGainedLast28Days : netSubs,
              subscribersGainedLast28DaysFormatted: (preserveExplicit && ci.subscribersGainedLast28DaysFormatted) ? ci.subscribersGainedLast28DaysFormatted : fmtS(netSubs),
              hasExplicitChannelMetrics: preserveExplicit
            }
          };
        });
        get().persistToDatabase();
      },

      // Update channel-level CRM metrics (subscribers, views, revenue, RPM …)
      crmUpdateChannelMetrics: (updates) => {
        set((state) => {
          const subs = updates.subscribers !== undefined ? Number(updates.subscribers) : state.channelInfo.subscribers;
          const subsGained = updates.subscribersGainedLast28Days !== undefined ? Number(updates.subscribersGainedLast28Days) : (state.channelInfo.subscribersGainedLast28Days || 0);
          const views28 = updates.viewsLast28Days !== undefined ? Number(updates.viewsLast28Days) : (state.channelInfo.viewsLast28Days || 0);
          const watchTime28 = updates.watchTimeLast28Days !== undefined ? Number(updates.watchTimeLast28Days) : (state.channelInfo.watchTimeLast28Days || 0);
          const revenue28 = updates.revenueLast28Days !== undefined ? Number(updates.revenueLast28Days) : (state.channelInfo.revenueLast28Days || 0);

          return {
            hasCrmOverrides: true,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1,
            channelInfo: {
              ...state.channelInfo,
              ...updates,
              hasExplicitChannelMetrics: true,
              subscribers: subs,
              subscribersFormatted: subs ? subs.toLocaleString('en-IN') : '0',
              subscribersGainedLast28Days: subsGained,
              subscribersGainedLast28DaysFormatted: fmtS(subsGained),
              viewsLast28Days: views28,
              viewsLast28DaysFormatted: fmtV(views28),
              watchTimeLast28Days: watchTime28,
              watchTimeLast28DaysFormatted: fmtW(watchTime28),
              revenueLast28Days: revenue28,
              revenueLast28DaysFormatted: formatINR(revenue28),
              realtimeSubscribers: updates.realtimeSubscribers !== undefined ? Number(updates.realtimeSubscribers) : (state.channelInfo.realtimeSubscribers || subs),
              realtimeViews48h: updates.realtimeViews48h !== undefined ? Number(updates.realtimeViews48h) : (state.channelInfo.realtimeViews48h || Math.round(views28 * 0.0056)),
              realtimeViews60m: updates.realtimeViews60m !== undefined ? Number(updates.realtimeViews60m) : (state.channelInfo.realtimeViews60m || Math.round(views28 * 0.0006))
            }
          };
        });
        get().persistToDatabase();
      },

      // Set a single RPM across all videos and recalculate revenues
      bulkSetVideoRPM: (rpm) => {
        set((state) => {
          const r = Number(rpm);
          const updatedVideos = state.videos.map(v => {
            const views = Number(v.views) || 0;
            const revenue = (views / 1000) * r;
            return {
              ...v,
              rpm: r,
              revenue,
              revenueFormatted: formatINR(revenue)
            };
          });
          const totalViews = updatedVideos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
          const totalRevenue = updatedVideos.reduce((acc, v) => acc + (v.revenue != null ? Number(v.revenue) : ((Number(v.views) || 0) / 1000 * r)), 0);
          const totalWatch = updatedVideos.reduce((acc, v) => acc + (v.watchTimeHrs != null ? Number(v.watchTimeHrs) : ((Number(v.views) || 0) * (Number(v.avgViewDurationSecs) || 105) / 3600)), 0);
          return {
            hasCrmOverrides: true,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1,
            videos: updatedVideos,
            channelInfo: {
              ...state.channelInfo,
              totalRevenue,
              totalRevenueFormatted: formatINR(totalRevenue),
              revenueLast28Days: parseFloat(totalRevenue.toFixed(2)),
              revenueLast28DaysFormatted: formatINR(totalRevenue),
              viewsLast28Days: totalViews,
              viewsLast28DaysFormatted: fmtV(totalViews),
              watchTimeLast28Days: parseFloat(totalWatch.toFixed(1)),
              watchTimeLast28DaysFormatted: fmtW(totalWatch)
            }
          };
        });
        get().persistToDatabase();
      },

      // Multiply all video views by a factor (e.g. 1.2 = +20%)
      bulkMultiplyViews: (factor) => {
        set((state) => {
          const f = Number(factor) || 1;
          const updatedVideos = state.videos.map(v => {
            const views = Math.round((Number(v.views) || 0) * f);
            const rpm = Number(v.rpm) || 33.64;
            const revenue = (views / 1000) * rpm;
            const avgViewDurationSecs = Number(v.avgViewDurationSecs) || 105;
            const watchTimeHrs = parseFloat(((views * avgViewDurationSecs) / 3600).toFixed(1));
            return {
              ...v,
              views,
              viewsFormatted: fmtV(views),
              revenue,
              revenueFormatted: formatINR(revenue),
              watchTimeHrs
            };
          });
          const totalViews = updatedVideos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
          const totalRevenue = updatedVideos.reduce((acc, v) => acc + (v.revenue != null ? Number(v.revenue) : ((Number(v.views) || 0) / 1000 * (Number(v.rpm) || 33.64))), 0);
          const totalWatch = updatedVideos.reduce((acc, v) => acc + (v.watchTimeHrs != null ? Number(v.watchTimeHrs) : ((Number(v.views) || 0) * (Number(v.avgViewDurationSecs) || 105) / 3600)), 0);
          return {
            hasCrmOverrides: true,
            dateRangeVersion: (state.dateRangeVersion || 0) + 1,
            videos: updatedVideos,
            channelInfo: {
              ...state.channelInfo,
              totalViews,
              lifetimeViewsFormatted: fmtV(totalViews),
              totalRevenue,
              totalRevenueFormatted: formatINR(totalRevenue),
              viewsLast28Days: totalViews,
              viewsLast28DaysFormatted: fmtV(totalViews),
              revenueLast28Days: parseFloat(totalRevenue.toFixed(2)),
              revenueLast28DaysFormatted: formatINR(totalRevenue),
              watchTimeLast28Days: parseFloat(totalWatch.toFixed(1)),
              watchTimeLast28DaysFormatted: fmtW(totalWatch)
            }
          };
        });
        get().persistToDatabase();
      },

      // Apply preset scenarios or import JSON
      crmApplyPreset: (presetKey) => {
        set((state) => {
          const fmt = (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
          const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          if (presetKey === 'viral') {
            const subs = 25000000;
            const subsGained = 1200000;
            const views = 45000000;
            const watchTime = 180000;
            const revenue = 185000.00;
            return {
              hasCrmOverrides: true,
              channelInfo: {
                ...state.channelInfo,
                subscribers: subs,
                subscribersFormatted: fmt(subs),
                subscribersGainedLast28Days: subsGained,
                subscribersGainedLast28DaysFormatted: `+${fmt(subsGained)}`,
                viewsLast28Days: views,
                viewsLast28DaysFormatted: fmt(views),
                watchTimeLast28Days: watchTime,
                watchTimeLast28DaysFormatted: fmt(watchTime),
                revenueLast28Days: revenue,
                revenueLast28DaysFormatted: fmtINR(revenue),
                hasExplicitChannelMetrics: true
              },
              videos: state.videos.map(v => {
                const newViews = v.views * 5;
                const newRpm = 45.00;
                const newRev = (newViews / 1000) * newRpm;
                return {
                  ...v,
                  views: newViews,
                  viewsFormatted: fmt(newViews),
                  rpm: newRpm,
                  revenue: newRev,
                  revenueFormatted: fmtINR(newRev)
                };
              })
            };
          }

          if (presetKey === 'high_rpm') {
            return {
              hasCrmOverrides: true,
              videos: state.videos.map(v => {
                const newRpm = 85.50;
                const newRev = (v.views / 1000) * newRpm;
                return {
                  ...v,
                  rpm: newRpm,
                  revenue: newRev,
                  revenueFormatted: fmtINR(newRev)
                };
              })
            };
          }

          return {};
        });
        get().persistToDatabase();
      },

      crmImportState: (newState) => set((state) => ({
        ...state,
        ...newState,
        hasCrmOverrides: true
      })),

      reloadFromSpreadsheet: () => {
        set({ hasCrmOverrides: false });
        return get().refreshSpreadsheet();
      }
    }),
    {
      name: 'yt-studio-analytics-v35',
      storage: createJSONStorage(() => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.simulationAnchorDate = '2026-10-16';
          state.customStartDate = '2026-09-05';
          state.customEndDate = '2026-10-16';
          if (state.channelInfo) {
            if (state.channelInfo.revenueLast28DaysFormatted) {
              state.channelInfo.revenueLast28DaysFormatted = formatINR(state.channelInfo.revenueLast28DaysFormatted);
            }
            if (state.channelInfo.totalRevenueFormatted) {
              state.channelInfo.totalRevenueFormatted = formatINR(state.channelInfo.totalRevenueFormatted);
            }
            state.channelInfo.currency = 'INR';
          }
          if (state.videos && Array.isArray(state.videos)) {
            const normalized = state.videos.map((v, idx) => {
              const scheduledDate = TITLE_TO_SCHEDULE_DATE[v.title] || VIDEO_ID_TO_DATE[v.id] || VIDEO_PUBLISH_SCHEDULE[idx] || '2026-07-21';
              const pubDate = v.publishDate || v.date || scheduledDate;
              const subsGained = Number(v.subscribersGained !== undefined ? v.subscribersGained : (v.subscribers || 0));
              const netSubs = Number(v.netSubscribers !== undefined ? v.netSubscribers : subsGained);
              return {
                ...v,
                publishDate: pubDate,
                date: pubDate,
                sortOrder: v.sortOrder !== undefined ? v.sortOrder : idx + 1,
                revenueFormatted: formatINR(v.revenueFormatted || v.revenue),
                subscribersNetFormatted: fmtS(netSubs),
                subscribersGainedFormatted: fmtS(subsGained),
                viewsFormatted: fmtV(v.views),
                watchTimeHrsFormatted: fmtW(v.watchTimeHrs)
              };
            });
            // Sort descending strictly
            normalized.sort((a, b) => {
              const dateA = a.publishDate || a.date || '';
              const dateB = b.publishDate || b.date || '';
              if (dateA && dateB && dateA !== dateB) {
                return dateB.localeCompare(dateA);
              }
              return (a.sortOrder || 0) - (b.sortOrder || 0);
            });
            state.videos = normalized;
          }
          if (state.settings) {
            state.settings.currency = 'INR - Indian Rupee';
          }
        }
      },
      partialize: (state) => ({
        settings: state.settings,
        spreadsheetConfig: state.spreadsheetConfig,
        selectedDateRange: state.selectedDateRange,
        simulationAnchorDate: state.simulationAnchorDate,
        customStartDate: state.customStartDate,
        customEndDate: state.customEndDate,
        dateRangeVersion: state.dateRangeVersion,
        hasCrmOverrides: state.hasCrmOverrides,
        channelInfo: state.channelInfo,
        videos: state.videos,
        graphSettings: state.graphSettings
      })
    }
  )
);
