const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function getBackendUrl(path: string, search: string): string {
  const rawUrl = process.env.API_URL;
  if (!rawUrl) throw new Error("API_URL is not configured");
  const baseUrl = new URL(rawUrl);
  if (baseUrl.pathname === "/" || baseUrl.pathname === "") baseUrl.pathname = "/api/v1";
  baseUrl.pathname = baseUrl.pathname.replace(/\/$/, "");
  return `${baseUrl.toString().replace(/\/$/, "")}/${path}${search}`;
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = getBackendUrl(path.join("/"), new URL(request.url).search);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  const setCookies = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  responseHeaders.delete("set-cookie");
  for (const cookie of setCookies.length > 0 ? setCookies : response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []) {
    responseHeaders.append("set-cookie", cookie.replace(/Path=\/api\/v1\/auth/gi, "Path=/api/backend/auth"));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
