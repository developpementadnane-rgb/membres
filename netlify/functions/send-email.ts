import { handleSendEmail } from "../../server/routes/email";
import { runExpressHandler } from "./_shared/express-shim";

export const handler = async (event: {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  path?: string;
}) => {
  const headers = event.headers || {};
  const host = headers.host || "mon-shm.netlify.app";
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body || "";
  const request = new Request(`https://${host}${event.path || "/api/send-email"}`, {
    method: event.httpMethod || "POST",
    headers: Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
    body: event.httpMethod === "GET" || event.httpMethod === "HEAD" ? undefined : body,
  });
  const response = await runExpressHandler(handleSendEmail, request);
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
};
