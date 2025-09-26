// Define the structure of the environment variables (our secrets)
export interface Env {
  INSTA_API_KEY: string;
}

// Use the older "addEventListener" format for maximum compatibility
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, {} as Env, event));
});

async function handleRequest(request: Request, env: Env, event: FetchEvent): Promise<Response> {
  // Add CORS headers to allow requests from our frontend
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, replace '*' with your frontend's domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // We only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the Instagram URL from the request body
    const body: { url: string } = await request.json();
    const instagramUrl = body.url;

    if (!instagramUrl) {
      return new Response(JSON.stringify({ error: 'Instagram URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- This is the most important part ---
    // We will now call the paid API service

    // IMPORTANT: Replace this with the actual API endpoint from your provider
    const apiProviderUrl = 'https://api.example.com/download';

    // Get the secret API key from the environment variables
    // NOTE: In this format, we access secrets differently. We will configure this in Cloudflare UI.
    const apiKey = env.INSTA_API_KEY; 

    // Call the external API
    const apiResponse = await fetch(apiProviderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Check your provider's documentation
      },
      body: JSON.stringify({
        url: instagramUrl,
      }),
    });

    // Check if the external API call was successful
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Provider Error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch data from provider' }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the JSON data from the API provider's response
    const data = await apiResponse.json();

    // Send the successful data back to our frontend
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