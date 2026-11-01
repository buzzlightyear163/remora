// Vercel Function: GET /api/hyperliquid/icon (shared handler in server/hl.ts)
import { handleHyperliquid } from '../../server/hl.js';

export default {
  fetch(request: Request) {
    return handleHyperliquid(request);
  },
};
