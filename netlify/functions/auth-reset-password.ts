import { handleResetPassword } from "../../server/routes/passwordReset";
import { runExpressHandler } from "./_shared/express-shim";

type NetlifyEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  rawUrl?: string;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type NetlifyResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

function toRequest(event: Request | NetlifyEvent): Request {
  if (event instanceof Request) return event;

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers || {})) {
    if (value !== undefined) headers.set(name, value);
  }

  const body = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body
    : undefined;
  const url = new URL(event.rawUrl || `https://mon-shm.netlify.app${event.path || "/"}`);
  for (const [name, value] of Object.entries(event.queryStringParameters || {})) {
    if (value !== undefined) url.searchParams.set(name, value);
  }

  return new Request(url, {
    method: event.httpMethod || "GET",
    headers,
    body: event.httpMethod === "GET" || event.httpMethod === "HEAD" ? undefined : body,
  });
}

async function toNetlifyResponse(response: Response): Promise<NetlifyResponse> {
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}

export const handler = async (event: Request | NetlifyEvent): Promise<NetlifyResponse> => {
  const response = await runExpressHandler(handleResetPassword, toRequest(event));
  return toNetlifyResponse(response);
};

export default handler;
