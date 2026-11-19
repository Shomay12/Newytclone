import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, fmtV, fmtW, fmtS, formatINR } from '../store/useStore';
import { StudioUpBadge } from '../components/StudioBadges';
import { AskSparkleIcon } from '../components/StudioIcons';
import { openAskStudio } from '../components/AskStudioDrawer';
import UploadModal from '../components/UploadModal';
import {
  formatHoursValue,
  formatPctValue,
  formatPublishDate,
} from './analytics/analyticsFormatters';
import './Dashboard.css';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

const IDEAS_SLIDES = [
  {
    id: 'idea-1',
    title: 'Grow your audience and reach',
    body: 'Identify which topics keep returning viewers watching longer on your channel.',
    actionLabel: 'Get started',
    actionType: 'research',
  },
  {
    id: 'idea-2',
    title: 'Test thumbnails and titles together',
    body: 'Compare thumbnail variations in Video details to lift Browse click-through rate.',
    actionLabel: 'Open insights',
    actionType: 'ask',
  },
];

const NEWS_SLIDES = [
  {
    id: 'news-1',
    title: 'Updated insights & content tools',
    body: 'Explore streamlined Content, Audience, Revenue, and Research hubs directly from your channel navigation with Ask Studio insights built in.',
    actionLabel: 'Learn more',
    path: `${CHANNEL_PREFIX}/analytics/hub_overview`,
  },
  {
    id: 'news-2',
    title: 'Title & retention pattern breakdown',
    body: 'Use Ask Studio anywhere across Dashboard and Insights to summarize your latest uploads and viewer loyalty.',
    actionLabel: 'Learn more',
    path: 'ask',
  },
];

function CoinsIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="46" cy="58" rx="18" ry="7" fill="#FBC02D" stroke="#0f0f0f" strokeWidth="1.8" />
      <path d="M28 50v8c0 3.87 8.06 7 18 7s18-3.13 18-7v-8" fill="#FBC02D" stroke="#0f0f0f" strokeWidth="1.8" />
      <ellipse cx="46" cy="50" rx="18" ry="7" fill="#FDD835" stroke="#0f0f0f" strokeWidth="1.8" />
      <ellipse cx="38" cy="40" rx="18" ry="7" fill="#FDD835" stroke="#0f0f0f" strokeWidth="1.8" />
      <ellipse cx="46" cy="28" rx="16" ry="6.5" fill="#FFEE58" stroke="#0f0f0f" strokeWidth="1.8" />
      <circle cx="24" cy="24" r="2.2" fill="#0f0f0f" />
      <path d="M62 18l1.2 2.8L66 22l-2.8 1.2L62 26l-1.2-2.8L58 22l2.8-1.2L62 18z" fill="#0f0f0f" />
    </svg>
  );
}

