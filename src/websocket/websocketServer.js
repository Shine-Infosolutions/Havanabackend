const WebSocket = require('ws');

let wss = null;

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data);
        
        // Broadcast message to all connected clients
        broadcast(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'Connected to Banquet WebSocket server'
    }));
  });

  console.log('WebSocket server initialized');
};

const broadcast = (data) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
};

const notifyBookingUpdate = (type, data) => {
  broadcast({
    type,
    data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  initializeWebSocket,
  broadcast,
  notifyBookingUpdate
};