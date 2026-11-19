import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileBottomNav.css';

const CHANNEL_PREFIX = '/channel/UCqpdVWIzEQUcbf4pAxlneOQ';

const navItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: `${CHANNEL_PREFIX}/dashboard`,
  },
  {
    key: 'content',
    label: 'Content',
    icon: 'video_library',
    path: `${CHANNEL_PREFIX}/content/videos`,
  },
  {
    key: 'analytics',
    label: 'Insights',
    icon: 'bar_chart',
    path: `${CHANNEL_PREFIX}/analytics/hub_overview`,
  },
  {
    key: 'community',
    label: 'Comments',
    icon: 'forum',
    path: `${CHANNEL_PREFIX}/community/comments`,
  },
  {
    key: 'earn',
    label: 'Earn',
    icon: 'monetization_on',
    path: `${CHANNEL_PREFIX}/monetization/overview`,
  },
];

export default function MobileBottomNav({ onOpenMenu }) {
  const location = useLocation();

  const isItemActive = (item) => {
    const path = location.pathname;
    if (item.key === 'dashboard') return path.includes('/dashboard');
    if (item.key === 'content') return path.includes('/content') || path.includes('/video');
    if (item.key === 'analytics') return path.includes('/analytics');
    if (item.key === 'community') return path.includes('/community') || path.includes('/comments');
    if (item.key === 'earn') return path.includes('/monetization') || path.includes('/earn');
    return false;
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const active = isItemActive(item);
        return (
          <NavLink
            key={item.key}
            to={item.path}
            className={`mobile-bottom-tab ${active ? 'active' : ''}`}
          >
            <span className={`material-symbols-outlined mobile-tab-icon ${active ? 'active-icon' : ''}`}>
              {item.icon}
            </span>
            <span className="mobile-tab-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
