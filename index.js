const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const fs = require("fs/promises");
const { stdout } = require('process');
let txprev = 0;
let rxprev = 0;
// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  io.emit('socket', { socket: socket.id });
  
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
  });
});
async function emitnet() {
  const txStr = (await fs.readFile("/sys/class/net/docker0/statistics/tx_bytes")).toString();
  const txBytes = Number(txStr);
  const tx = (txBytes / 1024 / 1024 / 1024).toLocaleString("en-US", {
    style: "unit",
    unit: "gigabyte",
    unitDisplay: "short",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const rxStr = (await fs.readFile("/sys/class/net/docker0/statistics/rx_bytes")).toString();
  const rxBytes = Number(rxStr);
  const rx = (rxBytes / 1024 / 1024 / 1024).toLocaleString("en-US", {
    style: "unit",
    unit: "gigabyte",
    unitDisplay: "short",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });;
  io.emit('call', { tx: tx, rx: rx });
}

async function emitspeed() {
  const txStr = (await fs.readFile("/sys/class/net/docker0/statistics/tx_bytes")).toString();
  const txBytes = Number(txStr);
  const txSpeed = (txBytes - txprev);
  const tx = (txSpeed / 1024 / 1024).toLocaleString("en-US", {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "short",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const rxStr = (await fs.readFile("/sys/class/net/docker0/statistics/rx_bytes")).toString();
  const rxBytes = Number(rxStr);
  const rxSpeed = (rxBytes - rxprev);
  const rx = (rxSpeed / 1024 / 1024).toLocaleString("en-US", {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "short",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });;
  txprev = (await fs.readFile("/sys/class/net/docker0/statistics/tx_bytes")).toString();
  rxprev = (await fs.readFile("/sys/class/net/docker0/statistics/rx_bytes")).toString();
  io.emit('speed', { tx: tx, rx: rx });
}
// Send current time every 10 secs
function emitdisk() {
  exec("df -h / | awk \'NR==2 {print $5}\' | tr -d \'%\'", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    io.emit('disk', { disk: stdout })
  }
)}
function emitcpu() {
  exec("top -bn1 | grep \"Cpu(s)\" | awk \'{print $2 + $4}\'", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    io.emit('cpu', { cpu: stdout })
  }
)}
async function emitstatus() {
  const Trip = (await fs.readFile("../TRIP")).toString();
  const TripNmbr = Number(Trip);
  exec("sudo docker ps -qaf \"status=running\" | wc -l", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    if (TripNmbr == 0) {
      statusarch = "Running"
    } else {
      statusarch = "Tripped"
    }
    io.emit('status', { trip: statusarch, containers: stdout });
  })
}
setInterval(emitnet, 100);
setInterval(emitcpu, 200);
setInterval(emitspeed, 1000);
setInterval(emitdisk, 5 * 1000);
setInterval(emitstatus, 5 * 1000);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});