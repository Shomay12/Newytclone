import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ContentDetectionIcon } from './StudioIcons';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, isMobileOpen, onCloseMobile, onOpenSettings }) => {
  const { channelInfo, videos } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

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
    { icon: 'insert_chart', label: 'Insights', path: `${CHANNEL_PREFIX}/analytics/hub_overview`, key: 'analytics' },
    { icon: 'group', label: 'Community', path: `${CHANNEL_PREFIX}/community/comments`, key: 'community' },
    { icon: 'subtitles', label: 'Languages', path: `${CHANNEL_PREFIX}/languages`, key: 'languages' },
    { icon: 'content_detection_svg', label: 'Content detection', path: `${CHANNEL_PREFIX}/content-detection`, key: 'content-detection' },
    { icon: 'monetization_on', label: 'Earn', path: `${CHANNEL_PREFIX}/monetization/overview`, key: 'monetization' },
    { icon: 'auto_fix_high', label: 'Customization', path: `${CHANNEL_PREFIX}/customization/layout`, key: 'customization' },
    { icon: 'library_music', label: 'Audio library', path: `${CHANNEL_PREFIX}/audio-library/music`, key: 'audio-library' },
  ];

  const videoMenuItems = [
    { icon: 'edit', label: 'Details', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/edit`, key: 'details' },
    { icon: 'insert_chart', label: 'Insights', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/analytics/hub_overview`, key: 'analytics' },
    { icon: 'movie_edit', label: 'Editor', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/editor`, key: 'editor' },
    { icon: 'comment', label: 'Comments', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/comments`, key: 'community' },
    { icon: 'subtitles', label: 'Languages', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/languages`, key: 'languages' },
    { icon: 'monetization_on', label: 'Earn', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/monetization`, key: 'monetization' },
    { icon: 'report', label: 'Claims', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/claims`, key: 'claims' },
    { icon: 'content_cut', label: 'Clips & Shorts', path: `${CHANNEL_PREFIX}/video/${currentVideo.id}/clips`, key: 'clips' },
  ];

  const activeMenuItems = isVideoContext ? videoMenuItems : channelMenuItems;

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (isVideoContext) {
      if (item.key === 'analytics') return path.includes('/analytics');
      if (item.key === 'editor') return path.includes('/editor');
      if (item.key === 'community') return path.endsWith('/comments');
      if (item.key === 'languages') return path.endsWith('/languages');
      if (item.key === 'monetization') return path.endsWith('/monetization');
      if (item.key === 'claims') return path.endsWith('/claims');
      if (item.key === 'clips') return path.endsWith('/clips');
      if (item.key === 'details') {
        return (
          !path.includes('/analytics') &&
          !path.includes('/editor') &&
          !path.endsWith('/comments') &&
          !path.endsWith('/languages') &&
          !path.endsWith('/monetization') &&
          !path.endsWith('/claims') &&
          !path.endsWith('/clips')
        );
      }
      return false;
    }
    if (item.key === 'dashboard') return path.includes('/dashboard');
    if (item.key === 'content') return path.includes('/content');
    if (item.key === 'analytics') return path.includes('/analytics');
    if (item.key === 'community') return path.includes('/community') || path.includes('/comments');
    if (item.key === 'languages') return path.includes('/languages') || path.includes('/subtitles');
    if (item.key === 'content-detection' || item.key === 'claims') return path.includes('/content-detection') || path.includes('/copyright');
    if (item.key === 'monetization') return path.includes('/monetization') || path.includes('/earn');
    if (item.key === 'customization') return path.includes('/customization');
    if (item.key === 'audio-library') return path.includes('/audio-library') || path.includes('/library');
    return false;
  };

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isMobileOpen ? 'active' : ''}`} 
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-mobile-header">
          <div className="sidebar-mobile-brand">
            <img 
              src="https://www.gstatic.com/youtube/img/creator/yt_studio_logo.svg" 
              alt="YouTube Studio" 
              className="studio-logo"
            />
          </div>
          <button className="sidebar-mobile-close-btn" onClick={onCloseMobile} aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {!isCollapsed && (
          isVideoContext ? (
            <div className="video-sidebar-header">
              <button 
                className="back-to-content-btn" 
                onClick={() => {
                  handleNavClick();
                  navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/videos');
                }}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Channel content</span>
              </button>
              <div className="video-sidebar-card">
                <div className="video-thumb-wrapper">
                  <img 
                    src={currentVideo.thumbnail || '/thumbnails/latest_video.png'} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/thumbnails/latest_video.png';
                    }} 
                    alt="Video thumb" 
                    className="video-card-thumb" 
                  />
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
              <h2 className="channel-name">Your channel</h2>
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
                onClick={handleNavClick}
              >
                {item.icon === 'content_detection_svg' ? (
                  <ContentDetectionIcon
                    size={20}
                    active={active}
                    className={`nav-icon ${active ? 'active-icon' : ''}`}
                  />
                ) : (
                  <span className={`material-symbols-outlined nav-icon ${active ? 'active-icon' : ''}`}>
                    {item.icon}
                  </span>
                )}
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="bottom-menu">
          <div 
            className="nav-item" 
            onClick={() => {
              handleNavClick();
              onOpenSettings?.();
            }} 
            title={isCollapsed ? 'Settings' : ''}
          >
            <span className="material-symbols-outlined nav-icon">settings</span>
            {!isCollapsed && <span className="nav-label">Settings</span>}
          </div>
          <div 
            className="nav-item" 
            onClick={() => {
              handleNavClick();
            }} 
            title={isCollapsed ? 'Send feedback' : ''}
          >
            <span className="material-symbols-outlined nav-icon">feedback</span>
            {!isCollapsed && <span className="nav-label">Send feedback</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
