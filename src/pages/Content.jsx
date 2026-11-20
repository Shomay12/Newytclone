import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  VIDEO_ID_TO_DATE,
  TITLE_TO_SCHEDULE_DATE,
  VIDEO_PUBLISH_SCHEDULE,
} from '../engine/AnalyticsSimulationEngine';
import UploadModal from '../components/UploadModal';
import {
  formatCountComma,
  formatPublishDate,
  getVideoRevenueFormatted,
} from './analytics/analyticsFormatters';
import './Content.css';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

const CONTENT_TABS = [
  { key: 'inspiration', label: 'Inspiration' },
  { key: 'videos', label: 'Videos' },
  { key: 'shows', label: 'Shows' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'live', label: 'Live' },
  { key: 'posts', label: 'Posts' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'podcasts', label: 'Podcasts' },
  { key: 'courses', label: 'Courses' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'collaborations', label: 'Collaborations' },
];

export default function Content() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    videos = [],
    shorts = [],
    liveStreams = [],
    playlists = [],
    podcasts = [],
    updateVideo,
    deleteVideo,
    showToast,
  } = useStore();

  const pathTab = useMemo(() => {
    const seg = location.pathname.split('/content/')[1]?.split('/')[0];
    return CONTENT_TABS.some((t) => t.key === seg) ? seg : 'videos';
  }, [location.pathname]);

  const [filterText, setFilterText] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openVisMenuId, setOpenVisMenuId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const activeRows = useMemo(() => {
    let source = videos;
    if (pathTab === 'shorts') source = shorts;
    else if (pathTab === 'live') source = liveStreams;

    let filtered = (source || []).map((item, idx) => {
      const scheduledDate =
        TITLE_TO_SCHEDULE_DATE[item.title] ||
        VIDEO_ID_TO_DATE[item.id] ||
        (pathTab === 'videos' && VIDEO_PUBLISH_SCHEDULE[idx]) ||
        '2026-08-16';
      const pubDate = item.publishDate || item.date || scheduledDate;
      const commentsCount =
        item.comments != null
          ? Number(item.comments)
          : item.commentsCount != null
          ? Number(item.commentsCount)
          : Math.round((Number(item.views) || 0) * 0.0034);
      return {
        ...item,
        publishDate: pubDate,
        date: pubDate,
        comments: commentsCount,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx + 1,
      };
    });

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.title || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      );
    }
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(
        (item) => (item.visibility || 'Public').toLowerCase() === visibilityFilter
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'views') {
        return sortDir === 'desc' ? (b.views || 0) - (a.views || 0) : (a.views || 0) - (b.views || 0);
      }
      if (sortBy === 'comments') {
        const ca = a.comments ?? a.commentsCount ?? 0;
        const cb = b.comments ?? b.commentsCount ?? 0;
        return sortDir === 'desc' ? cb - ca : ca - cb;
      }
      const dateA = a.publishDate || a.date || '';
      const dateB = b.publishDate || b.date || '';
      if (dateA && dateB && dateA !== dateB) {
        return sortDir === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return filtered;
  }, [pathTab, videos, shorts, liveStreams, filterText, visibilityFilter, sortBy, sortDir]);

  const allSelected =
    activeRows.length > 0 && activeRows.every((r) => selectedIds.includes(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeRows.map((r) => r.id));
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const handleChangeVisibility = (id, vis) => {
    setOpenVisMenuId(null);
    if (typeof updateVideo === 'function') {
      updateVideo(id, { visibility: vis });
      if (typeof showToast === 'function') showToast(`Visibility updated to ${vis}`, 'success');
    }
  };

  const handleDeleteRow = (id) => {
    setOpenMenuId(null);
    if (typeof deleteVideo === 'function') {
      deleteVideo(id);
      if (typeof showToast === 'function') showToast('Video deleted from studio', 'info');
    }
  };

  const renderVideoLikeTable = () => (
    <div className="content26-table-wrap">
      <table className="content26-table">
        <thead>
          <tr>
            <th className="content26-col-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </th>
            <th className="content26-col-video">Video</th>
            <th className="content26-col-notices">Notices</th>
            <th className="content26-col-vis">Visibility</th>
            <th
              className="content26-col-date content26-sortable"
              onClick={() => handleSort('date')}
            >
              <span>Date</span>
              <span className="material-symbols-outlined content26-sort-arrow">
                {sortBy === 'date' && sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
            </th>
            <th
              className="content26-col-num content26-sortable"
              onClick={() => handleSort('views')}
            >
              <span>Views</span>
              {sortBy === 'views' && (
                <span className="material-symbols-outlined content26-sort-arrow">
                  {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </th>
            <th className="content26-col-num">Est. revenue</th>
            <th
              className="content26-col-num content26-sortable"
              onClick={() => handleSort('comments')}
            >
              <span>Comments</span>
              {sortBy === 'comments' && (
                <span className="material-symbols-outlined content26-sort-arrow">
                  {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {activeRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="content26-empty-td">
                No {pathTab} match your filter.
              </td>
            </tr>
          ) : (
            activeRows.map((row) => {
              const vis = row.visibility || 'Public';
              const notices = row.restrictions || 'None';
              const estRev = getVideoRevenueFormatted(row);
              return (
                <tr key={row.id} className="content26-row">
                  <td className="content26-col-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.title}`}
                    />
                  </td>

                  <td className="content26-col-video">
                    <div className="content26-video-cell">
                      <div
                        className="content26-thumb-box"
                        onClick={() => navigate(`${CHANNEL_PREFIX}/video/${row.id}/edit`)}
                      >
                        <img
                          src={row.thumbnail || '/thumbnails/latest_video.png'}
                          alt={row.title}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/thumbnails/latest_video.png';
                          }}
                        />
                        {row.duration && (
                          <span className="content26-duration-pill">{row.duration}</span>
                        )}
                      </div>

                      <div className="content26-video-meta">
                        <button
                          type="button"
                          className="content26-video-title"
                          onClick={() => navigate(`${CHANNEL_PREFIX}/video/${row.id}/edit`)}
                        >
                          {row.title}
                        </button>
                        <p className="content26-video-desc">
                          {row.description || 'Add description'}
                        </p>

                        {/* Hover Actions */}
                        <div className="content26-hover-actions">
                          <button
                            type="button"
                            title="Details"
                            onClick={() => navigate(`${CHANNEL_PREFIX}/video/${row.id}/edit`)}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            type="button"
                            title="Insights"
                            onClick={() =>
                              navigate(`${CHANNEL_PREFIX}/video/${row.id}/analytics/hub_overview`)
                            }
                          >
                            <span className="material-symbols-outlined">insert_chart</span>
                          </button>
                          <button
                            type="button"
                            title="Comments"
                            onClick={() =>
                              navigate(`${CHANNEL_PREFIX}/video/${row.id}/comments`)
                            }
                          >
                            <span className="material-symbols-outlined">comment</span>
                          </button>
                          <button
                            type="button"
                            title="Monetization"
                            onClick={() =>
                              navigate(`${CHANNEL_PREFIX}/video/${row.id}/monetization`)
                            }
                          >
                            <span className="material-symbols-outlined">monetization_on</span>
                          </button>
                          <div className="content26-row-menu-wrap">
                            <button
                              type="button"
                              title="Options"
                              onClick={() =>
                                setOpenMenuId(openMenuId === row.id ? null : row.id)
                              }
                            >
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>
                            {openMenuId === row.id && (
                              <div className="content26-popover-menu">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`${CHANNEL_PREFIX}/video/${row.id}/edit`);
                                  }}
                                >
                                  <span className="material-symbols-outlined">edit</span> Edit title & details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`${CHANNEL_PREFIX}/video/${row.id}/analytics/hub_overview`);
                                  }}
                                >
                                  <span className="material-symbols-outlined">insert_chart</span> View video insights
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => handleDeleteRow(row.id)}
                                >
                                  <span className="material-symbols-outlined">delete</span> Delete forever
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="content26-col-notices">
                    <span className={notices === 'None' ? 'content26-muted' : 'content26-notice-badge'}>
                      {notices === 'None' ? '—' : notices}
                    </span>
                  </td>

                  <td className="content26-col-vis">
                    <div className="content26-vis-wrap">
                      <button
                        type="button"
                        className="content26-vis-btn"
                        onClick={() =>
                          setOpenVisMenuId(openVisMenuId === row.id ? null : row.id)
                        }
                      >
                        <span className="material-symbols-outlined content26-vis-icon">
                          {vis.toLowerCase() === 'public'
                            ? 'public'
                            : vis.toLowerCase() === 'unlisted'
                            ? 'link'
                            : 'lock'}
                        </span>
                        <span>{vis}</span>
                        <span className="material-symbols-outlined content26-vis-caret">
                          expand_more
                        </span>
                      </button>

                      {openVisMenuId === row.id && (
                        <div className="content26-popover-menu">
                          {['Public', 'Unlisted', 'Private'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleChangeVisibility(row.id, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="content26-col-date">
                    <div className="content26-date-cell">
                      <span>{formatPublishDate(row)}</span>
                      <span className="content26-sub-muted">Published</span>
                    </div>
                  </td>

                  <td className="content26-col-num">{formatCountComma(row.views || 0)}</td>
                  <td className="content26-col-num">{estRev}</td>
                  <td className="content26-col-num">
                    <button
                      type="button"
                      className="content26-comment-link"
                      onClick={() => navigate(`${CHANNEL_PREFIX}/video/${row.id}/comments`)}
                    >
                      {formatCountComma(row.comments ?? row.commentsCount ?? 0)}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const renderSpecialTab = () => {
    if (pathTab === 'playlists' || pathTab === 'podcasts') {
      const list = pathTab === 'podcasts' ? podcasts : playlists;
      return (
        <div className="content26-table-wrap">
          <table className="content26-table">
            <thead>
              <tr>
                <th className="content26-col-video">
                  {pathTab === 'podcasts' ? 'Podcast' : 'Playlist'}
                </th>
                <th className="content26-col-vis">Visibility</th>
                <th className="content26-col-date">Last updated</th>
                <th className="content26-col-num">Videos</th>
              </tr>
            </thead>
            <tbody>
              {(list || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="content26-empty-td">
                    No {pathTab} found yet.
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className="content26-row">
                    <td className="content26-col-video">
                      <div className="content26-video-cell">
                        <div className="content26-thumb-box">
                          <img
                            src={p.thumbnail || '/thumbnails/latest_video.png'}
                            alt={p.title}
                          />
                        </div>
                        <div className="content26-video-meta">
                          <span className="content26-video-title">{p.title}</span>
                          <p className="content26-video-desc">{p.description || 'Public collection'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="content26-col-vis">{p.visibility || 'Public'}</td>
                    <td className="content26-col-date">{p.lastUpdated || p.updatedAt || 'Nov 2026'}</td>
                    <td className="content26-col-num">{p.videoCount ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    const emptyCopy = {
      shows: {
        icon: 'tv',
        title: 'Organize episodic video series',
        sub: 'Group multi-part uploads into Shows so viewers binge seamlessly.',
      },
      posts: {
        icon: 'post_add',
        title: 'Share updates with your community',
        sub: 'Run polls, share behind-the-scenes images, and spark conversations.',
      },
      courses: {
        icon: 'school',
        title: 'Create structured learning courses',
        sub: 'Organize instructional videos into guided modules for learners.',
      },
      promotions: {
        icon: 'campaign',
        title: 'Promote your videos cleanly',
        sub: 'Run channel growth campaigns for your key uploads directly inside Studio.',
      },
      collaborations: {
        icon: 'group_add',
        title: 'Track creator collaborations',
        sub: 'Manage shared releases and co-authored channel spotlights.',
      },
      ideas: {
        icon: 'lightbulb',
        title: 'Capture your next video idea',
        sub: 'Save title hooks, outline concepts, and inspiration notes in one place.',
      },
    }[pathTab] || {
      icon: 'video_library',
      title: `No ${pathTab} yet`,
      sub: 'Content you create for this tab will show here.',
    };

    return (
      <div className="content26-empty-state">
        <div className="content26-empty-icon">
          <span className="material-symbols-outlined">{emptyCopy.icon}</span>
        </div>
        <h3>{emptyCopy.title}</h3>
        <p>{emptyCopy.sub}</p>
        <button
          type="button"
          className="content26-pill-primary"
          onClick={() => setShowUploadModal(true)}
        >
          Get started
        </button>
      </div>
    );
  };

  return (
    <div className="content26-page">
      <div className="content26-header">
        <h1 className="content26-title yt-display-font">Channel content</h1>
      </div>

      {/* Horizontal Navigation Tabs */}
      <div className="content26-tabs-bar" role="tablist">
        {CONTENT_TABS.map((tab) => {
          const isActive = pathTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`content26-tab ${isActive ? 'active' : ''}`}
              onClick={() => navigate(`${CHANNEL_PREFIX}/content/${tab.key}`)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bulk Action Strip or Filter Bar */}
      {selectedIds.length > 0 ? (
        <div className="content26-bulk-bar">
          <span className="content26-bulk-count">{selectedIds.length} selected</span>
          <div className="content26-bulk-actions">
            <button
              type="button"
              className="content26-pill-btn"
              onClick={() =>
                selectedIds.forEach((id) => handleChangeVisibility(id, 'Public'))
              }
            >
              Set Public
            </button>
            <button
              type="button"
              className="content26-pill-btn"
              onClick={() =>
                selectedIds.forEach((id) => handleChangeVisibility(id, 'Private'))
              }
            >
              Set Private
            </button>
            <button
              type="button"
              className="content26-pill-btn"
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : (
        <div className="content26-filter-bar">
          <span className="material-symbols-outlined content26-filter-icon">filter_list</span>
          <input
            type="text"
            className="content26-filter-input"
            placeholder="Filter"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {visibilityFilter !== 'all' && (
            <button
              type="button"
              className="content26-filter-chip"
              onClick={() => setVisibilityFilter('all')}
            >
              Visibility: {visibilityFilter} ×
            </button>
          )}
        </div>
      )}

      {pathTab === 'videos' || pathTab === 'shorts' || pathTab === 'live'
        ? renderVideoLikeTable()
        : renderSpecialTab()}

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}
