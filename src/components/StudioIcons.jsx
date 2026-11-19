import React from 'react';

export function AskSparkleIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
    </svg>
  );
}

export function AiReportIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19.5 11.4V14.5C19.5 15.6 18.6 16.5 17.5 16.5H8.2L4 20.5V5.5C4 4.4 4.9 3.5 6 3.5H13.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.6 8.2H12.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.6 11.4H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 2.4L18.9 5.5L22 6.4L18.9 7.3L18 10.4L17.1 7.3L14 6.4L17.1 5.5L18 2.4Z" fill="currentColor" />
    </svg>
  );
}

export function ContentDetectionIcon({ size = 20, active = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="16"
        height="13"
        rx="2"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9.2 8.2L13.5 10.5L9.2 12.8V8.2Z"
        fill={active ? '#ffffff' : 'currentColor'}
      />
      <circle cx="17.5" cy="17.5" r="2.8" fill="#ffffff" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.6 19.6L21.5 21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function HubContentIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6.2" y="4" width="13.8" height="11.6" rx="2.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 8.5V17.2C3.5 18.4 4.5 19.4 5.7 19.4H15.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.6 7.4L15.6 9.8L11.6 12.2V7.4Z" fill="currentColor" />
    </svg>
  );
}

export function HubAudienceIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8.2" r="2.35" stroke="currentColor" strokeWidth="1.55" />
      <path d="M7.6 18.4C7.6 16.2 9.5 14.6 12 14.6C14.5 14.6 16.4 16.2 16.4 18.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <circle cx="5.8" cy="10.4" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.6 17.5C2.6 15.9 3.9 14.8 5.8 14.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18.2" cy="10.4" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21.4 17.5C21.4 15.9 20.1 14.8 18.2 14.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HubRevenueIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 6.8V17.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M14.2 9.4C14.2 8.4 13.2 7.8 12 7.8C10.8 7.8 9.8 8.4 9.8 9.4C9.8 10.6 11.1 11.0 12.1 11.4C13.2 11.8 14.3 12.3 14.3 13.6C14.3 14.8 13.3 15.6 12 15.6C10.7 15.6 9.7 14.9 9.7 13.8"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HubResearchIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="10.2" cy="10.2" r="6.5" stroke="currentColor" strokeWidth="1.65" />
      <path d="M15 15L19.6 19.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7.2" y="10.1" width="1.4" height="3.2" rx="0.35" fill="currentColor" />
      <rect x="9.5" y="7.4" width="1.4" height="5.9" rx="0.35" fill="currentColor" />
      <rect x="11.8" y="11.1" width="1.4" height="2.2" rx="0.35" fill="currentColor" />
    </svg>
  );
}

export function HubReachIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M13.5 6.2A7.2 7.2 0 1 0 17.8 10.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M12.5 9.1A4.2 4.2 0 1 0 14.9 11.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <circle cx="11" cy="13" r="1.45" fill="currentColor" />
      <path d="M11 13L19.1 4.9" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M16.3 4.4V7.7H19.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HubEngagementIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.2 12C4.3 8.1 7.9 6.0 12 6.0C16.1 6.0 19.7 8.1 21.8 12C19.7 15.9 16.1 18.0 12 18.0C7.9 18.0 4.3 15.9 2.2 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.55" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}
