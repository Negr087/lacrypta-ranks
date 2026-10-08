import './wsPolyfill';
import { nwc } from '@getalby/sdk';

let client: nwc.NWCClient | null = null;

export function nwcConfigurado(): boolean {
  return !!process.env.NWC_URL;
}

function getClient(): nwc.NWCClient {
  if (!process.env.NWC_URL) throw new Error('NWC_URL no está configurada');
  if (!client) {
    client = new nwc.NWCClient({ nostrWalletConnectUrl: process.env.NWC_URL });
  }
  return client;
}

function resetClient(): void {
  try {
    client?.close();
  } catch {
    // ignore
  }
  client = null;
}

async function conReintento<T>(fn: (c: nwc.NWCClient) => Promise<T>): Promise<T> {
  try {
    return await fn(getClient());
  } catch (error) {
    // Errores explícitos de la wallet no se reintentan
    if (error instanceof nwc.Nip47WalletError) throw error;
    resetClient();
    return await fn(getClient());
  }
}

export async function crearFactura(
  sats: number,
  descripcion: string,
  expirySegundos: number,
): Promise<{ invoice: string; paymentHash: string }> {
  const tx = await conReintento((c) =>
    c.makeInvoice({ amount: sats * 1000, description: descripcion, expiry: expirySegundos }),
  );
  return { invoice: tx.invoice, paymentHash: tx.payment_hash };
}

export async function facturaPagada(paymentHash: string): Promise<boolean> {
  const tx = await conReintento((c) => c.lookupInvoice({ payment_hash: paymentHash }));
  return tx.state === 'settled' || (!!tx.settled_at && tx.settled_at > 0) || !!tx.preimage;
}

export async function pagarFactura(invoice: string): Promise<void> {
  // Sin reintento automático: un timeout no significa que no se haya pagado.
  await getClient().payInvoice({ invoice });
}

/** Monto de una factura mainnet en millisats (null si no tiene monto o no se entiende). */
export function montoFacturaMsats(invoice: string): number | null {
  const m = /^lnbc(\d+)([munp]?)1/i.exec(invoice.trim());
  if (!m) return null;
  const picoPorUnidad: Record<string, number> = { '': 1e12, m: 1e9, u: 1e6, n: 1e3, p: 1 };
  const pico = Number(m[1]) * picoPorUnidad[m[2]!.toLowerCase()]!;
  const msats = pico / 10;
  return Number.isInteger(msats) ? msats : null;
}

const LN_ADDRESS_RE = /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export function esLightningAddress(texto: string): boolean {
  return LN_ADDRESS_RE.test(texto.trim());
}

export function esFacturaLn(texto: string): boolean {
  return /^lnbc[0-9a-z]+$/i.test(texto.trim());
}

/** Pide una factura de exactamente `sats` a una Lightning address y la paga. */
export async function pagarALightningAddress(address: string, sats: number): Promise<void> {
  const [user, domain] = address.trim().split('@');
  const msats = sats * 1000;

  const res = await fetch(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(user!)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`LNURL respondió ${res.status}`);
  const info: any = await res.json();
  if (!info.callback || info.tag !== 'payRequest') throw new Error('Lightning address inválida');
  if (msats < info.minSendable || msats > info.maxSendable) {
    throw new Error('Esa Lightning address no acepta ese monto');
  }

  const url = new URL(info.callback);
  url.searchParams.set('amount', String(msats));
  const res2 = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res2.ok) throw new Error(`LNURL callback respondió ${res2.status}`);
  const data: any = await res2.json();
  if (!data.pr) throw new Error('La Lightning address no devolvió factura');
  if (montoFacturaMsats(data.pr) !== msats) throw new Error('La factura devuelta no tiene el monto correcto');

  await pagarFactura(data.pr);
}

export const NwcWalletError = nwc.Nip47WalletError;
