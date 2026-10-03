import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import VideoEditor from './VideoEditor';
import Analytics from './Analytics';
import './VideoDetails.css';

const VideoDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { videos, playlists, comments, copyrightClaims, updateVideo, showToast } = useStore();

  const [activeTab, setActiveTab] = useState('Details');
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  const video = videos.find(v => v.id === id);
  const videoComments = comments.filter(c => c.videoId === id);
  const videoClaims = copyrightClaims.filter(c => c.videoId === id);

  useEffect(() => {
    if (video) {
      setFormData(video);
    } else if (videos.length > 0) {
      navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/videos');
    }
  }, [video, videos, navigate]);

  if (!formData || !video) return null;

  const hasChanges = JSON.stringify(video) !== JSON.stringify(formData);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      updateVideo(id, formData);
      setSaving(false);
      showToast("Video details saved successfully", "success");
    }, 400);
  };

  const handleUndo = () => {
    setFormData(video);
    showToast("Changes undone", "info");
  };

  return (
    <div className="dashboard-container video-details-page">
      {/* Video Details Header */}
      <div className="video-details-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/videos')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="dashboard-title">Video details</h1>
            <p className="video-header-subtitle">{video.title}</p>
          </div>
        </div>

        {activeTab === 'Details' && (
          <div className="header-actions">
            <button className="undo-btn" disabled={!hasChanges} onClick={handleUndo}>UNDO CHANGES</button>
            <button className="save-btn" disabled={!hasChanges || saving} onClick={handleSave}>
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="content-tabs">
        {['Details', 'Analytics', 'Editor', 'Comments', 'Subtitles', 'Copyright'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: DETAILS */}
      {activeTab === 'Details' && (
        <div className="video-details-content">
          <div className="details-form-column">
            <div className="form-group">
              <label>Title (required)</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="form-textarea"
                rows="6"
              />
            </div>

            <div className="form-group">
              <label>Thumbnail Image URL</label>
              <input
                type="text"
                value={formData.thumbnail}
                onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                  className="form-select"
                >
                  <option value="Public">Public</option>
                  <option value="Unlisted">Unlisted</option>
                  <option value="Private">Private</option>
                </select>
              </div>

              <div className="form-group">
                <label>Playlist</label>
                <select
                  value={formData.playlist || ''}
                  onChange={e => setFormData({ ...formData, playlist: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Playlist</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Audience</label>
              <div className="radio-group-box">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="audience"
                    checked={formData.audience === 'Yes, made for kids'}
                    onChange={() => setFormData({ ...formData, audience: 'Yes, made for kids' })}
                  />
                  <span>Yes, it's made for kids</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="audience"
                    checked={formData.audience !== 'Yes, made for kids'}
                    onChange={() => setFormData({ ...formData, audience: 'Not made for kids' })}
                  />
                  <span>No, it's not made for kids</span>
                </label>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category || 'Science & Technology'}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="form-select"
                >
                  <option value="Science & Technology">Science & Technology</option>
                  <option value="Education">Education</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Entertainment">Entertainment</option>
                </select>
              </div>

              <div className="form-group">
                <label>License</label>
                <select
                  value={formData.license || 'Standard YouTube License'}
                  onChange={e => setFormData({ ...formData, license: e.target.value })}
                  className="form-select"
                >
                  <option value="Standard YouTube License">Standard YouTube License</option>
                  <option value="Creative Commons - Attribution">Creative Commons - Attribution</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags || ''}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Right Column: Preview & Info */}
          <div className="video-preview-column">
            <div className="video-player-mock">
              <img src={formData.thumbnail} alt="Thumbnail" />
              <div className="play-button-mock">
                <span className="material-symbols-outlined">play_arrow</span>
              </div>
            </div>
            <div className="video-info-box">
              <p className="info-label">Video link</p>
              <a href={`https://youtu.be/${formData.id}`} target="_blank" rel="noreferrer" className="info-link">
                https://youtu.be/{formData.id}
              </a>

              <p className="info-label mt-3">Filename</p>
              <p className="info-text">render_master_{formData.id}.mp4</p>

              <p className="info-label mt-3">Restrictions</p>
              <p className="info-text">{formData.restrictions}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS */}
      {activeTab === 'Analytics' && (
        <Analytics />
      )}

      {/* TAB 3: EDITOR */}
      {activeTab === 'Editor' && (
        <VideoEditor video={video} />
      )}

      {/* TAB 4: COMMENTS */}
      {activeTab === 'Comments' && (
        <div className="tab-panel">
          <h3>Comments on this video ({videoComments.length})</h3>
          {videoComments.map(c => (
            <div key={c.id} className="video-comment-row">
              <img src={c.authorAvatar} alt="Author" className="c-avatar" />
              <div>
                <p className="c-author">{c.author} • <span className="text-secondary">{c.time}</span></p>
                <p className="c-text">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: SUBTITLES */}
      {activeTab === 'Subtitles' && (
        <div className="tab-panel">
          <h3>Subtitles for {video.title}</h3>
          <p className="text-secondary mb-3">Languages added: English (Original), Spanish, Hindi, French</p>
          <button className="save-btn" onClick={() => showToast("Opened Subtitle Editor", "info")}>ADD LANGUAGE</button>
        </div>
      )}

      {/* TAB 6: COPYRIGHT */}
      {activeTab === 'Copyright' && (
        <div className="tab-panel">
          <h3>Copyright Status</h3>
          {videoClaims.length > 0 ? (
            videoClaims.map(claim => (
              <div key={claim.id} className="claim-card-item">
                <p className="claim-title"><span className="material-symbols-outlined warning-ic">warning</span> {claim.status}</p>
                <p>Matching Video: {claim.matchingVideo} ({claim.matchingChannel})</p>
                <p>Match Percentage: {claim.matchPercentage}</p>
                <p className="text-secondary">{claim.impact}</p>
              </div>
            ))
          ) : (
            <div className="no-claims-box">
              <span className="material-symbols-outlined check-ic">check_circle</span>
              <p>No copyright claims detected on this video.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoDetails;
