import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import UploadModal from './UploadModal';
import './TopNav.css';

const TopNav = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const {
    channelInfo,
    videos,
    shorts,
    playlists,
    notifications,
    markAllNotificationsRead,
    showToast,
    mode,
    isConnectedToYouTube,
    isSyncing,
    disconnectYouTube,
    syncWithYouTube,
    checkOAuthStatus
  } = useStore();

  useEffect(() => {
    if (typeof checkOAuthStatus === 'function') {
      checkOAuthStatus();
    }
  }, [checkOAuthStatus]);

  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Filter search items
  const matchingVideos = searchQuery.trim() ? videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const matchingShorts = searchQuery.trim() ? shorts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const matchingPlaylists = searchQuery.trim() ? playlists.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (path) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <>
      <header className="top-nav">
        <div className="left-section">
          <button className="menu-btn" onClick={onToggleSidebar} title="Collapse sidebar">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="logo-container" onClick={() => navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/dashboard')}>
            <img 
              src="https://www.gstatic.com/youtube/img/creator/yt_studio_logo.svg" 
              alt="YouTube Studio" 
              className="studio-logo"
            />
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="center-section" ref={searchRef}>
          <div className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input 
              type="text" 
              placeholder="Search across your channel" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Search Dropdown Panel */}
          {showSearchResults && searchQuery.trim() && (
            <div className="search-results-panel">
              <div className="search-category-title">Videos ({matchingVideos.length})</div>
              {matchingVideos.slice(0, 4).map(v => (
                <div 
                  key={v.id} 
                  className="search-result-item" 
                  onClick={() => handleSelectSearchResult(`/channel/UCqpdVWIzEQUcbf4pAxlneOQ/video/${v.id}`)}
                >
                  <img src={v.thumbnail} alt={v.title} className="search-item-thumb" />
                  <div className="search-item-info">
                    <span className="search-item-title">{v.title}</span>
                    <span className="search-item-sub">{v.viewsFormatted} views • {v.date}</span>
                  </div>
                </div>
              ))}

              <div className="search-category-title">Shorts ({matchingShorts.length})</div>
              {matchingShorts.slice(0, 2).map(s => (
                <div 
                  key={s.id} 
                  className="search-result-item" 
                  onClick={() => handleSelectSearchResult(`/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/shorts`)}
                >
                  <span className="material-symbols-outlined search-item-icon">bolt</span>
                  <div className="search-item-info">
                    <span className="search-item-title">{s.title}</span>
                    <span className="search-item-sub">{s.viewsFormatted} views</span>
                  </div>
                </div>
              ))}

              <div className="search-category-title">Playlists ({matchingPlaylists.length})</div>
              {matchingPlaylists.slice(0, 2).map(p => (
                <div 
                  key={p.id} 
                  className="search-result-item" 
                  onClick={() => handleSelectSearchResult(`/channel/UCqpdVWIzEQUcbf4pAxlneOQ/content/playlists`)}
                >
                  <span className="material-symbols-outlined search-item-icon">playlist_play</span>
                  <div className="search-item-info">
                    <span className="search-item-title">{p.title}</span>
                    <span className="search-item-sub">{p.videoCount} videos</span>
                  </div>
                </div>
              ))}

              {matchingVideos.length === 0 && matchingShorts.length === 0 && matchingPlaylists.length === 0 && (
                <div className="no-search-results">No matches found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        {/* Right Nav Actions */}
        <div className="right-section">
          {/* Mode Switcher & OAuth Sync Buttons */}
          <div className="yt-auth-controls">
            {mode === 'connected' ? (
              <>
                <span className="mode-tag connected">Connected Mode</span>
                <button 
                  className="yt-sync-btn" 
                  onClick={() => syncWithYouTube(true)} 
                  disabled={isSyncing}
                  title="Sync with YouTube"
                >
                  <span className={`material-symbols-outlined ${isSyncing ? 'spinning' : ''}`}>sync</span>
                  <span>{isSyncing ? 'Syncing...' : 'Sync with YouTube'}</span>
                </button>
              </>
            ) : null}
          </div>

          {/* Help Button -> Studio CRM Control Panel */}
          <button 
            className="icon-action-btn" 
            onClick={() => navigate('/crm')} 
            title="Studio CRM Control Panel"
          >
            <span className="material-symbols-outlined">help</span>
          </button>

          {/* Notifications Bell */}
          <div className="dropdown-wrapper">
            <button 
              className="icon-action-btn notification-bell-btn" 
              onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
              title="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="notification-badge">{unreadNotificationsCount}</span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotificationsDrawer && (
              <div className="notifications-drawer">
                <div className="drawer-header">
                  <h3>Notifications</h3>
                  {unreadNotificationsCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllNotificationsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="drawer-content">
                  {notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                      <span className="material-symbols-outlined notif-icon">{n.icon}</span>
                      <div className="notif-details">
                        <p className="notif-title">{n.title}</p>
                        <p className="notif-msg">{n.message}</p>
                        <span className="notif-time">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Button Dropdown */}
          <div className="dropdown-wrapper">
            <button className="create-btn" onClick={() => setShowCreateDropdown(!showCreateDropdown)}>
              <span className="material-symbols-outlined">video_call</span>
              <span>CREATE</span>
            </button>

            {showCreateDropdown && (
              <div className="create-dropdown-menu">
                <div className="dropdown-item" onClick={() => { setShowCreateDropdown(false); setUploadModalOpen(true); }}>
                  <span className="material-symbols-outlined">upload</span>
                  <span>Upload videos</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowCreateDropdown(false); showToast("Simulated Live Stream initiated", "info"); }}>
                  <span className="material-symbols-outlined">sensors</span>
                  <span>Go live</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowCreateDropdown(false); showToast("Community Post Creator opened", "info"); }}>
                  <span className="material-symbols-outlined">post_add</span>
                  <span>Create post</span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="dropdown-wrapper">
            <div
              className="top-nav-user-pill"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="Account"
            >
              <img 
                src={channelInfo.avatar || '/channel-avatar.png'} 
                alt="Profile" 
                className="profile-pic"
              />
              <div className="top-nav-user-info">
                <span className="top-nav-user-name">{channelInfo.name || 'Jesus Is The Lord'}</span>
                <span className="top-nav-user-role">You're a manager</span>
              </div>
            </div>

            {showProfileDropdown && (
              <div className="profile-dropdown-menu">
                <div className="profile-menu-header">
                  <img src={channelInfo.avatar} alt="Avatar" className="menu-avatar" />
                  <div>
                    <p className="menu-channel-name">{channelInfo.name}</p>
                    <p className="menu-channel-handle">{channelInfo.handle}</p>
                  </div>
                </div>
                <div className="menu-divider"></div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/channel/UCqpdVWIzEQUcbf4pAxlneOQ/customization/layout'); }}>
                  <span className="material-symbols-outlined">account_box</span>
                  <span>Your channel</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); showToast("Account Switcher simulation active", "info"); }}>
                  <span className="material-symbols-outlined">switch_account</span>
                  <span>Switch account</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); showToast("Opening YouTube Simulation...", "info"); }}>
                  <span className="material-symbols-outlined">smart_display</span>
                  <span>YouTube Main Site</span>
                </div>
                <div className="menu-divider"></div>
                {isConnectedToYouTube ? (
                  <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); disconnectYouTube(); }}>
                    <span className="material-symbols-outlined">logout</span>
                    <span>Disconnect YouTube</span>
                  </div>
                ) : (
                  <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); showToast("Signed out of Studio Simulation", "warning"); }}>
                    <span className="material-symbols-outlined">logout</span>
                    <span>Sign out</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay">
          <div className="help-modal">
            <div className="modal-header">
              <h2>YouTube Studio Help & Feedback</h2>
              <button className="close-btn" onClick={() => setShowHelpModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="help-modal-body">
              <div className="help-search">
                <span className="material-symbols-outlined">search</span>
                <input type="text" placeholder="Describe your issue" />
              </div>
              <h4>Popular Help Topics</h4>
              <ul>
                <li><span className="material-symbols-outlined">description</span> Monetization guidelines for Partner Program</li>
                <li><span className="material-symbols-outlined">description</span> Resolving Copyright Claims & Content ID</li>
                <li><span className="material-symbols-outlined">description</span> Best practices for Shorts Reach</li>
                <li><span className="material-symbols-outlined">description</span> Managing Channel Managers & Permissions</li>
              </ul>
              <button className="send-feedback-btn" onClick={() => { setShowHelpModal(false); showToast("Feedback submitted successfully!", "success"); }}>
                <span className="material-symbols-outlined">feedback</span> Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && <UploadModal onClose={() => setUploadModalOpen(false)} />}
    </>
  );
};

export default TopNav;
