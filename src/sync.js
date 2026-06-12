// Tiny client wrapper around the Local-LAN host's WebSocket hub.
// Auto-reconnects and re-announces its role (host/phone) on every (re)connect,
// queueing sends while briefly offline. The board uses role:"host"; phones use
// role:"phone". See server/host.mjs for the message protocol.
export function makeClient({ role, code, onMessage, onStatus }) {
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  const host = typeof location !== "undefined" ? location.host : "localhost:8080";
  const url = `${proto}://${host}/ws`;
  let ws = null, closed = false, retry = null, queue = [];
  let roomCode = code || null; // host may be assigned a code by the server

  const announce = () => {
    if (role === "host") ws.send(JSON.stringify({ t: "host", code: roomCode || undefined }));
    else ws.send(JSON.stringify({ t: "join", code: roomCode }));
  };
  const connect = () => {
    onStatus && onStatus("connecting");
    ws = new WebSocket(url);
    ws.onopen = () => { onStatus && onStatus("open"); announce(); queue.forEach((m) => ws.send(m)); queue = []; };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === "hosted") roomCode = m.code; onMessage && onMessage(m); };
    ws.onclose = () => { if (closed) return; onStatus && onStatus("offline"); retry = setTimeout(connect, 1500); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  };
  connect();

  return {
    send: (obj) => { const s = JSON.stringify(obj); if (ws && ws.readyState === 1) ws.send(s); else queue.push(s); },
    code: () => roomCode,
    close: () => { closed = true; clearTimeout(retry); try { ws && ws.close(); } catch {} },
  };
}
