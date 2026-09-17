import { Router } from "express";
import { promoController } from "../controllers/promo.v2.controller";
import { requireAccessTokenV2, requireAccessTokenWithDBCheck, roleAuthenticateV2, adminAccessAuthenticateV2 } from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";
const router = Router();

// Create promo — admin + finance/admin access
router.post(
  "/create",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  promoController.create
);

// Fetch all promos — admin or student
router.get(
  "/fetch",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  promoController.fetchAll
);

// Delete promo — admin + finance/admin access
router.delete(
  "/delete/:id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  promoController.softDelete
);

// Verify promo (student-facing) — admin or student
// DB check required: "Members"/"Membership" eligibility reads orgRole and
// membershipStatus, which the access token does not carry.
router.get(
  "/verify/:promo_id/:merchId",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin", "student"]),
  promoController.verifyPromo
);

// Get promo logs — admin only
router.get(
  "/log",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  promoController.getLogs
);

// Update promo — admin + finance/admin access
router.post(
  "/update",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  promoController.update
);

// Get eligible promos for cart items — admin or student
// DB check required: same eligibility fields as /verify above.
router.get(
  "/eligible",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin", "student"]),
  promoController.getEligiblePromos
);

export default router;
