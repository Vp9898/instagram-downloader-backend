declare const INSTA_API_KEY: string;

export interface Env {}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, {}, event));
});

async function handleRequest(request: Request, env: Env, event: FetchEvent): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') { return new Response(null, { headers: corsHeaders }); }
  if (request.method !== 'POST') { return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

  try {
    // --- NEW SAFETY CHECK ---
    // First, check if the secret key actually exists.
    if (typeof INSTA_API_KEY === 'undefined' || INSTA_API_KEY === '') {
      return new Response(JSON.stringify({ 
        error: 'SECRET_NOT_CONFIGURED',
        details: 'The INSTA_API_KEY secret is missing, empty, or not configured correctly in the Cloudflare dashboard.' 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    // --- END OF SAFETY CHECK ---

    const body: { url: string } = await request.json();
    const instagramUrl = body.url;

    if (!instagramUrl) { return new Response(JSON.stringify({ error: 'Instagram URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});}

    const baseUrl = 'https://zylalabs.com/api/2006/instagram+media+downloader+api/6285/download+all+content';
    const finalApiUrl = `${baseUrl}?url=${encodeURIComponent(instagramUrl)}`;
    const apiKey = INSTA_API_KEY; 

    const apiResponse = await fetch(finalApiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` }});

    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch data from provider', details: responseText }), { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    try {
      const data = JSON.parse(responseText);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'API provider returned an invalid response.', details: responseText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'An unexpected internal error occurred', details: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}