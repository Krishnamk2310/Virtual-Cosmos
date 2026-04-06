import { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import LoginScreen from './components/LoginScreen';
import CosmosCanvas from './components/CosmosCanvas';
import ChatPanel from './components/ChatPanel';

export default function App() {
  const [phase, setPhase] = useState('login');
  const [selfUser, setSelfUser] = useState(null);
  const [otherUsers, setOtherUsers] = useState(new Map());
  const [connections, setConnections] = useState(new Map());
  const [messages, setMessages] = useState(new Map());
  const [activeUserId, setActiveUserId] = useState(null);

  useEffect(() => {
    socket.on('self-joined', (user) => {
      setSelfUser(user);
      setPhase('cosmos');
    });

    socket.on('existing-users', (users) => {
      setOtherUsers((prev) => {
        const next = new Map(prev);
        users.forEach((u) => next.set(u.socketId, u));
        return next;
      });
    });

    socket.on('user-joined', (user) => {
      setOtherUsers((prev) => new Map(prev).set(user.socketId, user));
    });

    socket.on('user-moved', ({ socketId, position, direction }) => {
      setOtherUsers((prev) => {
        const user = prev.get(socketId);
        if (!user) return prev;
        return new Map(prev).set(socketId, { ...user, position, direction });
      });
    });

    socket.on('user-left', ({ socketId }) => {
      setOtherUsers((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setConnections((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('proximity-connect', ({ userId, username, color, spriteId, roomId }) => {
      setConnections((prev) =>
        new Map(prev).set(userId, { userId, username, color, spriteId, roomId })
      );
      setActiveUserId((prev) => prev ?? userId);
    });

    socket.on('proximity-disconnect', ({ userId }) => {
      setConnections((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on('new-message', (message) => {
      setMessages((prev) => {
        const existing = prev.get(message.roomId) ?? [];
        return new Map(prev).set(message.roomId, [...existing, message]);
      });
    });

    return () => {
      socket.off('self-joined');
      socket.off('existing-users');
      socket.off('user-joined');
      socket.off('user-moved');
      socket.off('user-left');
      socket.off('proximity-connect');
      socket.off('proximity-disconnect');
      socket.off('new-message');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeUserId && !connections.has(activeUserId)) {
      const next = connections.keys().next().value ?? null;
      setActiveUserId(next);
    }
    if (!activeUserId && connections.size > 0) {
      setActiveUserId(connections.keys().next().value);
    }
  }, [connections, activeUserId]);

  const handleJoin = useCallback((username, spriteId) => {
    socket.connect();
    socket.emit('join', { username, spriteId });
  }, []);

  const handleMove = useCallback((x, y, direction) => {
    socket.emit('move', { x, y, direction });
    setSelfUser((prev) => prev ? { ...prev, position: { x, y }, direction } : null);
  }, []);

  const handleSendMessage = useCallback((roomId, content) => {
    socket.emit('chat-message', { roomId, content });
  }, []);

  const activeConnection = connections.get(activeUserId);
  const activeMessages = activeConnection
    ? (messages.get(activeConnection.roomId) ?? [])
    : [];

  if (phase === 'login') {
    return <LoginScreen onJoin={handleJoin} />;
  }

  return (
    <div className="flex w-full h-full bg-[#0b0d14]">
      <div className="relative flex-1 overflow-hidden">
        <CosmosCanvas
          selfUser={selfUser}
          otherUsers={Array.from(otherUsers.values())}
          nearbyUserIds={new Set(connections.keys())}
          onMove={handleMove}
        />

        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/60 text-xs">
            {otherUsers.size + 1} in cosmos
          </span>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5">
          <span className="text-white/30 text-xs">
            WASD · Arrow Keys to move &nbsp;·&nbsp; Get close to chat
          </span>
        </div>
      </div>

      {connections.size > 0 && (
        <ChatPanel
          connections={Array.from(connections.values())}
          activeUserId={activeUserId}
          messages={activeMessages}
          selfUser={selfUser}
          activeRoomId={activeConnection?.roomId}
          onSelectUser={setActiveUserId}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
