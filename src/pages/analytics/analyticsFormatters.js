import { fmtV, fmtW, formatINR } from '../../store/useStore';
import { formatSingleDate } from '../../engine/AnalyticsSimulationEngine';

export function formatCompactINR(val) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return '₹0.00';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs < 1000) return `${sign}${formatINR(abs)}`;
  if (abs < 100000) return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (abs < 10000000) {
    const lakhs = abs / 100000;
    const formatted = lakhs >= 10 ? lakhs.toFixed(1).replace(/\.0$/, '') : lakhs.toFixed(2).replace(/\.00$/, '');
    return `${sign}₹${formatted}L`;
  }
  const cr = abs / 10000000;
  const formattedCr = cr >= 10 ? cr.toFixed(1).replace(/\.0$/, '') : cr.toFixed(2).replace(/\.00$/, '');
  return `${sign}₹${formattedCr}Cr`;
}

export function formatHoursValue(val) {
  return String(fmtW(Number(val || 0)))
    .replace(/\s*hrs$/i, '')
    .trim();
}

export function formatPctValue(val, fallback = '0.0%') {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    return trimmed.endsWith('%') ? trimmed : `${trimmed}%`;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return `${num.toFixed(1)}%`;
}

export function formatCountComma(val) {
  return Math.round(Number(val || 0)).toLocaleString('en-IN');
}

export function formatPublishDate(rowOrDate) {
  const raw =
    typeof rowOrDate === 'object' && rowOrDate !== null
      ? rowOrDate.publishDate || rowOrDate.date
      : rowOrDate;
  if (!raw) return 'Recently';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
    return formatSingleDate(raw);
  }
  return String(raw);
}

export function getVideoRevenueValue(video) {
  if (!video) return 0;
  if (typeof video.revenue === 'number' && Number.isFinite(video.revenue)) {
    return video.revenue;
  }
  const str = video.estRevenue || video.revenueFormatted || '';
  if (str) {
    const parsed = Number(String(str).replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const views = Number(video.views) || 0;
  const rpm = Number(video.rpm) || 33.64;
  return parseFloat(((views / 1000) * rpm).toFixed(2));
}

export function getVideoRevenueFormatted(video, compact = false) {
  if (
    !compact &&
    video?.estRevenue &&
    typeof video.estRevenue === 'string' &&
    video.estRevenue.includes('₹')
  ) {
    return video.estRevenue;
  }
  const num = getVideoRevenueValue(video);
  return compact ? formatCompactINR(num) : formatINR(num);
}

export function formatMetricValue(metricKey, value, { compact = false } = {}) {
  const num = Number(value || 0);
  if (metricKey === 'revenue') {
    return compact ? formatCompactINR(num) : formatINR(num);
  }
  if (metricKey === 'watchTimeHrs') return formatHoursValue(num);
  if (metricKey === 'ctr') return formatPctValue(num);
  if (metricKey === 'subscribers') {
    return `${num >= 0 ? '+' : ''}${fmtV(Math.round(num))}`;
  }
  return fmtV(Math.round(num));
}
