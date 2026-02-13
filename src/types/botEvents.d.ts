// by Tincho

export interface BotEvent {
  name: string; // Nombre del evento
  once?: boolean | false; // Por única vez?
  execute: (...args) => void; // Ejecución del evento
}
