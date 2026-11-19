import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import SettingsModal from './components/SettingsModal';
import { useSpreadsheetSync } from './hooks/useSpreadsheetSync';

import Dashboard from './pages/Dashboard';
import Content from './pages/Content';
import VideoDetails from './pages/VideoDetails';
import Analytics from './pages/Analytics';
import Comments from './pages/Comments';
import Subtitles from './pages/Subtitles';
import Copyright from './pages/Copyright';
import Earn from './pages/Earn';
import Customization from './pages/Customization';
import AudioLibrary from './pages/AudioLibrary';
import CRM from './pages/CRM';

import MobileBottomNav from './components/MobileBottomNav';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

function AppContent() {
  useSpreadsheetSync();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsMobileDrawerOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <div className="app-container">
      <TopNav onToggleSidebar={handleToggleSidebar} />
      <div className="main-content-wrapper">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
          onOpenSettings={() => setShowSettingsModal(true)} 
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to={`${CHANNEL_PREFIX}/dashboard`} replace />} />
            
            {/* Real YouTube Studio Routes */}
            <Route path="/channel/:channelId/dashboard" element={<Dashboard />} />
            <Route path="/channel/:channelId/content/*" element={<Content />} />
            <Route path="/channel/:channelId/video/:id/analytics/*" element={<Analytics />} />
            <Route path="/channel/:channelId/video/:id/edit" element={<VideoDetails />} />
            <Route path="/channel/:channelId/video/:id/:section/*" element={<VideoDetails />} />
            <Route path="/channel/:channelId/video/:id" element={<VideoDetails />} />
            <Route path="/channel/:channelId/analytics/*" element={<Analytics />} />
            <Route path="/channel/:channelId/community/*" element={<Comments />} />
            <Route path="/channel/:channelId/languages" element={<Subtitles />} />
            <Route path="/channel/:channelId/content-detection" element={<Copyright />} />
            <Route path="/channel/:channelId/monetization/*" element={<Earn />} />
            <Route path="/channel/:channelId/customization/*" element={<Customization />} />
            <Route path="/channel/:channelId/audio-library/*" element={<AudioLibrary />} />
            <Route path="/channel/:channelId/settings/*" element={<Dashboard />} />

            {/* Backward compatibility redirects */}
            <Route path="/dashboard" element={<Navigate to={`${CHANNEL_PREFIX}/dashboard`} replace />} />
            <Route path="/content" element={<Navigate to={`${CHANNEL_PREFIX}/content/videos`} replace />} />
            <Route path="/video/:id/analytics/*" element={<Analytics />} />
            <Route path="/video/:id" element={<Navigate to={`${CHANNEL_PREFIX}/video/:id/edit`} replace />} />
            <Route path="/analytics" element={<Navigate to={`${CHANNEL_PREFIX}/analytics/hub_overview`} replace />} />
            <Route path="/comments" element={<Navigate to={`${CHANNEL_PREFIX}/community/comments`} replace />} />
            <Route path="/subtitles" element={<Navigate to={`${CHANNEL_PREFIX}/languages`} replace />} />
            <Route path="/copyright" element={<Navigate to={`${CHANNEL_PREFIX}/content-detection`} replace />} />
            <Route path="/earn" element={<Navigate to={`${CHANNEL_PREFIX}/monetization/overview`} replace />} />
            <Route path="/customization" element={<Navigate to={`${CHANNEL_PREFIX}/customization/layout`} replace />} />
            <Route path="/library" element={<Navigate to={`${CHANNEL_PREFIX}/audio-library/music`} replace />} />

            <Route path="*" element={<Navigate to={`${CHANNEL_PREFIX}/dashboard`} replace />} />
          </Routes>
        </main>
      </div>

      <MobileBottomNav onOpenMenu={() => setIsMobileDrawerOpen(true)} />

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
      <Toast />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* CRM — standalone, no YT Studio layout */}
        <Route path="/crm/*" element={<CRM />} />
        {/* YouTube Studio — full layout with TopNav + Sidebar */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
