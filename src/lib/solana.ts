/**
 * Devnet token deployment helper (stand-in for the reference's `window.whaleSolana`).
 *
 * The reference builds a fixed-supply Token-2022 mint transaction on its server (prepare → wallet signs → submit → status).
 * That backend isn't public, so this clone ships:
 *   - real wallet detection + connect (Phantom / Solflare / Backpack injected providers)
 *   - real read-only devnet quote (balance + rent via public devnet RPC)
 *   - a clearly labelled DEMO wallet that walks the whole flow locally without touching any chain
 * TODO(backend): implement prepare/submit/status (server route) to deploy real devnet tokens from connected wallets.
 */

export type Quote = {
  rentLamports: number;
  feeLamports: number;
  totalLamports: number;
  balanceLamports: number;
  mint: string;
  lastValidBlockHeight: number;
  demo: boolean;
};

export type DeployStatus = { state: 'confirmed' | 'pending' | 'failed' | 'expired'; message?: string };

type InjectedProvider = {
  connect: () => Promise<{ publicKey: { toString(): string } } | void>;
  publicKey?: { toString(): string } | null;
};

declare global {
  interface Window {
    phantom?: { solana?: InjectedProvider };
    solflare?: InjectedProvider;
    backpack?: InjectedProvider;
  }
}

export const DEMO_WALLET = 'Demo wallet';
const DEVNET_RPC = 'https://api.devnet.solana.com';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const randomBase58 = (len: number) => Array.from(crypto.getRandomValues(new Uint8Array(len)), b => B58[b % 58]).join('');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const providers = (): Record<string, InjectedProvider | undefined> => ({
  Phantom: window.phantom?.solana,
  Solflare: window.solflare,
  Backpack: window.backpack,
});

let connected: { name: string; owner: string } | null = null;
const demoSignatures = new Map<string, number>();

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch(DEVNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(12000),
  });
  const j = (await r.json()) as { result?: T; error?: { message: string } };
  if (j.error || j.result === undefined) throw new Error(j.error?.message || 'Devnet RPC unavailable');
  return j.result;
}

/** Approximate Token-2022 mint size with metadata-pointer + token-metadata extensions. */
const mintSize = (name: string, symbol: string) => 82 + 83 + 1 + 4 + 64 + 4 + 32 + 32 + 4 + name.length + 4 + symbol.length + 4 + 0 + 4;

export const solana = {
  async wallets(): Promise<string[]> {
    const found = Object.entries(providers())
      .filter(([, p]) => !!p)
      .map(([name]) => name);
    return [...found, DEMO_WALLET];
  },

  async connect(name: string): Promise<string> {
    if (name === DEMO_WALLET) {
      await sleep(500);
      connected = { name, owner: randomBase58(44) };
      return connected.owner;
    }
    const p = providers()[name];
    if (!p) throw new Error(`${name} isn't available in this browser.`);
    const res = await p.connect();
    const key = (res && 'publicKey' in res ? res.publicKey : p.publicKey)?.toString();
    if (!key) throw new Error('Wallet connection cancelled.');
    connected = { name, owner: key };
    return key;
  },

  async prepare({ name, symbol }: { name: string; symbol: string; supply: number }): Promise<Quote> {
    if (!connected) throw new Error('Connect a wallet first.');
    const feeLamports = 10000; // 2 signatures × 5000 lamports
    if (connected.name === DEMO_WALLET) {
      await sleep(700);
      const rentLamports = 3_264_960 + 2_074_080;
      return { rentLamports, feeLamports, totalLamports: rentLamports + feeLamports, balanceLamports: 2_000_000_000, mint: randomBase58(44), lastValidBlockHeight: 0, demo: true };
    }
    const [balance, mintRent, ataRent, blockhash] = await Promise.all([
      rpc<{ value: number }>('getBalance', [connected.owner]),
      rpc<number>('getMinimumBalanceForRentExemption', [mintSize(name, symbol)]),
      rpc<number>('getMinimumBalanceForRentExemption', [170]),
      rpc<{ value: { lastValidBlockHeight: number } }>('getLatestBlockhash', []),
    ]);
    const rentLamports = mintRent + ataRent;
    return {
      rentLamports,
      feeLamports,
      totalLamports: rentLamports + feeLamports,
      balanceLamports: balance.value,
      mint: '(assigned when the transaction is built)',
      lastValidBlockHeight: blockhash.value.lastValidBlockHeight,
      demo: false,
    };
  },

  async deploy(quote: Quote, onSigned: (signature: string) => void): Promise<void> {
    if (!quote.demo) {
      // TODO(backend): build the Token-2022 mint transaction server-side, have the wallet sign it, then submit.
      throw new Error('Real devnet deployment needs the launch backend (TODO(backend)). Use the demo wallet to walk through the flow.');
    }
    await sleep(900);
    const sig = randomBase58(88);
    demoSignatures.set(sig, Date.now());
    onSigned(sig);
  },

  async status(signature: string): Promise<DeployStatus> {
    const started = demoSignatures.get(signature);
    if (started == null) return { state: 'failed', message: 'Unknown transaction.' };
    return Date.now() - started > 1800 ? { state: 'confirmed' } : { state: 'pending' };
  },
};
