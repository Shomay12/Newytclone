import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtV } from '../../store/useStore';
import { AskSparkleIcon } from '../../components/StudioIcons';
import { formatPublishDate } from './analyticsFormatters';
import { openAskStudio } from '../../components/AskStudioDrawer';

const parseTimeMs = (raw) => {
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
};

export default function ResearchHub({ channelInfo, videos = [], channelPrefix, onBack }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('videos');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState('outliers');

  const cards = useMemo(() => {
    const filteredFormat = videos.filter((v) => {
      const fmt = String(v.format || v.type || '').toLowerCase();
      if (formatFilter === 'shorts') return fmt === 'short' || Boolean(v.isShort);
      if (formatFilter === 'videos') return fmt !== 'short' && !v.isShort;
      return true;
    });

    const viewCounts = filteredFormat.map((v) => Number(v.views || 0)).sort((a, b) => a - b);
    const medianViews = viewCounts.length > 0 ? Math.max(100, viewCounts[Math.floor(viewCounts.length / 2)]) : 1000;

    let mapped = filteredFormat.map((v) => {
      const viewsNum = Number(v.views || 0);
      const ratio = Math.max(1, Math.min(99, Math.round((viewsNum / medianViews) * 4)));
      return {
        id: v.id,
        title: v.title,
        description: v.description || '',
        thumbnail: v.thumbnail || '/thumbnails/latest_video.png',
        duration: v.duration || '8:24',
        author: channelInfo?.name || 'Jesus Is The Lord',
        subs: channelInfo?.subscribersFormatted || '53,887',
        viewsNum,
        views: v.viewsFormatted || fmtV(viewsNum),
        date: formatPublishDate(v),
        publishTs: parseTimeMs(v.publishDate || v.date),
        ratio,
        multiplier: `${ratio}x`,
      };
    });

    if (activeFilter === 'outliers') {
      mapped.sort((a, b) => b.ratio - a.ratio || b.viewsNum - a.viewsNum);
    } else if (activeFilter === 'watched') {
      mapped.sort((a, b) => b.viewsNum - a.viewsNum);
    } else if (activeFilter === 'recent') {
      mapped.sort((a, b) => b.publishTs - a.publishTs || b.viewsNum - a.viewsNum);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      mapped = mapped.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    return mapped;
  }, [videos, channelInfo, query, formatFilter, activeFilter]);

  const formatLabels = {
    videos: 'Videos',
    shorts: 'Shorts',
    all: 'All formats',
  };

  return (
    <div className="an26-subhub-wrap">
      <div className="an26-subhub-header-col">
        <button type="button" className="an26-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="yt-display-font">Research</span>
        </button>
        <p className="an26-research-sub">Explore what&apos;s working on YouTube</p>
      </div>

      {/* Rounded Search Input */}
      <div className="an26-research-search-bar">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Search for topics"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Filter Pills + Analyze Title Patterns */}
      <div className="an26-research-filters-row">
        <div className="an26-pill-tabs">
          <div className="an26-more-wrap">
            <button
              type="button"
              className="an26-pill-filter active"
              onClick={() => setShowFormatMenu((s) => !s)}
            >
              <span>{formatLabels[formatFilter]}</span>
              <span className="material-symbols-outlined">expand_more</span>
            </button>
            {showFormatMenu && (
              <div className="an26-more-menu" style={{ left: 0, right: 'auto' }}>
                {['videos', 'shorts', 'all'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setFormatFilter(fmt);
                      setShowFormatMenu(false);
                    }}
                  >
                    {formatLabels[fmt]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {[
            { key: 'outliers', label: 'Outliers in my niche' },
            { key: 'watched', label: 'What my viewers watched' },
            { key: 'recent', label: 'Recent uploads in my niche' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`an26-pill-filter ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="an26-outline-pill"
          onClick={() =>
            openAskStudio(
              `Analyze title patterns of my top ${activeFilter} videos: ${cards
                .slice(0, 3)
                .map((c) => c.title)
                .join(' | ')}`
            )
          }
        >
          <AskSparkleIcon size={15} />
          <span>Analyze title patterns</span>
        </button>
      </div>

      {/* Clean Video Grid */}
      {cards.length === 0 ? (
        <div className="an26-card" style={{ padding: 28, textAlign: 'center' }}>
          <p className="an26-card-sub">
            No {formatFilter === 'shorts' ? 'Shorts' : 'videos'} matched your filter.
          </p>
        </div>
      ) : (
        <div className="an26-research-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className="an26-research-card"
              onClick={() => navigate(`${channelPrefix}/video/${card.id}/analytics/hub_overview`)}
            >
              <div className="an26-research-thumb">
                <img
                  src={card.thumbnail}
                  alt={card.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/thumbnails/latest_video.png';
                  }}
                />
                <span className="an26-research-dur">{card.duration}</span>
              </div>
              <h4 className="an26-research-card-title">{card.title}</h4>
              <p className="an26-research-card-chan">
                {card.author} · {card.subs} subscribers
              </p>
              <div className="an26-research-card-foot">
                {activeFilter === 'outliers' && (
                  <span className="an26-mult-badge">{card.multiplier}</span>
                )}
                <span>
                  {card.views} views · {card.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