function NewsBannerIllustration() {
  return (
    <svg viewBox="0 0 320 120" className="dash26-news-svg" aria-hidden="true">
      <rect width="320" height="120" rx="12" fill="#FFF7CC" />
      <circle cx="160" cy="60" r="36" fill="#FDE047" stroke="#0f0f0f" strokeWidth="2" />
      <circle cx="92" cy="42" r="14" fill="#FEF08A" stroke="#0f0f0f" strokeWidth="1.8" />
      <circle cx="228" cy="76" r="16" fill="#FACC15" stroke="#0f0f0f" strokeWidth="1.8" />
      <path d="M48 82c12-18 24-22 36-10M242 28c14 6 24 18 26 32" stroke="#0f0f0f" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M160 38v44M138 60h44" stroke="#0f0f0f" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    channelInfo,
    videos,
    comments,
    selectedDateRange,
    getAnalyticsForRange,
    tickRealtime,
    showToast,
  } = useStore();

  const [ideaIndex, setIdeaIndex] = useState(0);
  const [newsIndex, setNewsIndex] = useState(0);
  const [latestExpanded, setLatestExpanded] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLiveCountModal, setShowLiveCountModal] = useState(false);
  const [liveSubOffset, setLiveSubOffset] = useState(0);

  const channelSnap = getAnalyticsForRange(selectedDateRange || 'lifetime');
  const agg = channelSnap?.aggregated || {};

  const latestVideo = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    return videos[0];
  }, [videos]);

  const rankedByViews = useMemo(() => {
    const sorted = [...(videos || [])].sort((a, b) => (b.views || 0) - (a.views || 0));
    if (!latestVideo) return 1;
    const idx = sorted.findIndex((v) => v.id === latestVideo.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [videos, latestVideo]);

  const publishedVideos = useMemo(() => (videos || []).slice(1, 5), [videos]);

  // Preserve original top 3 realtime videos by sortOrder with exact realtimeViews48h values
  const topRealtimeVideos = useMemo(() => {
    return [...(videos || [])]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .slice(0, 3)
      .map((v) => ({
        id: v.id,
        title: v.title,
        views48h:
          v.realtimeViews48h !== undefined &&
          v.realtimeViews48h !== null &&
          Number(v.realtimeViews48h) > 0
            ? Number(v.realtimeViews48h)
            : Number(v.views || 0),
      }));
  }, [videos]);

  const recentComments = useMemo(
    () => (comments || []).filter((c) => c && c.status !== 'Held for review').slice(0, 3),
    [comments]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof tickRealtime === 'function') tickRealtime();
      if (showLiveCountModal) {
        setLiveSubOffset((prev) => prev + (Math.random() > 0.35 ? 1 : 0));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [tickRealtime, showLiveCountModal]);

  const currentIdea = IDEAS_SLIDES[ideaIndex % IDEAS_SLIDES.length];
  const currentNews = NEWS_SLIDES[newsIndex % NEWS_SLIDES.length];
  const liveSubCount = (channelInfo?.subscribers || 0) + liveSubOffset;

  // Original summary metrics from channelInfo (falling back to snapshot agg)
  const summaryViews =
    channelInfo?.viewsLast28DaysFormatted ||
    agg.viewsFormatted ||
    fmtV(channelInfo?.viewsLast28Days || agg.views || 0);
  const summaryWatchTime = (
    channelInfo?.watchTimeLast28DaysFormatted ||
    agg.watchTimeHrsFormatted ||
    (channelInfo?.watchTimeLast28Days ? fmtW(channelInfo.watchTimeLast28Days) : formatHoursValue(agg.watchTimeHrs || 0))
  ).replace(/\s*hrs\s*/gi, '');
  const summaryRevenueNum = channelInfo?.revenueLast28Days ?? agg.revenue ?? 0;
  const summaryRevenueFormatted = channelInfo?.revenueLast28DaysFormatted
    ? formatINR(channelInfo.revenueLast28DaysFormatted)
    : agg.revenueFormatted || formatINR(summaryRevenueNum);
  const summarySubsDelta =
    channelInfo?.subscribersGainedLast28DaysFormatted ||
    (channelInfo?.subscribersGainedLast28Days ? fmtS(channelInfo.subscribersGainedLast28Days) : agg.subscribersNetFormatted || '+0');

  const handleIdeaAction = () => {
    if (currentIdea.actionType === 'research') {
      navigate(`${CHANNEL_PREFIX}/analytics/hub_research`);
    } else {
      openAskStudio('Analyze title patterns of my top videos');
    }
  };

  const handleNewsAction = () => {
    if (currentNews.path === 'ask') {
      openAskStudio('Summarize my channel performance');
    } else {
      navigate(currentNews.path);
    }
  };

  return (
    <div className="dash26-page">
      {/* Page Header */}
      <div className="dash26-header">
        <h1 className="dash26-title yt-display-font">Channel dashboard</h1>
        <div className="dash26-header-actions">
          <button
            type="button"
            className="dash26-circle-btn"
            onClick={() => setShowUploadModal(true)}
            title="Upload videos"
            aria-label="Upload videos"
          >
            <span className="material-symbols-outlined">upload</span>
          </button>
          <button
            type="button"
            className="dash26-circle-btn"
            onClick={() => showToast('Go live studio panel ready', 'info')}
            title="Go live"
            aria-label="Go live"
          >
            <span className="material-symbols-outlined">sensors</span>
          </button>
          <button
            type="button"
            className="dash26-circle-btn"
            onClick={() => navigate(`${CHANNEL_PREFIX}/content/posts`)}
            title="Create post"
            aria-label="Create post"
          >
            <span className="material-symbols-outlined">edit_square</span>
          </button>
        </div>
      </div>

      {/* 3-Column Bento Grid */}
      <div className="dash26-bento">
        {/* Column 1 */}
        <div className="dash26-col">
          {/* Card: Latest Video Performance */}
          <section className="dash26-card">
            <h2 className="dash26-card-title">Latest video performance</h2>
            {latestVideo ? (
              <>
                <div
                  className="dash26-latest-thumb-wrap"
                  onClick={() => navigate(`${CHANNEL_PREFIX}/video/${latestVideo.id}/edit`)}
                >
                  <img
                    src={latestVideo.thumbnail || '/thumbnails/latest_video.png'}
                    alt={latestVideo.title}
                    className="dash26-latest-thumb"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/thumbnails/latest_video.png';
                    }}
                  />
                  <div className="dash26-latest-thumb-grad">
                    <p className="dash26-latest-thumb-title">{latestVideo.title}</p>
                  </div>
                </div>

                <div className="dash26-mini-stats-strip">
                  <div className="dash26-mini-stats-left">
                    <span title="Views">
                      <span className="material-symbols-outlined">bar_chart</span>
                      {latestVideo.viewsFormatted || fmtV(latestVideo.views || 0)}
                    </span>
                    <span title="Comments">
                      <span className="material-symbols-outlined">chat_bubble_outline</span>
                      {latestVideo.comments ?? latestVideo.commentsCount ?? 0}
                    </span>
                    <span title="Likes">
                      <span className="material-symbols-outlined">thumb_up_off_alt</span>
                      {latestVideo.likesFormatted || fmtV(latestVideo.likes || 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dash26-collapse-btn"
                    onClick={() => setLatestExpanded((v) => !v)}
                    aria-label="Toggle details"
                  >
                    <span className="material-symbols-outlined">
                      {latestExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                </div>

                {latestExpanded && (
                  <>
                    <p className="dash26-since-label">Published {formatPublishDate(latestVideo)}</p>

                    <div className="dash26-plain-rows">
                      <div
                        className="dash26-plain-row clickable"
                        onClick={() =>
                          navigate(`${CHANNEL_PREFIX}/video/${latestVideo.id}/analytics/hub_overview`)
                        }
                      >
                        <span className="dash26-row-name">Ranking by views</span>
                        <span className="dash26-row-val-group">
                          <span>
                            {rankedByViews} of {videos.length || 10}
                          </span>
                          <span className="material-symbols-outlined dash26-chevron">chevron_right</span>
                        </span>
                      </div>

                      <div className="dash26-plain-row">
                        <span className="dash26-row-name">Views</span>
                        <span className="dash26-row-val-group">
                          <span>{latestVideo.viewsFormatted || fmtV(latestVideo.views || 0)}</span>
                        </span>
                      </div>

                      <div className="dash26-plain-row">
                        <span className="dash26-row-name">Thumbnail click-through rate</span>
                        <span className="dash26-row-val-group">
                          <span>{formatPctValue(latestVideo.ctr, '8.9%')}</span>
                        </span>
                      </div>

                      <div className="dash26-plain-row">
                        <span className="dash26-row-name">Average view duration</span>
                        <span className="dash26-row-val-group">
                          <span>{latestVideo.avgViewDuration || latestVideo.avgDuration || '4:15'}</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="dash26-card-footer-row">
                  <button
                    type="button"
                    className="dash26-pill-btn"
                    onClick={() =>
                      openAskStudio('Catch me up on this video', latestVideo.id)
                    }
                  >
                    <AskSparkleIcon size={15} />
                    <span>Catch me up on this video</span>
                  </button>
                  <div className="dash26-round-icon-pair">
                    <button
                      type="button"
                      className="dash26-round-pill-icon"
                      title="Video insights"
                      onClick={() =>
                        navigate(`${CHANNEL_PREFIX}/video/${latestVideo.id}/analytics/hub_overview`)
                      }
                    >
                      <span className="material-symbols-outlined">insert_chart</span>
                    </button>
                    <button
                      type="button"
                      className="dash26-round-pill-icon"
                      title="Video comments"
                      onClick={() =>
                        navigate(`${CHANNEL_PREFIX}/video/${latestVideo.id}/comments`)
                      }
                    >
                      <span className="material-symbols-outlined">chat_bubble_outline</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="dash26-empty-note">Upload your first video to track performance here.</p>
            )}
          </section>

          {/* Card: Published Videos */}
          <section className="dash26-card">
            <h2 className="dash26-card-title">Published videos</h2>
            <div className="dash26-pub-list">
              {(publishedVideos.length > 0 ? publishedVideos : videos.slice(0, 4)).map((v) => (
                <div
                  key={v.id}
                  className="dash26-pub-item"
                  onClick={() => navigate(`${CHANNEL_PREFIX}/video/${v.id}/edit`)}
                >
                  <div className="dash26-pub-thumb-box">
                    <img
                      src={v.thumbnail || '/thumbnails/latest_video.png'}
                      alt={v.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/thumbnails/latest_video.png';
                      }}
                    />
                  </div>
                  <div className="dash26-pub-info">
                    <p className="dash26-pub-title">{v.title}</p>
                    <div className="dash26-pub-metrics">
                      <span>
                        <span className="material-symbols-outlined">bar_chart</span>
                        {v.viewsFormatted || fmtV(v.views || 0)}
                      </span>
                      <span>
                        <span className="material-symbols-outlined">chat_bubble_outline</span>
                        {v.comments ?? v.commentsCount ?? 0}
                      </span>
                      <span>
                        <span className="material-symbols-outlined">thumb_up_off_alt</span>
                        {v.likesFormatted || fmtV(v.likes || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="dash26-pill-btn"
              onClick={() => navigate(`${CHANNEL_PREFIX}/content/videos`)}
            >
              Go to videos
            </button>
          </section>
        </div>

        {/* Column 2 */}
        <div className="dash26-col">
          {/* Card: Channel Analytics */}
          <section className="dash26-card">
            <h2 className="dash26-card-title">Channel analytics</h2>
            <p className="dash26-sub-label">Current subscribers</p>
            <div className="dash26-huge-subs yt-display-font">
              {channelInfo?.subscribersFormatted ||
                (channelInfo?.subscribers ? channelInfo.subscribers.toLocaleString('en-IN') : '0')}
            </div>
            <p className="dash26-subs-delta">
              {summarySubsDelta} in last 28 days
            </p>
            <button
              type="button"
              className="dash26-pill-btn dash26-mb-20"
              onClick={() => setShowLiveCountModal(true)}
            >
              View live count
            </button>

            <div className="dash26-divider" />

            <h3 className="dash26-sec-title">Summary</h3>
            <p className="dash26-sec-sub">Last 28 days</p>
            <div className="dash26-summary-rows">
              <div className="dash26-summary-row">
                <span>Views</span>
                <span className="dash26-row-val-group">
                  <span>{summaryViews}</span>
                  <StudioUpBadge />
                </span>
              </div>
              <div className="dash26-summary-row">
                <span>Watch time (hours)</span>
                <span className="dash26-row-val-group">
                  <span>{summaryWatchTime}</span>
                  <StudioUpBadge />
                </span>
              </div>
              {summaryRevenueNum > 0 && (
                <div className="dash26-summary-row">
                  <span>Estimated revenue</span>
                  <span className="dash26-row-val-group">
                    <span>{summaryRevenueFormatted}</span>
                    <StudioUpBadge />
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="dash26-pill-btn dash26-mb-20"
              onClick={() => navigate(`${CHANNEL_PREFIX}/analytics/hub_overview`)}
            >
              Go to channel insights
            </button>

            <div className="dash26-divider" />

            <h3 className="dash26-sec-title">Top content</h3>
            <p className="dash26-sec-sub">Last 48 hours · Views</p>
            <div className="dash26-top-content-list">
              {topRealtimeVideos.map((item) => (
                <div
                  key={item.id}
                  className="dash26-top-content-row"
                  onClick={() =>
                    navigate(`${CHANNEL_PREFIX}/video/${item.id}/analytics/hub_overview`)
                  }
                >
                  <span className="dash26-tc-name">{item.title}</span>
                  <span className="dash26-tc-views">{item.views48h.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="dash26-pill-btn"
              onClick={() => navigate(`${CHANNEL_PREFIX}/analytics/hub_overview`)}
            >
              View realtime data
            </button>
          </section>

          {/* Card: Latest Comments */}
          <section className="dash26-card">
            <h2 className="dash26-card-title">Comments</h2>
            <p className="dash26-sec-sub dash26-mb-14">Channel comments I haven&apos;t responded to</p>
            <div className="dash26-comments-list">
              {recentComments.map((c) => (
                <div
                  key={c.id}
                  className="dash26-comment-row"
                  onClick={() => navigate(`${CHANNEL_PREFIX}/community/comments`)}
                >
                  <img
                    src={
                      c.authorAvatar ||
                      c.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author || 'U')}&background=f2f2f2&color=0f0f0f`
                    }
                    alt={c.author}
                    className="dash26-comment-avatar"
                  />
                  <div className="dash26-comment-body">
                    <div className="dash26-comment-meta">
                      <span>{c.author}</span> · <span>{c.time || c.timeAgo || c.date || 'Recently'}</span>
                    </div>
                    <p className="dash26-comment-text">{c.text}</p>
                  </div>
                  {latestVideo?.thumbnail && (
                    <img
                      src={latestVideo.thumbnail}
                      alt="Video"
                      className="dash26-comment-thumb"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="dash26-pill-btn"
              onClick={() => navigate(`${CHANNEL_PREFIX}/community/comments`)}
            >
              View more
            </button>
          </section>
        </div>

        {/* Column 3 */}
        <div className="dash26-col">
          {/* Card: Ideas for you */}
          <section className="dash26-card">
            <div className="dash26-card-head-row">
              <h2 className="dash26-card-title">Ideas for you</h2>
              <div className="dash26-pager">
                <button
                  type="button"
                  className="dash26-pager-btn"
                  onClick={() =>
                    setIdeaIndex((prev) => (prev - 1 + IDEAS_SLIDES.length) % IDEAS_SLIDES.length)
                  }
                  aria-label="Previous idea"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span>
                  {(ideaIndex % IDEAS_SLIDES.length) + 1} / {IDEAS_SLIDES.length}
                </span>
                <button
                  type="button"
                  className="dash26-pager-btn"
                  onClick={() => setIdeaIndex((prev) => (prev + 1) % IDEAS_SLIDES.length)}
                  aria-label="Next idea"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="dash26-idea-box">
              <div className="dash26-idea-copy">
                <h3 className="dash26-idea-headline">{currentIdea.title}</h3>
                <p className="dash26-idea-desc">{currentIdea.body}</p>
              </div>
              <CoinsIllustration />
            </div>

            <div className="dash26-carousel-footer">
              <button
                type="button"
                className="dash26-pill-btn"
                onClick={handleIdeaAction}
              >
                {currentIdea.actionLabel}
              </button>
              <button
                type="button"
                className="dash26-more-ic-btn"
                aria-label="More options"
                onClick={() => showToast('Idea feedback updated', 'info')}
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </section>

          {/* Card: News */}
          <section className="dash26-card">
            <div className="dash26-card-head-row">
              <h2 className="dash26-card-title">News</h2>
              <div className="dash26-pager">
                <button
                  type="button"
                  className="dash26-pager-btn"
                  onClick={() =>
                    setNewsIndex((prev) => (prev - 1 + NEWS_SLIDES.length) % NEWS_SLIDES.length)
                  }
                  aria-label="Previous news"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span>
                  {(newsIndex % NEWS_SLIDES.length) + 1} / {NEWS_SLIDES.length}
                </span>
                <button
                  type="button"
                  className="dash26-pager-btn"
                  onClick={() => setNewsIndex((prev) => (prev + 1) % NEWS_SLIDES.length)}
                  aria-label="Next news"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="dash26-news-banner">
              <NewsBannerIllustration />
            </div>

            <h3 className="dash26-news-headline">{currentNews.title}</h3>
            <p className="dash26-news-body">{currentNews.body}</p>

            <button type="button" className="dash26-pill-btn" onClick={handleNewsAction}>
              {currentNews.actionLabel}
            </button>
          </section>
        </div>
      </div>

      {/* Live Subscriber Count Modal */}
      {showLiveCountModal && (
        <div className="dash26-modal-backdrop" onClick={() => setShowLiveCountModal(false)}>
          <div className="dash26-live-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash26-live-modal-top">
              <div className="dash26-live-chip">
                <span className="dash26-live-dot" />
                <span>Updating live</span>
              </div>
              <button
                type="button"
                className="dash26-circle-btn"
                onClick={() => setShowLiveCountModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <img
              src={channelInfo?.avatar || '/channel-avatar.png'}
              alt={channelInfo?.name}
              className="dash26-live-avatar"
            />
            <p className="dash26-live-channel">{channelInfo?.name || 'Jesus Is The Lord'}</p>
            <div className="dash26-live-number yt-display-font">
              {liveSubCount.toLocaleString('en-IN')}
            </div>
            <p className="dash26-live-sub-caption">Subscribers</p>
          </div>
        </div>
      )}

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
