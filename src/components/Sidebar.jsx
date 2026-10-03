import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, onOpenSettings }) => {
  const { channelInfo, videos } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const videoMatch = location.pathname.match(/\/video\/([^/]+)/);
  const searchParams = new URLSearchParams(location.search);
  const queryVideoId = searchParams.get('video') || searchParams.get('v');
  const activeVideoId = (videoMatch ? videoMatch[1] : null) || queryVideoId;
  const isVideoContext = !!activeVideoId;
  const currentVideo = (activeVideoId ? videos.find(v => v.id === activeVideoId || String(v.id) === String(activeVideoId)) : null) || videos[0] || {};

  const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

  const channelMenuItems = [
    { icon: 'dashboard', label: 'Dashboard', path: `${CHANNEL_PREFIX}/dashboard`, key: 'dashboard' },
    { icon: 'video_library', label: 'Content', path: `${CHANNEL_PREFIX}/content/videos`, key: 'content' },
    { icon: 'insert_chart', label: 'Analytics', path: `${CHANNEL_PREFIX}/analytics/tab-overview/period-last-28-days`, key: 'analytics' },
    { icon: 'forum', label: 'Community', path: `${CHANNEL_PREFIX}/community/comments`, key: 'community' },
    { icon: 'translate', label: 'Languages', path: `${CHANNEL_PREFIX}/languages`, key: 'languages' },
    { icon: 'policy', label: 'Content detection', path: `${CHANNEL_PREFIX}/content-detection`, key: 'content-detection' },
    { icon: 'monetization_on', label: 'Earn', path: `${CHANNEL_PREFIX}/monetization/overview`, key: 'monetization' },
    { icon: 'auto_fix_high', label: 'Customization', path: `${CHANNEL_PREFIX}/customization/layout`, key: 'customization' },
    { icon: 'library_music', label: 'Audio library', path: `${CHANNEL_PREFIX}/audio-library/music`, key: 'audio-library' },
  ];

  const videoMenuItems = [
    { icon: 'edit', label: 'Details', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/edit`, key: 'details' },
    { icon: 'insert_chart', label: 'Analytics', path: `${CHANNEL_PREFIX}/analytics/tab-overview/period-last-28-days?video=${currentVideo.id}`, key: 'analytics' },
    { icon: 'content_cut', label: 'Editor', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/edit`, key: 'editor' },
    { icon: 'comment', label: 'Comments', path: `${CHANNEL_PREFIX}/community/comments`, key: 'community' },
    { icon: 'translate', label: 'Languages', path: `${CHANNEL_PREFIX}/languages`, key: 'languages' },
    { icon: 'monetization_on', label: 'Earn', path: `${CHANNEL_PREFIX}/monetization/overview`, key: 'monetization' },
    { icon: 'policy', label: 'Claims', path: `${CHANNEL_PREFIX}/content-detection`, key: 'claims' },
    { icon: 'content_copy', label: 'Clips', path: `${CHANNEL_PREFIX}/content/videos`, key: 'clips' },
  ];

  const activeMenuItems = isVideoContext ? videoMenuItems : channelMenuItems;

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (item.key === 'dashboard') return path.includes('/dashboard');
    if (item.key === 'content') return path.includes('/content');
    if (item.key === 'analytics') return path.includes('/analytics');
    if (item.key === 'community') return path.includes('/community') || path.includes('/comments');
    if (item.key === 'languages') return path.includes('/languages') || path.includes('/subtitles');
    if (item.key === 'content-detection' || item.key === 'claims') return path.includes('/content-detection') || path.includes('/copyright');
    if (item.key === 'monetization') return path.includes('/monetization') || path.includes('/earn');
    if (item.key === 'customization') return path.includes('/customization');
    if (item.key === 'audio-library') return path.includes('/audio-library') || path.includes('/library');
    if (item.key === 'details' || item.key === 'editor') return path.includes('/video');
    return false;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {!isCollapsed && (
        isVideoContext ? (
          <div className="video-sidebar-header">
            <button className="back-to-content-btn" onClick={() => navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/videos')}>
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Channel content</span>
            </button>
            <div className="video-sidebar-card">
              <div className="video-thumb-wrapper">
                <img src={currentVideo.thumbnail} alt="Video thumb" className="video-card-thumb" />
                <span className="video-card-duration">{currentVideo.duration}</span>
              </div>
              <span className="video-card-tag">Your video</span>
              <p className="video-card-title">{currentVideo.title}</p>
            </div>
          </div>
        ) : (
          <div className="profile-section">
            <img 
              src={channelInfo?.avatar || '/channel-avatar.png'} 
              alt="Channel Avatar" 
              className="channel-avatar" 
            />
            <h2 className="channel-name">Channel</h2>
            <p className="channel-subtitle">{channelInfo?.name || 'Jesus Is The Lord'}</p>
          </div>
        )
      )}

      <nav className="nav-menu">
        {activeMenuItems.map((item, index) => {
          const active = isMenuItemActive(item);
          return (
            <NavLink 
              to={item.path} 
              key={index} 
              className={`nav-item ${active ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className={`material-symbols-outlined nav-icon ${active ? 'active-icon' : ''}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="bottom-menu">
        <div className="nav-item" onClick={onOpenSettings} title={isCollapsed ? 'Settings' : ''}>
          <span className="material-symbols-outlined nav-icon">settings</span>
          {!isCollapsed && <span className="nav-label">Settings</span>}
        </div>
        <div className="nav-item" title={isCollapsed ? 'Send feedback' : ''}>
          <span className="material-symbols-outlined nav-icon">feedback</span>
          {!isCollapsed && <span className="nav-label">Send feedback</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
