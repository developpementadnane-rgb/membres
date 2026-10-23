import { handleSavePdfQrCode } from "../../server/routes/auth";
import { runExpressHandler } from "./_shared/express-shim";

export default async (req: Request): Promise<Response> => {
  return runExpressHandler(handleSavePdfQrCode, req);
}
