import type { Plugin, Connect } from 'vite';
import { handleHyperliquid } from './hl';

/**
 * Serves /api/hyperliquid/* inside the Vite dev and preview servers, using the same handler
 * as the Vercel Functions in api/hyperliquid/ (see server/hl.ts).
 */
const middleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url || !req.url.startsWith('/api/hyperliquid/')) return next();
  const response = await handleHyperliquid(new Request(new URL(req.url, 'http://localhost')));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
};

export function hyperliquidApi(): Plugin {
  return {
    name: 'remora-hyperliquid-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
