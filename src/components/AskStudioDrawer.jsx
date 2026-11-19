import React, { useEffect, useState } from 'react';
import { useStore, fmtV, formatINR } from '../store/useStore';
import { AskSparkleIcon } from './StudioIcons';
import {
  formatHoursValue,
  formatPctValue,
  getVideoRevenueFormatted,
} from '../pages/analytics/analyticsFormatters';
import './AskStudioDrawer.css';

const SUGGESTED_PROMPTS = [
  'Summarize my channel performance',
  'Catch me up on my latest video',
  'Analyze my audience loyalty',
  'Analyze title patterns of my top videos',
];

export function openAskStudio(prompt = '', videoId = null) {
  window.dispatchEvent(
    new CustomEvent('open-ask-studio', { detail: { prompt, videoId } })
  );
}

export default function AskStudioDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [targetVideoId, setTargetVideoId] = useState(null);
  const [messages, setMessages] = useState([]);

  const { channelInfo, videos, selectedDateRange, getAnalyticsForRange } = useStore();

  const activeRange = selectedDateRange || 'lifetime';
  const channelSnap = getAnalyticsForRange(activeRange);

  const buildStudioReply = (question, vId = targetVideoId) => {
    const q = (question || '').toLowerCase();
    const sorted = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));
    const topVideo = sorted[0] || videos[0];
    const latestVideo =
      videos.find((v) => v.id === vId) ||
      videos.find((v) => v.id === 'VID001') ||
      videos[0];

    const agg = channelSnap?.aggregated || {};
    const periodLabel = channelSnap?.dateRangeLabel || 'Selected period';

    if (q.includes('latest') || q.includes('catch me up') || vId) {
      const vSnap = latestVideo ? getAnalyticsForRange(activeRange, latestVideo.id)?.aggregated : null;
      if (!latestVideo) {
        return `No published videos found yet on ${channelInfo?.name || 'your channel'}.`;
      }
      return [
        `Here is your performance recap for "${latestVideo.title}":`,
        `• Views: ${latestVideo.viewsFormatted || fmtV(latestVideo.views)} (${vSnap?.viewsFormatted || fmtV(latestVideo.views)})`,
        `• Impressions click-through rate: ${formatPctValue(latestVideo.ctr ?? vSnap?.ctr, '6.2%')}`,
        `• Average view duration: ${latestVideo.avgViewDuration || latestVideo.avgDuration || '4:12'}`,
        `• Estimated revenue: ${getVideoRevenueFormatted(latestVideo)}`,
        `• Status: Ranked cleanly in your recent uploads; watch time growth is driven primarily by Browse features and Suggested videos.`,
      ].join('\n');
    }

    if (q.includes('loyalty') || q.includes('audience')) {
      const subs = agg.subscribersNetFormatted || '+0';
      const returnRate = '34.2%';
      return [
        `Audience loyalty insight for ${channelInfo?.name || 'your channel'} (${periodLabel}):`,
        `• Net new subscribers: ${subs} (Total: ${channelInfo?.subscribersFormatted || fmtV(channelInfo?.subscribers || 0)})`,
        `• Returning vs new viewers: ~${returnRate} returning viewers continue watching across multiple sessions.`,
        `• Top performing binge driver: "${topVideo?.title || 'Top upload'}" (${topVideo?.viewsFormatted || fmtV(topVideo?.views || 0)} views).`,
      ].join('\n');
    }

    if (q.includes('title') || q.includes('research') || q.includes('pattern')) {
      const top3 = sorted.slice(0, 3);
      return [
        `Title & topic pattern analysis across ${videos.length} uploads:`,
        ...top3.map(
          (v, idx) =>
            `${idx + 1}. "${v.title}" — ${v.viewsFormatted || fmtV(v.views)} views · ${formatPctValue(v.ctr, '6.5%')} CTR`
        ),
        `Insight: Concise emotional hooks with clear subject focus generate higher Browse CTR on ${channelInfo?.name || 'this channel'}.`,
      ].join('\n');
    }

    const wtFormatted = (agg.watchTimeHrsFormatted || formatHoursValue(agg.watchTimeHrs || 0)).replace(/\s*hrs\s*/gi, '');
    return [
      `${channelInfo?.name || 'Channel'} summary (${periodLabel}):`,
      `• Views: ${agg.viewsFormatted || fmtV(agg.views || 0)}`,
      `• Watch time: ${wtFormatted} hours`,
      `• Subscribers gained (net): ${agg.subscribersNetFormatted || '+0'}`,
      `• Estimated revenue: ${agg.revenueFormatted || formatINR(agg.revenue || 0)}`,
      topVideo
        ? `• Top video overall: "${topVideo.title}" (${topVideo.viewsFormatted || fmtV(topVideo.views)} views)`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  useEffect(() => {
    const handler = (e) => {
      const { prompt = '', videoId = null } = e.detail || {};
      setTargetVideoId(videoId);
      setIsOpen(true);
      if (prompt) {
        const reply = buildStudioReply(prompt, videoId);
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'user', text: prompt },
          { id: Date.now() + 1, role: 'assistant', text: reply },
        ]);
      } else if (messages.length === 0) {
        setMessages([
          {
            id: Date.now(),
            role: 'assistant',
            text: `Hi ${channelInfo?.name || 'Creator'}! Ask me anything about your channel insights, latest upload performance, audience loyalty, or revenue trends.`,
          },
        ]);
      }
    };
    window.addEventListener('open-ask-studio', handler);
    return () => window.removeEventListener('open-ask-studio', handler);
  });

  const handleSend = (textToSend) => {
    const query = (textToSend ?? inputVal).trim();
    if (!query) return;
    const reply = buildStudioReply(query, targetVideoId);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: query },
      { id: Date.now() + 1, role: 'assistant', text: reply },
    ]);
    setInputVal('');
  };

  if (!isOpen) return null;

  return (
    <div className="ask-studio-backdrop" onClick={() => setIsOpen(false)}>
      <aside className="ask-studio-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ask-studio-header">
          <div className="ask-studio-title">
            <AskSparkleIcon size={18} className="ask-sparkle-icon" />
            <span>Ask Studio</span>
            <span className="ask-beta-chip">Insights AI</span>
          </div>
          <button
            type="button"
            className="ask-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close Ask Studio"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="ask-studio-messages">
          {messages.map((m) => (
            <div key={m.id} className={`ask-msg ask-msg-${m.role}`}>
              <div className="ask-msg-bubble">
                {m.text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ask-studio-suggestions">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="ask-suggestion-chip"
              onClick={() => handleSend(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <form
          className="ask-studio-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask about your views, CTR, audience, or videos..."
          />
          <button type="submit" disabled={!inputVal.trim()} aria-label="Send">
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
        </form>
      </aside>
    </div>
  );
}
