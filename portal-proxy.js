// Eli's World portal proxy: a tiny Cloudflare Worker that lets Eli's World read your Moodle calendar link.
// Why it is needed: browsers block pages from reading other websites directly (CORS). This worker fetches the
// calendar for you and adds the permission header. It only allows Moodle calendar export links.
const ALLOWED_ORIGIN = '*'; // After deploying, change '*' to your site address, e.g. 'https://eli.example.com'

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('u');
    if (!target || !/\/calendar\/export_execute\.php/.test(target)) {
      return new Response('Only Moodle calendar export links are allowed.', { status: 400, headers: cors });
    }
    const upstream = await fetch(target);
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...cors, 'content-type': 'text/calendar; charset=utf-8' },
    });
  },
};
