import { Router } from "express";
import {
  destroySessionController,
  aiAgentController,
} from "../controllers/noetix-chat.v2.controller";
import {
  requireAccessTokenV2,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";

const router = Router();

// All admin access levels may use the Noetix chat; tool availability is
// filtered per role server-side (read-only roles get read-permission tools
// only — see buildNoetixTools in chat-tool.types.ts).
const NOETIX_ALLOWED_ACCESS = [
  psits_roles.ADMIN,
  psits_roles.FINANCE,
  psits_roles.DEVELOPER,
  psits_roles.EXECUTIVE,
  psits_roles.HEAD_FINANCE,
  psits_roles.STANDARD,
  psits_roles.NO_ACCESS,
];

router.post(
  "/ai-agent",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(NOETIX_ALLOWED_ACCESS),
  aiAgentController
);

router.post(
  "/session/destroy",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(NOETIX_ALLOWED_ACCESS),
  destroySessionController
);

export default router;
