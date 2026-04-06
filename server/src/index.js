import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-cosmos')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.warn('MongoDB unavailable – chat history disabled:', err.message));

const users = new Map();

const PROXIMITY_RADIUS = 150;

const AVATAR_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#e91e63',
  '#00bcd4', '#ff5722', '#8bc34a', '#673ab7',
];

let colorCursor = 0;

const distance = (a, b) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const roomId = (id1, id2) => [id1, id2].sort().join('::');

function checkProximity(movingSocket, movingUser) {
  users.forEach((other, otherId) => {
    if (otherId === movingSocket.id) return;

    const dist = distance(movingUser.position, other.position);
    const wasNearby = movingUser.nearbyUsers.has(otherId);
    const isNearby = dist < PROXIMITY_RADIUS;

    if (isNearby && !wasNearby) {
      movingUser.nearbyUsers.add(otherId);
      other.nearbyUsers.add(movingSocket.id);

      const room = roomId(movingSocket.id, otherId);
      movingSocket.join(room);
      io.sockets.sockets.get(otherId)?.join(room);

      movingSocket.emit('proximity-connect', {
        userId: otherId,
        username: other.username,
        color: other.color,
        spriteId: other.spriteId,
        roomId: room,
      });
      io.to(otherId).emit('proximity-connect', {
        userId: movingSocket.id,
        username: movingUser.username,
        color: movingUser.color,
        spriteId: movingUser.spriteId,
        roomId: room,
      });
    } else if (!isNearby && wasNearby) {
      movingUser.nearbyUsers.delete(otherId);
      other.nearbyUsers.delete(movingSocket.id);

      const room = roomId(movingSocket.id, otherId);
      movingSocket.leave(room);
      io.sockets.sockets.get(otherId)?.leave(room);

      movingSocket.emit('proximity-disconnect', { userId: otherId, roomId: room });
      io.to(otherId).emit('proximity-disconnect', {
        userId: movingSocket.id,
        roomId: room,
      });
    }
  });
}

io.on('connection', (socket) => {
  socket.on('join', ({ username, spriteId }) => {
    const color = AVATAR_COLORS[colorCursor % AVATAR_COLORS.length];
    colorCursor++;

    const user = {
      socketId: socket.id,
      username: username.trim().slice(0, 24),
      color,
      spriteId: spriteId || 'human-1',
      direction: 'down',
      position: {
        x: 200 + Math.random() * 900,
        y: 150 + Math.random() * 500,
      },
      nearbyUsers: new Set(),
    };

    users.set(socket.id, user);

    socket.emit('self-joined', {
      socketId: socket.id,
      username: user.username,
      color: user.color,
      spriteId: user.spriteId,
      position: user.position,
    });

    const others = [];
    users.forEach((u, sid) => {
      if (sid !== socket.id) {
        others.push({
          socketId: u.socketId,
          username: u.username,
          color: u.color,
          spriteId: u.spriteId,
          position: u.position,
        });
      }
    });
    socket.emit('existing-users', others);

    socket.broadcast.emit('user-joined', {
      socketId: socket.id,
      username: user.username,
      color: user.color,
      spriteId: user.spriteId,
      position: user.position,
    });
  });

  socket.on('move', ({ x, y, direction }) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (direction) user.direction = direction;

    user.position = {
      x: Math.max(24, Math.min(1576, Number(x) || 0)),
      y: Math.max(24, Math.min(876, Number(y) || 0)),
    };

    socket.broadcast.emit('user-moved', {
      socketId: socket.id,
      position: user.position,
      direction: user.direction,
    });

    checkProximity(socket, user);
  });

  socket.on('chat-message', async ({ roomId: room, content }) => {
    const user = users.get(socket.id);
    if (!user || !content?.trim()) return;

    const message = {
      roomId: room,
      senderId: socket.id,
      senderName: user.username,
      content: content.trim().slice(0, 500),
      timestamp: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      Message.create(message).catch(() => {});
    }

    io.to(room).emit('new-message', message);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      user.nearbyUsers.forEach((otherId) => {
        const other = users.get(otherId);
        if (other) {
          other.nearbyUsers.delete(socket.id);
          const room = roomId(socket.id, otherId);
          io.to(otherId).emit('proximity-disconnect', {
            userId: socket.id,
            roomId: room,
          });
        }
      });
    }
    users.delete(socket.id);
    io.emit('user-left', { socketId: socket.id });
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', users: users.size }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Virtual Cosmos server → http://localhost:${PORT}`);
});
