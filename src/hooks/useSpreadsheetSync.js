import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { SpreadsheetDataService } from '../services/SpreadsheetDataService';

export function useSpreadsheetSync() {
  const {
    loadPermanentState,
    loadFromSpreadsheet,
    spreadsheetConfig,
    isSpreadsheetLoading,
    showToast
  } = useStore();

  const intervalRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Permanent local file state load (no database required)
    if (loadPermanentState) {
      loadPermanentState().then((loaded) => {
        if (!loaded) {
          loadFromSpreadsheet(true);
        }
      });
    } else {
      loadFromSpreadsheet(true);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [loadPermanentState, loadFromSpreadsheet]);

  useEffect(() => {
    // Cross-tab real-time sync for CRM updates
    const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('yt-studio-sync') : null;
    if (syncChannel) {
      syncChannel.onmessage = (msg) => {
        if (msg.data?.type === 'CRM_UPDATED') {
          if (msg.data.state) {
            useStore.setState({
              ...msg.data.state,
              hasCrmOverrides: true,
              dateRangeVersion: (useStore.getState().dateRangeVersion || 0) + 1
            });
          }
          if (useStore.persist?.rehydrate) {
            useStore.persist.rehydrate().then(() => {
              useStore.setState((s) => ({ dateRangeVersion: (s.dateRangeVersion || 0) + 1 }));
            });
          }
        }
      };
    }

    const handleStorage = (e) => {
      if (e.key && e.key.startsWith('yt-studio-analytics')) {
        if (useStore.persist?.rehydrate) {
          useStore.persist.rehydrate().then(() => {
            useStore.setState((s) => ({ dateRangeVersion: (s.dateRangeVersion || 0) + 1 }));
          });
        }
      }
    };

    const handleFocus = () => {
      if (useStore.persist?.rehydrate) {
        useStore.persist.rehydrate().then(() => {
          useStore.setState((s) => ({ dateRangeVersion: (s.dateRangeVersion || 0) + 1 }));
        });
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (syncChannel) syncChannel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const seconds = spreadsheetConfig?.autoRefreshInterval;
    if (seconds && seconds > 0 && !isSpreadsheetLoading) {
      intervalRef.current = setInterval(() => {
        loadFromSpreadsheet(true);
      }, seconds * 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spreadsheetConfig?.autoRefreshInterval, loadFromSpreadsheet, isSpreadsheetLoading]);

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (spreadsheetConfig?.liveSync) {
      unsubscribeRef.current = SpreadsheetDataService.subscribeToEvents(async (event) => {
        if (event.type === 'data-updated') {
          await loadFromSpreadsheet(true, true);
          if (!useStore.getState().hasCrmOverrides) {
            showToast('Spreadsheet updated — data reloaded', 'info');
          }
        }
      });
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [spreadsheetConfig?.liveSync, loadFromSpreadsheet, showToast]);
}
