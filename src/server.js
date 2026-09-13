const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const cors = require('cors');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const swaggerUi = require('swagger-ui-express');

const { Storage } = require('./storage');
const swaggerDocument = require('./swagger.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 9590;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '8-A Sinf Homework Manager API Docs'
}));

// Real-time WebSocket broadcasting
function broadcast(eventType, payload) {
  const message = JSON.stringify({ event: eventType, payload, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    event: 'CONNECTED',
    payload: { message: 'Real-time sync connected', time: new Date().toISOString() }
  }));

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ event: 'PONG' }));
      }
    } catch (e) {
      // ignore
    }
  });
});

// Helper to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// REST API ROUTES

// 1. Subjects list
app.get('/api/subjects', (req, res) => {
  try {
    const subjects = Storage.getSubjects();
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Homework data (Current status)
app.get('/api/homework', (req, res) => {
  try {
    const homework = Storage.getHomework();
    res.json({ success: true, data: homework });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward compatibility for /api/weeks/:weekKey
app.get('/api/weeks/:weekKey', (req, res) => {
  try {
    const homework = Storage.getHomework();
    res.json({
      success: true,
      data: {
        weekKey: req.params.weekKey,
        subjects: homework
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Toggle subject completion
app.post(['/api/homework/toggle', '/api/weeks/:weekKey/toggle'], (req, res) => {
  try {
    const { subjectId, completed } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId kiritilishi shart' });
    }

    const result = Storage.toggleSubject(subjectId, completed);
    broadcast('HOMEWORK_TOGGLED', result);
    // backward compat broadcast
    broadcast('SUBJECT_TOGGLED', { subjectId, status: result.status });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Update subject assignment details
app.put(['/api/homework/subjects/:subjectId', '/api/weeks/:weekKey/subjects/:subjectId'], (req, res) => {
  try {
    const { subjectId } = req.params;
    const { assignment, note, deadline } = req.body;

    const result = Storage.updateSubjectDetails(subjectId, { assignment, note, deadline });
    broadcast('HOMEWORK_DETAILS_UPDATED', { subjectId, details: result });
    broadcast('SUBJECT_DETAILS_UPDATED', { subjectId, details: result });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Reset all homework for a new week
app.post(['/api/homework/reset', '/api/weeks/:weekKey/reset'], (req, res) => {
  try {
    const homework = Storage.resetHomework();
    broadcast('HOMEWORK_RESET', { homework });
    broadcast('WEEK_RESET', { week: { subjects: homework } });

    res.json({ success: true, data: homework });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Mark all as completed
app.post(['/api/homework/mark-all', '/api/weeks/:weekKey/mark-all'], (req, res) => {
  try {
    const { completed = true } = req.body;
    const homework = Storage.markAllHomework(completed);
    broadcast('HOMEWORK_MARKED_ALL', { homework, completed });
    broadcast('WEEK_MARKED_ALL', { week: { subjects: homework }, completed });

    res.json({ success: true, data: homework });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Custom tasks
app.get('/api/custom-tasks', (req, res) => {
  try {
    const tasks = Storage.getCustomTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/custom-tasks', (req, res) => {
  try {
    const { title, category, description, dueDate, priority } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Vazifa sarlavhasi kiritilishi shart' });
    }

    const newTask = Storage.addCustomTask({ title, category, description, dueDate, priority });
    broadcast('CUSTOM_TASK_ADDED', newTask);

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/custom-tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = Storage.updateCustomTask(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Topshiriq topilmadi' });
    }

    broadcast('CUSTOM_TASK_UPDATED', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/custom-tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = Storage.deleteCustomTask(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Topshiriq topilmadi' });
    }

    broadcast('CUSTOM_TASK_DELETED', { id });
    res.json({ success: true, message: 'Topshiriq muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Obsidian Markdown Export
app.get('/api/export-markdown', (req, res) => {
  try {
    const markdown = Storage.getObsidianMarkdown();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="8A_Uy_Ishlari.md"');
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Overview / Stats
app.get('/api/overview', (req, res) => {
  try {
    const overview = Storage.getOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Network info & QR Code generation
app.get('/api/network-info', async (req, res) => {
  try {
    const ip = getLocalIpAddress();
    const networkUrl = `http://${ip}:${PORT}`;
    const localUrl = `http://localhost:${PORT}`;

    const qrCodeDataUrl = await QRCode.toDataURL(networkUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        ip,
        port: PORT,
        localUrl,
        networkUrl,
        qrCode: qrCodeDataUrl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log('\n======================================================');
  console.log('   8-A SINF HOMEWORK MANAGER (MINIMALIST & CLEAN)');
  console.log('======================================================');
  console.log(`[LAPTOP / BROWSER]:  http://localhost:${PORT}`);
  console.log(`[TELEFON (WI-FI)]:   http://${localIp}:${PORT}`);
  console.log(`[SWAGGER API DOCS]:  http://localhost:${PORT}/api-docs`);
  console.log('======================================================\n');
});
