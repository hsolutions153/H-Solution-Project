const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function getBackendUrl(path: string, search: string): string {
  const rawUrl = process.env.API_URL;
  if (!rawUrl) throw new Error("API_URL is not configured");
  const baseUrl = new URL(rawUrl);
  const basePath = baseUrl.pathname.replace(/^\/+|\/+$/g, "");
  baseUrl.pathname = basePath === "api/v1" ? "/api/v1" : basePath ? `/${basePath}/api/v1` : "/api/v1";
  return `${baseUrl.toString().replace(/\/$/, "")}/${path}${search}`;
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  const response = await fetch(getBackendUrl(path.join("/"), new URL(request.url).search), {
    method: request.method,
    headers,
    body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
    redirect: "manual",
  });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
