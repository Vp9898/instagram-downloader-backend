export interface Env {
  // This tells TypeScript that our environment will have a secret binding named INSTA_API_KEY
  INSTA_API_KEY: string;
}

// We are switching back to the 'export default' module syntax, as it's the modern standard
// and works best with the 'env' parameter for accessing secrets.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // --- SAFETY CHECK USING THE 'env' OBJECT ---
      if (!env.INSTA_API_KEY) {
        return new Response(JSON.stringify({
          error: 'SECRET_NOT_FOUND_IN_ENV',
          details: 'The INSTA_API_KEY secret was not found in the environment bindings.'
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      // --- END OF SAFETY CHECK ---

      const body: { url: string } = await request.json();
      const instagramUrl = body.url;

      if (!instagramUrl) {
        return new Response(JSON.stringify({ error: 'Instagram URL is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const baseUrl = 'https://zylalabs.com/api/2006/instagram+media+downloader+api/6285/download+all+content';
      const finalApiUrl = `${baseUrl}?url=${encodeURIComponent(instagramUrl)}`;
      
      // Access the key from the 'env' object passed into the function
      const apiKey = env.INSTA_API_KEY;

      const apiResponse = await fetch(finalApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const responseText = await apiResponse.text();

      if (!apiResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch data from provider', details: responseText }), {
          status: apiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const data = JSON.parse(responseText);
        return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      } catch (jsonError) {
        return new Response(JSON.stringify({ error: 'API provider returned an invalid response.', details: responseText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'An unexpected internal error occurred', details: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};