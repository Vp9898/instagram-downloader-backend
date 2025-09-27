export interface Env {
  INSTA_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // --- الوكيل الخاص بالصور (لا تغيير هنا) ---
      const url = new URL(request.url);
      if (url.pathname === '/image-proxy') {
        const imageUrl = url.searchParams.get('url');
        if (!imageUrl) return new Response('Missing image URL', { status: 400 });
        return await fetch(imageUrl);
      }
      
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!env.INSTA_API_KEY) {
        return new Response(JSON.stringify({ error: 'API Key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const body: { url: string } = await request.json();
      if (!body.url) {
        return new Response(JSON.stringify({ error: 'Instagram URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const baseUrl = 'https://zylalabs.com/api/2006/instagram+media+downloader+api/6285/download+all+content';
      const finalApiUrl = `${baseUrl}?url=${encodeURIComponent(body.url)}`;
      
      const apiResponse = await fetch(finalApiUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${env.INSTA_API_KEY}` },
      });

      // --- الإصلاح الحاسم هنا ---
      // نقوم بإعادة توجيه الاستجابة من ZylaLabs كما هي، سواء كانت ناجحة أم فاشلة
      // هذا يضمن أن الواجهة الأمامية ستحصل دائمًا على JSON صحيح
      const responseBody = await apiResponse.text();
      return new Response(responseBody, {
        status: apiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
      
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'Internal Worker Error', details: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },
};