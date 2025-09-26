// This tells TypeScript that a secret variable called INSTA_API_KEY will exist globally.
declare const INSTA_API_KEY: string;

export interface Env {}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, {}, event));
});

async function handleRequest(request: Request, env: Env, event: FetchEvent): Promise<Response> {
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
    const apiKey = INSTA_API_KEY; 

    const apiResponse = await fetch(finalApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Provider Error (Not OK):', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch data from provider', details: errorText }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- START OF NEW ROBUST HANDLING ---
    
    // Get the response as raw text first
    const responseText = await apiResponse.text();
    let data;

    try {
      // Try to parse the text as JSON
      data = JSON.parse(responseText);
    } catch (jsonError) {
      // If parsing fails, it means the response was not valid JSON.
      // This is likely an error message from the provider.
      console.error('API Provider sent non-JSON response:', responseText);
      
      // Return the actual response from the provider so we can see what's wrong
      return new Response(JSON.stringify({ 
        error: 'API provider returned an invalid response.', 
        details: responseText 
      }), {
        status: 502, // 502 Bad Gateway is appropriate here
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- END OF NEW ROBUST HANDLING ---

    // If we reach here, it means parsing was successful.
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('Caught a top-level error:', e.message);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}