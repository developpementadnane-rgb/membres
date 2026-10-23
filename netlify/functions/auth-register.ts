import { handleRegister } from "../../server/routes/auth";
import { runExpressHandler } from "./_shared/express-shim";

// Same rationale as auth-login.ts: native v2 function, reuses the existing
// handleRegister logic unchanged, just reached through a transport that
// can't mangle the JSON body.
export default async (req: Request): Promise<Response> => {
  return runExpressHandler(handleRegister, req);
};
