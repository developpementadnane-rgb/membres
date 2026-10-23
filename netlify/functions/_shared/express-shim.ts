import type { RequestHandler, Request as ExpressRequest, Response as ExpressResponse } from "express";

/**
 * Runs an existing Express RequestHandler (e.g. handleLogin, handleRegister
 * from server/routes/auth.ts) against a real, native Netlify Functions v2
 * Request object -- WITHOUT going through serverless-http.
 *
 * Why this exists: on this project, the classic Express-wrapped-in-
 * serverless-http Netlify Function (netlify/functions/api.ts) has been
 * observed to occasionally deliver a mangled req.body -- a JSON string
 * "shattered" into an object with numeric keys ('0','1','2',...), one
 * character per key, instead of the parsed object. Netlify Functions v2
 * gives us a standards-compliant Fetch API Request instead, whose
 * `.text()`/`.json()` are always correct -- there is no event-simulation
 * layer in between that can corrupt the body. We read the body correctly
 * here, then hand it to the EXISTING, already-correct handler logic
 * unchanged, via a minimal fake Express req/res.
 *
 * The handler must only use req.body/req.headers/req.query/req.params and
 * respond via res.status(...).json(...) -- which is the case for every
 * handler in server/routes/auth.ts.
 */
// Origines autorisées à appeler cette API depuis un navigateur : l'app packagée (Capacitor)
// et le(s) domaine(s) web déployé(s), ce second groupe étant fourni via CORS_ORIGIN (liste
// séparée par des virgules dans les variables d'environnement Netlify). "*" bloquerait toute
// protection : n'importe quel autre site pourrait rejouer les requêtes d'un visiteur connecté.
const STATIC_ALLOWED_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "http://localhost"]);
const ENV_ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && (STATIC_ALLOWED_ORIGINS.has(origin) || ENV_ALLOWED_ORIGINS.has(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export async function runExpressHandler(handler: RequestHandler, webRequest: Request): Promise<Response> {
  const corsHeaders = corsHeadersFor(webRequest.headers.get("origin"));

  // Handle CORS preflight requests (sent by browsers/WebViews before a
  // cross-origin POST with a JSON body). Without this, requests coming
  // from the packaged APK (origin capacitor://localhost / https://localhost)
  // are blocked by the browser before they even reach the logic below --
  // this is invisible on the Netlify web build because there the app and
  // the API share the same origin, so no preflight is ever triggered.
  if (webRequest.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body: unknown;

  if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
    const rawText = await webRequest.text();
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        return jsonResponse(400, { error: "Corps de requête JSON invalide." });
      }
    }
  }

  const headers: Record<string, string> = {};
  webRequest.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const url = new URL(webRequest.url);

  const fakeReq = {
    body,
    headers,
    method: webRequest.method,
    query: Object.fromEntries(url.searchParams),
    params: {},
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as ExpressRequest;

  let statusCode = 200;
  let responseBody: unknown;

  const fakeRes = {
    status(code: number) {
      statusCode = code;
      return fakeRes;
    },
    json(payload: unknown) {
      responseBody = payload;
      return fakeRes;
    },
    send(payload: unknown) {
      responseBody = payload;
      return fakeRes;
    },
    set() {
      return fakeRes;
    },
    setHeader() {
      return fakeRes;
    },
    type() {
      return fakeRes;
    },
    sendStatus(code: number) {
      statusCode = code;
      responseBody = undefined;
      return fakeRes;
    },
    end() {
      return fakeRes;
    },
  } as unknown as ExpressResponse;

  try {
    await handler(fakeReq, fakeRes, () => {});
  } catch (error) {
    console.error("[runExpressHandler] handler threw:", error);
    return jsonResponse(500, { error: "حدث خطأ في الاتصال، حاول مجددًا" }, corsHeaders);
  }

  return jsonResponse(statusCode, responseBody, corsHeaders);
}

function jsonResponse(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(body !== undefined ? JSON.stringify(body) : null, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders },
  });
}
