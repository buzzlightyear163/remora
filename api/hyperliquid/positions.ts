// Vercel Function: GET /api/hyperliquid/positions (shared handler in server/hl.ts)
import { handleHyperliquid } from '../../server/hl.js';

export default {
  fetch(request: Request) {
    return handleHyperliquid(request);
  },
};
