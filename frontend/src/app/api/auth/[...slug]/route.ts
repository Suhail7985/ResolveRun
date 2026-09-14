import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const COOKIE = "resolverun_token";

function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

async function proxy(request: NextRequest, slug: string[]) {
  const path = slug.join("/");
  const url = new URL(request.url);
  const target = `${API_BASE}/api/auth/${path}${url.search}`;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the API. Is it running on port 4000?" },
      { status: 502 }
    );
  }

  const body = await upstream.text();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  for (const cookieHeader of setCookies) {
    response.headers.append("Set-Cookie", cookieHeader);
  }

  if (path === "logout") {
    response.cookies.set(COOKIE, "", { ...cookieOptions(), maxAge: 0, expires: new Date(0) });
  }

  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return proxy(request, slug);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return proxy(request, slug);
}
