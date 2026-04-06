import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({
  connections,
  activeUserId,
  messages,
  selfUser,
  activeRoomId,
  onSelectUser,
  onSendMessage,
}) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConn = connections.find((c) => c.userId === activeUserId);

  const send = () => {
    const text = input.trim();
    if (!text || !activeRoomId) return;
    onSendMessage(activeRoomId, text);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="flex flex-col border-l"
      style={{
        width: 300,
        minWidth: 300,
        background: '#0f111a',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: '#4ade80' }}
        />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Nearby
        </span>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
          {connections.length} connected
        </span>
      </div>

      {connections.length > 1 && (
        <div
          className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {connections.map((conn) => (
            <button
              key={conn.userId}
              onClick={() => onSelectUser(conn.userId)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all"
              style={{
                fontSize: 11,
                fontWeight: 500,
                background:
                  conn.userId === activeUserId
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.04)',
                color:
                  conn.userId === activeUserId
                    ? '#fff'
                    : 'rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: conn.color }}
              />
              {conn.username}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
            <div style={{ fontSize: 32 }}>👋</div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              Say hello to{' '}
              <span style={{ color: activeConn?.color }}>
                {activeConn?.username}
              </span>
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isSelf = msg.senderId === selfUser?.socketId;
            const time = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={i}
                className={`flex flex-col gap-0.5 ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {!isSelf && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.3)',
                      paddingLeft: 4,
                    }}
                  >
                    {msg.senderName}
                  </span>
                )}
                <div
                  className="relative max-w-xs px-3 py-2"
                  style={{
                    fontSize: 13,
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    borderRadius: isSelf
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: isSelf
                      ? 'linear-gradient(135deg, #4f46e5cc, #7c3aedcc)'
                      : 'rgba(255,255,255,0.08)',
                    color: isSelf ? '#fff' : 'rgba(255,255,255,0.88)',
                  }}
                >
                  {msg.content}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.18)',
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {time}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeConn?.username ?? ''}…`}
            maxLength={500}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: '#fff', fontSize: 13 }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                : 'transparent',
              color: input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
              fontSize: 16,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
