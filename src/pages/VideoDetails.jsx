import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore, fmtV } from '../store/useStore';
import { getVideoRevenueFormatted } from './analytics/analyticsFormatters';
import './VideoDetails.css';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

export default function VideoDetails() {
  const { id, section } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    videos = [],
    playlists = [],
    comments = [],
    updateVideo,
    deleteVideo,
    showToast,
  } = useStore();

  const video = useMemo(
    () => videos.find((v) => v.id === id) || videos[0],
    [videos, id]
  );

  const activeSection = useMemo(() => {
    if (section) return section;
    if (location.pathname.endsWith('/edit')) return 'edit';
    return 'edit';
  }, [section, location.pathname]);

  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [visibility, setVisibility] = useState(video?.visibility || 'Public');
  const [madeForKids, setMadeForKids] = useState('no');
  const [selectedPlaylist, setSelectedPlaylist] = useState(playlists[0]?.title || '');
  const [tags, setTags] = useState(video?.tags || '');
  const [category, setCategory] = useState(video?.category || 'Science & Technology');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAbModal, setShowAbModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEndScreenModal, setShowEndScreenModal] = useState(false);

  // Interactive preview player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [monetizationOn, setMonetizationOn] = useState(true);
  const [trimStart, setTrimStart] = useState(12);
  const [trimEnd, setTrimEnd] = useState(84);

  const activeVideoId = video?.id;
  const activeVideoTitle = video?.title || '';
  const activeVideoDesc = video?.description || '';
  const activeVideoVis = video?.visibility || 'Public';
  const activeVideoTags = video?.tags || '';
  const activeVideoCat = video?.category || 'Science & Technology';

  useEffect(() => {
    if (activeVideoId) {
      setTitle(activeVideoTitle);
      setDescription(activeVideoDesc);
      setVisibility(activeVideoVis);
      setTags(activeVideoTags);
      setCategory(activeVideoCat);
    }
  }, [activeVideoId, activeVideoTitle, activeVideoDesc, activeVideoVis, activeVideoTags, activeVideoCat]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setPlayProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          return 0;
        }
        return p + 1.5;
      });
    }, 300);
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (!video) {
    return (
      <div className="vd26-empty">
        <p>Video not found.</p>
        <button
          type="button"
          className="vd26-pill-primary"
          onClick={() => navigate(`${CHANNEL_PREFIX}/content/videos`)}
        >
          Back to Content
        </button>
      </div>
    );
  }

  const isDirty =
    title !== (video.title || '') ||
    description !== (video.description || '') ||
    visibility !== (video.visibility || 'Public') ||
    tags !== (video.tags || '') ||
    category !== (video.category || 'Science & Technology');

  const safeFileSlug = `render_master_${video.id || 'video'}`;

  const formattedCurrentTime = (() => {
    const [minsStr = '4', secsStr = '15'] = (video.duration || '4:15').split(':');
    const totalSec = parseInt(minsStr, 10) * 60 + parseInt(secsStr, 10);
    const curSec = Math.round(((playProgress || 0) / 100) * totalSec);
    const m = String(Math.floor(curSec / 60)).padStart(2, '0');
    const s = String(curSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  })();

  const handleSave = () => {
    if (!title.trim()) {
      if (typeof showToast === 'function') showToast('Title is required', 'warning');
      return;
    }
    if (typeof updateVideo === 'function') {
      updateVideo(video.id, {
        title: title.trim(),
        description,
        visibility,
        tags,
        category,
      });
      if (typeof showToast === 'function') showToast('Changes saved', 'success');
    }
  };

  const handleUndo = () => {
    setTitle(video.title || '');
    setDescription(video.description || '');
    setVisibility(video.visibility || 'Public');
    setTags(video.tags || '');
    setCategory(video.category || 'Science & Technology');
  };

  const handleCopyLink = () => {
    const url = `https://youtu.be/${video.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    if (typeof showToast === 'function') showToast('Video link copied to clipboard', 'success');
  };

  const renderSecondarySection = () => {
    if (activeSection === 'editor') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Video editor</h1>
            <button
              type="button"
              className="vd26-pill-primary"
              onClick={() => showToast('Video trim edits queued for processing', 'success')}
            >
              Save
            </button>
          </div>
          <div className="vd26-editor-grid">
            <div className="vd26-editor-preview">
              <img
                src={video.thumbnail || '/thumbnails/latest_video.png'}
                alt={video.title}
              />
              <div className="vd26-editor-overlay-bar">
                <button type="button" onClick={() => setIsPlaying((p) => !p)}>
                  <span className="material-symbols-outlined">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <span>
                  {formattedCurrentTime} / {video.duration || '04:15'}
                </span>
              </div>
            </div>
            <div className="vd26-editor-tools">
              <h3>Timeline tools</h3>
              <div className="vd26-tool-row">
                <span>Trim & cut</span>
                <span>
                  {trimStart}% – {trimEnd}%
                </span>
              </div>
              <div className="vd26-range-track">
                <div
                  className="vd26-range-fill"
                  style={{ left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }}
                />
              </div>
              <div className="vd26-slider-pair">
                <label>
                  Start point ({trimStart}%)
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Number(e.target.value))}
                  />
                </label>
                <label>
                  End point ({trimEnd}%)
                  <input
                    type="range"
                    min="55"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'comments') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Video comments</h1>
          </div>
          <div className="vd26-card-panel">
            {(comments || []).map((c) => (
              <div key={c.id} className="vd26-comment-item">
                <img
                  src={
                    c.authorAvatar ||
                    c.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author || 'U')}&background=f2f2f2&color=0f0f0f`
                  }
                  alt={c.author}
                />
                <div>
                  <div className="vd26-comment-head">
                    <strong>{c.author}</strong> · <span>{c.time || c.timeAgo || c.date || 'Recently'}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'languages') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Video languages</h1>
            <button
              type="button"
              className="vd26-pill-primary"
              onClick={() => showToast('Language caption track added', 'success')}
            >
              Add language
            </button>
          </div>
          <div className="vd26-card-panel">
            <table className="vd26-simple-table">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Title & description</th>
                  <th>Subtitles</th>
                  <th>Audio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>English (Original)</td>
                  <td>Published</td>
                  <td>Auto-generated + Verified</td>
                  <td>Original audio</td>
                </tr>
                <tr>
                  <td>Hindi</td>
                  <td>Not added</td>
                  <td>Add subtitles</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeSection === 'monetization') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Video monetization</h1>
          </div>
          <div className="vd26-card-panel vd26-monetization-panel">
            <div className="vd26-mon-row">
              <div>
                <h3>Monetization</h3>
                <p>Estimated revenue to date: {getVideoRevenueFormatted(video)}</p>
              </div>
              <button
                type="button"
                className={monetizationOn ? 'vd26-pill-primary' : 'vd26-pill-secondary'}
                onClick={() => setMonetizationOn((v) => !v)}
              >
                {monetizationOn ? 'On' : 'Off'}
              </button>
            </div>
            <div className="vd26-mon-checks">
              <span>✓ Display ads enabled</span>
              <span>✓ Overlay & skippable video ads</span>
              <span>✓ Ad suitability: All ad types</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'claims') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Copyright</h1>
          </div>
          <div className="vd26-card-panel">
            <div className="vd26-status-banner">
              <span className="material-symbols-outlined">verified_user</span>
              <div>
                <h3>{video.restrictions === 'None' || !video.restrictions ? 'No copyright claims found' : video.restrictions}</h3>
                <p>No Content ID matches affect your visibility or revenue share on this upload.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'clips') {
      return (
        <div className="vd26-subpage">
          <div className="vd26-header">
            <h1 className="vd26-title">Clips &amp; Shorts</h1>
            <button
              type="button"
              className="vd26-pill-primary"
              onClick={() => showToast('Short clip generator ready', 'info')}
            >
              Create Short from video
            </button>
          </div>
          <div className="vd26-card-panel">
            <p className="vd26-muted-copy">
              Turn top retention moments from &ldquo;{video.title}&rdquo; ({video.viewsFormatted || fmtV(video.views)} views) into vertical Shorts.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (activeSection !== 'edit') {
    return renderSecondarySection();
  }

  return (
    <div className="vd26-page">
      {/* Header Row */}
      <div className="vd26-header">
        <h1 className="vd26-title yt-display-font">Video details</h1>
        <div className="vd26-header-actions">
          <button
            type="button"
            className="vd26-pill-secondary"
            disabled={!isDirty}
            onClick={handleUndo}
          >
            Undo changes
          </button>
          <button
            type="button"
            className="vd26-pill-primary"
            disabled={!isDirty}
            onClick={handleSave}
          >
            Save
          </button>
          <div className="vd26-menu-wrap">
            <button
              type="button"
              className="vd26-icon-circle"
              onClick={() => setShowMoreMenu((m) => !m)}
              aria-label="More options"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {showMoreMenu && (
              <div className="vd26-popover-menu">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    navigate(`${CHANNEL_PREFIX}/video/${video.id}/analytics/hub_overview`);
                  }}
                >
                  View video insights
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    showToast('Video MP4 queued for download', 'info');
                  }}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (typeof deleteVideo === 'function') {
                      deleteVideo(video.id);
                      navigate(`${CHANNEL_PREFIX}/content/videos`);
                    }
                  }}
                >
                  Delete forever
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Details Workspace */}
      <div className="vd26-grid">
        {/* Left Form Column */}
        <div className="vd26-left-col">
          {/* Title Box */}
          <div className="vd26-field-box">
            <div className="vd26-field-top">
              <label className="vd26-field-label" htmlFor="vd-title-input">
                Title (required)
                <span className="material-symbols-outlined vd26-help-ic" title="Add a catchy title">
                  help
                </span>
              </label>
              <span className="vd26-char-count">{title.length}/100</span>
            </div>
            <textarea
              id="vd-title-input"
              rows={2}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title that describes your video"
            />
            <div className="vd26-ab-bottom-row">
              <button
                type="button"
                className="vd26-ab-btn"
                onClick={() => setShowAbModal((v) => !v)}
              >
                <span className="material-symbols-outlined">compare</span>
                <span>A/B Testing</span>
              </button>
            </div>
          </div>

          {showAbModal && (
            <div className="vd26-ab-banner">
              <div>
                <strong>Title &amp; Thumbnail A/B test active</strong>
                <p>Compare viewer click-through performance across variations.</p>
              </div>
              <button type="button" onClick={() => setShowAbModal(false)}>
                Close
              </button>
            </div>
          )}

          {/* Description Box */}
          <div className="vd26-field-box">
            <div className="vd26-field-top">
              <label className="vd26-field-label" htmlFor="vd-desc-input">
                Description
                <span className="material-symbols-outlined vd26-help-ic" title="Describe your video">
                  help
                </span>
              </label>
            </div>
            <textarea
              id="vd-desc-input"
              rows={6}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video"
            />
            <div className="vd26-char-count">{description.length}/5000</div>
          </div>

          {/* Thumbnail Picker Section */}
          <div className="vd26-plain-section">
            <h3 className="vd26-section-heading">Thumbnail</h3>
            <p className="vd26-section-help">
              Set a thumbnail that stands out and draws viewers&apos; attention.
            </p>
            <div className="vd26-thumb-row">
              <div className="vd26-thumb-tile active">
                <img
                  src={video.thumbnail || '/thumbnails/latest_video.png'}
                  alt="Selected thumbnail"
                />
                <span className="vd26-thumb-badge">Current</span>
              </div>
              <button
                type="button"
                className="vd26-thumb-upload-tile"
                onClick={() => showToast('Thumbnail selector opened', 'info')}
              >
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Upload file</span>
              </button>
              <button
                type="button"
                className="vd26-thumb-upload-tile"
                onClick={() => setShowAbModal(true)}
              >
                <span className="material-symbols-outlined">science</span>
                <span>Test &amp; compare</span>
              </button>
            </div>
          </div>

          {/* Playlists */}
          <div className="vd26-plain-section">
            <h3 className="vd26-section-heading">Playlists</h3>
            <p className="vd26-section-help">
              Add your video to one or more playlists to organize your content for viewers.
            </p>
            <select
              className="vd26-select-box"
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value)}
            >
              <option value="">Select</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Audience */}
          <div className="vd26-plain-section">
            <h3 className="vd26-section-heading">Audience</h3>
            <p className="vd26-section-help">Is this video &ldquo;Made for Kids&rdquo;? (required)</p>
            <div className="vd26-radio-group">
              <label>
                <input
                  type="radio"
                  name="kids"
                  checked={madeForKids === 'yes'}
                  onChange={() => setMadeForKids('yes')}
                />
                <span>Yes, it&apos;s Made for Kids</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="kids"
                  checked={madeForKids === 'no'}
                  onChange={() => setMadeForKids('no')}
                />
                <span>No, it&apos;s not &ldquo;Made for Kids&rdquo;</span>
              </label>
            </div>
          </div>

          {/* Show More (Tags & Category) */}
          <button
            type="button"
            className="vd26-showmore-btn"
            onClick={() => setShowMoreOptions((s) => !s)}
          >
            {showMoreOptions ? 'Show less' : 'Show more'}
          </button>

          {showMoreOptions && (
            <div className="vd26-more-fields">
              <div className="vd26-field-box">
                <label className="vd26-field-label" htmlFor="vd-tags">
                  Tags
                </label>
                <input
                  id="vd-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Add tag, comma separated"
                />
              </div>
              <div className="vd26-plain-section">
                <h3 className="vd26-section-heading">Category</h3>
                <select
                  className="vd26-select-box"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {['Education', 'Entertainment', 'Science & Technology', 'People & Blogs', 'Film & Animation', 'Howto & Style'].map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview & Action Cards Column */}
        <aside className="vd26-right-col">
          {/* Player & Technical Metadata Card */}
          <div className="vd26-player-card">
            <div className="vd26-player-frame">
              <img
                src={video.thumbnail || '/thumbnails/latest_video.png'}
                alt={video.title}
              />
              <div className="vd26-player-controls">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <span className="material-symbols-outlined">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <span className="vd26-player-time">
                  {formattedCurrentTime} / {video.duration || '04:15'}
                </span>
                <div className="vd26-player-bar">
                  <div className="vd26-player-bar-fill" style={{ width: `${playProgress}%` }} />
                </div>
                <span className="material-symbols-outlined vd26-player-sm-ic">volume_up</span>
                <span className="material-symbols-outlined vd26-player-sm-ic">fullscreen</span>
              </div>
            </div>

            <div className="vd26-player-meta">
              <div className="vd26-meta-row-split">
                <div>
                  <span className="vd26-meta-label">Video link</span>
                  <button
                    type="button"
                    className="vd26-video-url"
                    onClick={handleCopyLink}
                  >
                    https://youtu.be/{video.id}
                  </button>
                </div>
                <button
                  type="button"
                  className="vd26-icon-circle"
                  onClick={handleCopyLink}
                  title="Copy video link"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                </button>
              </div>

              <div className="vd26-meta-block">
                <span className="vd26-meta-label">Filename</span>
                <p className="vd26-meta-val">{safeFileSlug}.mp4</p>
              </div>

              <div className="vd26-meta-block">
                <span className="vd26-meta-label">Video quality</span>
                <div className="vd26-quality-pills">
                  <span className="vd26-q-chip active">SD</span>
                  <span className="vd26-q-chip active">HD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Stacked Setting Cards */}
          <div className="vd26-side-stack">
            <div className="vd26-side-card">
              <div className="vd26-side-card-head">
                <span className="vd26-side-label">Notices</span>
              </div>
              <div className="vd26-side-card-body">
                <span>{!video.restrictions || video.restrictions === 'None' ? '—' : video.restrictions}</span>
              </div>
            </div>

            <div className="vd26-side-card">
              <div className="vd26-side-card-head">
                <span className="vd26-side-label">Visibility</span>
              </div>
              <div className="vd26-side-vis-select">
                <span className="material-symbols-outlined vd26-vis-globe">
                  {visibility === 'Public' ? 'public' : visibility === 'Unlisted' ? 'link' : 'lock'}
                </span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  aria-label="Visibility"
                >
                  <option value="Public">Public</option>
                  <option value="Unlisted">Unlisted</option>
                  <option value="Private">Private</option>
                </select>
              </div>
            </div>

            {[
              { key: 'languages', icon: 'subtitles', label: 'Subtitles', action: () => navigate(`${CHANNEL_PREFIX}/video/${video.id}/languages`) },
              { key: 'endscreen', icon: 'view_quilt', label: 'End screen', action: () => setShowEndScreenModal(true) },
              { key: 'cards', icon: 'info', label: 'Cards', action: () => showToast('Cards editor opened', 'info') },
              { key: 'quizzes', icon: 'quiz', label: 'Quizzes', action: () => showToast('Interactive quizzes editor', 'info') },
              { key: 'files', icon: 'folder', label: 'Files', action: () => showToast('Attached media files (1 MP4)', 'info') },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="vd26-side-action-card"
                onClick={item.action}
              >
                <div className="vd26-side-action-left">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span className="material-symbols-outlined vd26-edit-ic">edit</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {showEndScreenModal && (
        <div className="vd26-modal-backdrop" onClick={() => setShowEndScreenModal(false)}>
          <div className="vd26-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vd26-modal-head">
              <h3>End screen elements</h3>
              <button type="button" onClick={() => setShowEndScreenModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p>1 video + 1 subscribe element placed in the last 20 seconds.</p>
            <div className="vd26-modal-actions">
              <button
                type="button"
                className="vd26-pill-primary"
                onClick={() => {
                  setShowEndScreenModal(false);
                  showToast('End screen saved', 'success');
                }}
              >
                Save end screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
