import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spreadsheetService } from './spreadsheet/index.js';
import { normalizeForVideo } from './spreadsheet/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CRM_STORE_FILE = path.resolve(__dirname, 'crm_store.json');

export function registerSpreadsheetRoutes(app) {
  // Permanent CRM Storage endpoints backed by local JSON file (server/crm_store.json)
  app.get('/api/crm/data', async (req, res) => {
    try {
      if (fs.existsSync(CRM_STORE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CRM_STORE_FILE, 'utf8'));
        return res.json({ success: true, source: 'local_file', data });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      console.error('[Server] Error reading crm_store.json:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/crm/save', async (req, res) => {
    try {
      const payload = req.body || {};
      fs.writeFileSync(CRM_STORE_FILE, JSON.stringify(payload, null, 2), 'utf8');
      res.json({ success: true, savedAt: new Date().toISOString(), permanentFile: true });
    } catch (err) {
      console.error('[Server] Error saving crm_store.json:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/spreadsheet/status', (req, res) => {
    res.json(spreadsheetService.getStatus());
  });

  app.get('/api/spreadsheet/data', async (req, res) => {
    try {
      if (!spreadsheetService.cache) {
        await spreadsheetService.load();
      }
      const videoId = req.query.videoId;
      let data = spreadsheetService.getData();
      if (videoId) {
        data = normalizeForVideo(data, videoId);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/spreadsheet/refresh', async (req, res) => {
    try {
      const data = await spreadsheetService.load(true);
      spreadsheetService.broadcast({ type: 'data-updated', loadedAt: spreadsheetService.lastLoadedAt });
      res.json({ success: true, loadedAt: spreadsheetService.lastLoadedAt, meta: data.meta });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/spreadsheet/config', (req, res) => {
    res.json(spreadsheetService.getStatus());
  });

  app.post('/api/spreadsheet/config', (req, res) => {
    try {
      const { source, excelPath, googleSheetsId, autoRefreshInterval, liveSync } = req.body;
      const updates = {};
      if (source) updates.source = source;
      if (excelPath) updates.excelPath = excelPath;
      if (googleSheetsId !== undefined) updates.googleSheetsId = googleSheetsId;
      if (autoRefreshInterval !== undefined) updates.autoRefreshInterval = Number(autoRefreshInterval);
      if (liveSync !== undefined) updates.liveSync = Boolean(liveSync);

      spreadsheetService.saveConfig(updates);
      res.json({ success: true, status: spreadsheetService.getStatus() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/spreadsheet/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    send({ type: 'connected', loadedAt: spreadsheetService.lastLoadedAt });

    const unsubscribe = spreadsheetService.subscribe(send);

    req.on('close', () => {
      unsubscribe();
    });
  });

  spreadsheetService.load().catch(err => {
    console.error('[Spreadsheet] Initial load failed:', err.message);
  });
}
