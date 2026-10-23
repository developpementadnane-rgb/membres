import { handleLogin } from "../../server/routes/auth";
import { runExpressHandler } from "./_shared/express-shim";

// Netlify Functions v2: native Fetch API (Request -> Response), no
// serverless-http, no Express in the request path. Reuses the existing,
// already-correct handleLogin business logic from server/routes/auth.ts
// unchanged -- only the transport differs.
export default async (req: Request): Promise<Response> => {
  return runExpressHandler(handleLogin, req);
};
