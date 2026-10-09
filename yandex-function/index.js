const https = require('https');

const SUPABASE_HOST = 'rgluzdxikpagugpmusbp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rcvNssgN4_dPnVUpjU0bjQ_1cEWsA52';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const SAFE_RETRY_RPC = new Set([
  'public_admin_session_from_buffet_token',
  'public_admin_web_login',
  'public_daily_items_v2',
  'public_employee_meal_summary',
  'public_freezer_items',
  'public_global_chat_unread',
  'public_home',
  'public_incoming_transfers',
  'public_kitchen_supply_dishes',
  'public_point_bootstrap',
  'public_point_options',
  'public_transfer_point_options',
  'public_web_login',
  'admin_employee_directory'
]);

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const agent = new https.Agent({ keepAlive: true, maxSockets: 20 });

function response(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

function parsePayload(event, context) {
  try {
    if (context && typeof context.getPayload === 'function') {
      const payload = context.getPayload();
      if (payload && typeof payload === 'object') return payload;
    }
  } catch (_) {}

  const raw = event && Object.prototype.hasOwnProperty.call(event, 'body')
    ? event.body
    : event;

  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

function callSupabase(rpc, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = https.request({
      protocol: 'https:',
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/rpc/' + encodeURIComponent(rpc),
      method: 'POST',
      family: 4,
      agent,
      timeout: timeoutMs,
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode || 502,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });

    req.on('timeout', () => {
      const error = new Error('Supabase upstream timeout');
      error.code = 'UPSTREAM_TIMEOUT';
      req.destroy(error);
    });
    req.on('error', reject);
    req.end(payload);
  });
}

module.exports.handler = async function handler(event, context) {
  const method =
    event?.httpMethod ||
    event?.requestContext?.http?.method ||
    'POST';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const payload = parsePayload(event, context);
  const rpc = String(payload.rpc || '');
  const body = payload.body && typeof payload.body === 'object' ? payload.body : {};

  if (!/^(public_|admin_)[a-zA-Z0-9_]+$/.test(rpc)) {
    return response(400, { message: 'RPC is not allowed' });
  }

  const maxAttempts = SAFE_RETRY_RPC.has(rpc) ? 2 : 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = typeof context?.getRemainingTimeInMillis === 'function'
      ? context.getRemainingTimeInMillis()
      : 10000;
    // Editing a past kitchen transfer recalculates linked reports and can exceed 2.5 seconds.
    // Respect function execution time, but give this authorized write a longer upstream window.
    const upstreamLimit = rpc === 'admin_save_kitchen_supply_document' ? 20000 : 2500;
    const upstreamTimeout = Math.max(1200, Math.min(upstreamLimit, remaining - 800));
    const started = Date.now();

    try {
      const upstream = await callSupabase(rpc, body, upstreamTimeout);
      console.log(JSON.stringify({
        requestId: context?.requestId || null,
        rpc,
        attempt,
        durationMs: Date.now() - started,
        upstreamStatus: upstream.status
      }));

      if (
        SAFE_RETRY_RPC.has(rpc) &&
        RETRYABLE_STATUS.has(upstream.status) &&
        attempt < maxAttempts
      ) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }

      return response(upstream.status, upstream.body);
    } catch (error) {
      lastError = error;
      console.error(JSON.stringify({
        requestId: context?.requestId || null,
        rpc,
        attempt,
        durationMs: Date.now() - started,
        error: error?.message || String(error),
        code: error?.code || null
      }));

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
    }
  }

  return response(502, {
    message: 'Yandex gateway could not reach Supabase',
    code: lastError?.code || 'UPSTREAM_ERROR'
  });
};
