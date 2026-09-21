export default async (req, context) => {

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers
    });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Méthode non autorisée" },
      { status: 405, headers }
    );
  }

  try {

    const body = await req.json();
    const prompt = body.prompt || "";

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY absente dans Netlify" },
        { status: 500, headers }
      );
    }

    const apiResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },

        body: JSON.stringify({
          model: "claude-sonnet-4-6",

          max_tokens: 2000,

          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 5,

              user_location: {
                type: "approximate",
                city: "Vannes",
                region: "Bretagne",
                country: "FR",
                timezone: "Europe/Paris"
              }
            }
          ],

          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await apiResponse.json();

    // IMPORTANT :
    // on renvoie maintenant la vraie erreur Anthropic.
    if (!apiResponse.ok) {

      console.error("Erreur Anthropic :", data);

      return Response.json(
        {
          error:
            data?.error?.message ||
            "Erreur API Anthropic",

          details: data
        },
        {
          status: apiResponse.status,
          headers
        }
      );
    }

    const text = (data.content || [])
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("");

    return Response.json(
      {
        text,
        usage: data.usage || null
      },
      {
        status: 200,
        headers
      }
    );

  } catch (error) {

    console.error("Erreur Netlify events :", error);

    return Response.json(
      {
        error: error.message
      },
      {
        status: 500,
        headers
      }
    );
  }
}
