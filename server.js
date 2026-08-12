const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const players = {};
const messages = [];
let coins = [];

function createCoin() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * 90 + 5,
    y: Math.random() * 90 + 5,
    value: Math.floor(Math.random() * 3) + 1
  };
}

for (let i = 0; i < 5; i++) {
  coins.push(createCoin());
}

setInterval(() => {
  if (coins.length < 10) {
    coins.push(createCoin());
    io.emit('coins-update', coins);
  }
}, 3000);

io.on('connection', (socket) => {
  console.log('لاعب دخل:', socket.id);
  
  players[socket.id] = {
    x: 50,
    y: 50,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    name: 'لاعب',
    score: 0
  };
  
  socket.emit('coins-update', coins);
  
  socket.on('set-name', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name;
      io.emit('players-update', players);
      
      const msg = {
        name: 'النظام',
        text: `${name} دخل اللعبة! 🎉`,
        color: '#00ff88',
        time: new Date().toLocaleTimeString('ar')
      };
      messages.push(msg);
      io.emit('new-message', msg);
    }
  });
  
  socket.on('send-message', (text) => {
    if (players[socket.id] && text.trim()) {
      const msg = {
        name: players[socket.id].name,
        text: text.trim(),
        color: players[socket.id].color,
        time: new Date().toLocaleTimeString('ar')
      };
      messages.push(msg);
      if (messages.length > 50) messages.shift();
      io.emit('new-message', msg);
    }
  });
  
  io.emit('players-update', players);
  
  socket.on('move', (pos) => {
    if (players[socket.id]) {
      players[socket.id].x = pos.x;
      players[socket.id].y = pos.y;
      io.emit('players-update', players);
      checkCoinCollision(socket.id, pos);
    }
  });
  
  socket.on('disconnect', () => {
    const name = players[socket.id]?.name || 'لاعب';
    delete players[socket.id];
    io.emit('players-update', players);
    
    const msg = {
      name: 'النظام',
      text: `${name} خرج من اللعبة 👋`,
      color: '#ff4444',
      time: new Date().toLocaleTimeString('ar')
    };
    messages.push(msg);
    io.emit('new-message', msg);
  });
});

function checkCoinCollision(playerId, pos) {
  const player = players[playerId];
  if (!player) return;
  
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const dx = pos.x - coin.x;
    const dy = pos.y - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) {
      player.score += coin.value;
      coins.splice(i, 1);
      
      io.emit('players-update', players);
      io.emit('coins-update', coins);
      
      const msg = {
        name: 'النظام',
        text: `${player.name} جمع ${coin.value} 🪙! مجموعه: ${player.score}`,
        color: '#ffd700',
        time: new Date().toLocaleTimeString('ar')
      };
      messages.push(msg);
      io.emit('new-message', msg);
      
      setTimeout(() => {
        if (coins.length < 10) {
          coins.push(createCoin());
          io.emit('coins-update', coins);
        }
      }, 2000);
      
      break;
    }
  }
}

// ✨ التعديل المهم: Render بيحدد البورت بنفسه
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 السيرفر شغال على بورت ${PORT}`);
});