// Node 20 no trae WebSocket global y la librería de Nostr lo necesita.
// Este archivo tiene que importarse ANTES que @getalby/sdk.
import WebSocket from 'ws';

if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}
