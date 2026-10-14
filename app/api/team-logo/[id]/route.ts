export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return new Response("Invalid team id", { status: 400 });
  }

  const apiKey = process.env.SPORTAPI_API_KEY;
  if (!apiKey) {
    return new Response("Logo service not configured", { status: 503 });
  }

  try {
    const upstream = await fetch(
      `https://sportapi.ai/api/teams/${id}/logo`,
      {
        headers: { "X-Api-Key": apiKey },
        next: { revalidate: 86400 },
      }
    );

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response("Logo provider returned a non-image response", {
        status: 502,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return new Response("Logo provider unavailable", { status: 502 });
  }
}