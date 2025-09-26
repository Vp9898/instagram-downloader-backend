// This tells TypeScript that a secret variable called INSTA_API_KEY will exist globally.
declare const INSTA_API_KEY: string;

// Define the structure of the environment variables (for other bindings if needed)
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

    // --- START OF UPDATED SECTION ---

    // 1. Define the base URL for the ZylaLabs API
    const baseUrl = 'https://zylalabs.com/api/2006/instagram+media+downloader+api/6285/download+all+content';

    // 2. Build the final URL by adding the Instagram URL as a query parameter
    const finalApiUrl = `${baseUrl}?url=${encodeURIComponent(instagramUrl)}`;

    // 3. Read the secret API key
    const apiKey = INSTA_API_KEY; 

    // 4. Call the external API using GET method
    const apiResponse = await fetch(finalApiUrl, {
      method: 'GET', // <-- IMPORTANT: Changed to GET
      headers: {
        // The API provider requires the Authorization header
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // --- END OF UPDATED SECTION ---

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Provider Error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch data from provider' }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}