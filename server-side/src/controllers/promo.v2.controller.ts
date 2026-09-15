import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { Promo } from "../models/promo.model";
import { PromoLog } from "../models/promo.log.model";
import { PromoUsage } from "../models/promo.usage.model";
import { promoService } from "../services/promo.service";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";
import { Merch } from "../models/merch.model";
import { AppError } from "../util/app.error.util";

class PromoController {
  // Verify promo (student-facing)
  verifyPromo = async (req: Request, res: Response) => {
    const promo_id = req.params.promo_id as string;
    const merchId = req.params.merchId as string;
    const id_number = req.userV2.idNumber;

    const result = await promoService.fetchPromo(promo_id);
    if (!result) {
      return res
        .status(404)
        .json({ message: "Promo is Expired or Out of Stocks!" });
    }
    if (!promoService.verifyMerchPromo(result, merchId)) {
      return res.status(404).json({ message: "Merchandise not eligible" });
    }
    if (promoService.isExpired(result)) {
      return res.status(404).json({ message: "Promo code Expired!" });
    }
    if (promoService.checkStocks(result)) {
      return res.status(404).json({ message: "Promo Out of Stocks!" });
    }
    if (await promoService.isAlreadyUsed(result, merchId, id_number)) {
      return res
        .status(404)
        .json({ message: "You've already used this promo" });
    }
    const promoDiscount = promoService.checkPromoType(result, req.userV2);

    return res.status(200).json(promoDiscount);
  };

  // Create promo code (admin)
  create = async (req: Request, res: Response) => {
    try {
      await promoService.create(req.body, req.admin);
      await logService.create({
        admin: req.admin?.name ?? "Unknown Admin",
        admin_id: req.admin?._id,
        action: logs_action.CREATE_PROMO,
        target: req.body?.promo_name ?? "Promo code",
        target_model: "Promo",
      });
      res.status(200).json({ message: "Successfully created Promo Code!" });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Server error! " + (error as Error).message });
      }
    }
  };

  // Fetch all promos
  fetchAll = async (req: Request, res: Response) => {
    try {
      const promos = await promoService.fetchAll();

      return res.status(200).json({ promo: promos ?? [] });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Server error!" });
      }
    }
  };

  // Update promo code
  update = async (req: Request, res: Response) => {
    try {
      await promoService.update(req.body);
      await logService.create({
        admin: req.admin?.name ?? "Unknown Admin",
        admin_id: req.admin?._id,
        action: logs_action.UPDATE_PROMO,
        target: req.body?.promo_name ?? "Promo code",
        target_model: "Promo",
      });
      res.status(200).json({ message: "Promo Code updated successfully!" });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Server error: " + (error as Error).message });
      }
    }
  };

  // Soft delete promo
  softDelete = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid promo ID" });
      }
      const promo = await Promo.findByIdAndUpdate(
        new Types.ObjectId(id),
        { status: "Deleted" },
        { new: true }
      );
      if (!promo) {
        return res.status(404).json({ message: "Promo not found" });
      }
      await logService.create({
        admin: req.admin?.name ?? "Unknown Admin",
        admin_id: req.admin?._id,
        action: logs_action.DELETE_PROMO,
        target: promo.promo_name ?? String(id),
        target_id: promo._id,
        target_model: "Promo",
      });
      res.status(200).json({ message: "Promo deleted successfully" });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Server error! " + (error as Error).message });
      }
    }
  };

  // Get promo logs
  getLogs = async (req: Request, res: Response) => {
    try {
      const log = await promoService.promoLog();

      return res.status(200).json({ log: log ?? [] });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Server error!" });
      }
    }
  };

  // Get eligible promos for a list of merchandise IDs (student-facing)
  getEligiblePromos = async (req: Request, res: Response) => {
    try {
      const { merch_ids } = req.query;
      if (!merch_ids || typeof merch_ids !== "string") {
        return res
          .status(400)
          .json({ message: "Missing merch_ids query parameter" });
      }

      const merchIdList = merch_ids.split(",").map((id) => id.trim());
      if (merchIdList.length === 0) {
        return res.status(200).json({ promos: [] });
      }

      // Fetch cart merchandise data to get categories
      const cartMerches = await Merch.find({
        _id: { $in: merchIdList.map((id) => new Types.ObjectId(id)) },
      })
        .select("_id category")
        .lean();

      const merchIdSet = new Set(merchIdList);
      const merchCategoryMap = new Map<string, string>();
      for (const m of cartMerches) {
        merchCategoryMap.set(m._id.toString(), m.category || "");
      }

      const allPromos = await promoService.fetchAll();
      if (!allPromos || allPromos.length === 0) {
        return res.status(200).json({ promos: [] });
      }

      const eligiblePromos = [];
      for (const promo of allPromos) {
        if (promoService.isExpired(promo)) continue;
        if (promoService.checkStocks(promo)) continue;

        let hasMatchingItem = false;
        for (const merchId of merchIdList) {
          if (promoService.verifyMerchPromo(promo, merchId)) {
            hasMatchingItem = true;
            break;
          }

          const category = merchCategoryMap.get(merchId);
          if (category && promoService.verifyCategoryPromo(promo, category)) {
            hasMatchingItem = true;
            break;
          }
        }

        if (!hasMatchingItem) continue;

        const promoDiscount = promoService.checkPromoType(promo, req.userV2);
        if (!promoDiscount || promoDiscount.discount <= 0) continue;

        const hasAlreadyUsed = await PromoUsage.findOne({
          promo_id: promo._id,
          id_number: req.userV2.idNumber,
        });
        if (hasAlreadyUsed) continue;

        eligiblePromos.push({
          _id: (promo._id as any).toString(),
          promo_name: promo.promo_name,
          discount: promo.discount,
          type: promo.type,
          limit_type: promo.limit_type,
        });
      }

      return res.status(200).json({ promos: eligiblePromos });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Server error! " + (error as Error).message });
      }
    }
  };
}

export const promoController = new PromoController();
