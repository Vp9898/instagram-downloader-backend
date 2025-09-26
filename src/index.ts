export interface Env {
  INSTA_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- نقطة نهاية الوكيل: مهمتها جلب الصور فقط ---
    if (url.pathname === '/image-proxy') {
      const imageUrl = url.searchParams.get('url');
      if (!imageUrl) {
        return new Response('Missing image URL', { status: 400 });
      }
      // قم بجلب الصورة من المصدر الأصلي وأعدها كما هي
      // هذا يتجاوز كل مشاكل CORS في الواجهة الأمامية
      const imageResponse = await fetch(imageUrl, { headers: { 'Referer': 'https://www.instagram.com/' } });
      return new Response(imageResponse.body, imageResponse);
    }

    // --- الكود الأصلي لنقطة النهاية الرئيسية ---
    const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (request.method === 'OPTIONS') { return new Response(null, { headers: corsHeaders }); }
    if (request.method !== 'POST') { return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

    try {
      if (!env.INSTA_API_KEY) { return new Response(JSON.stringify({ error: 'SECRET_NOT_FOUND_IN_ENV' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
      const body: { url: string } = await request.json();
      if (!body.url) { return new Response(JSON.stringify({ error: 'Instagram URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
      
      const baseUrl = 'https://zylalabs.com/api/2006/instagram+media+downloader+api/6285/download+all+content';
      const finalApiUrl = `${baseUrl}?url=${encodeURIComponent(body.url)}`;
      const apiKey = env.INSTA_API_KEY;
      
      const apiResponse = await fetch(finalApiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` }});
      const responseText = await apiResponse.text();
      if (!apiResponse.ok) { return new Response(JSON.stringify({ error: 'Failed to fetch data from provider', details: responseText }), { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
      
      const data = JSON.parse(responseText);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'An unexpected internal error occurred', details: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  },
};