const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Send a welcome message to the newly connected client
  socket.emit('message', 'Welcome to the Socket.IO server!');
  
  // Broadcast to all other clients that a new user has joined
  socket.broadcast.emit('message', `User ${socket.id} has joined`);
  
  // Handle chat messages
  socket.on('chatMessage', (msg) => {
    console.log('Message received:', msg);
    
    // Broadcast the message to all connected clients
    io.emit('message', `${socket.id}: ${msg}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('message', `User ${socket.id} has disconnected`);
  });
});
function emitnet() {
  exec('head /sys/class/net/docker0/statistics/tx_bytes | numfmt --to iec --format "%8.4f"', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    io.emit('tx', { tx: stdout })
  })
  exec('head /sys/class/net/docker0/statistics/rx_bytes | numfmt --to iec --format "%8.4f"', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    io.emit('rx', { rx: stdout })
  }
)}

// Send current time every 10 secs
setInterval(emitnet, 100);
// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});