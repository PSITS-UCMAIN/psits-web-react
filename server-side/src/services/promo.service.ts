import { Promo } from "../models/promo.model";
import { IPromoOrder } from "../models/orders.interface";
import mongoose, { Types, ClientSession } from "mongoose";
import { AppError } from "../util/app.error.util";
import { IPromo } from "../models/promo.interface";
import { Merch } from "../models/merch.model";
import { PromoUsage } from "../models/promo.usage.model";
import { PromoLog } from "../models/promo.log.model";
import { hasActiveMembership } from "../util/membership.util";
import { audienceIncludesRole } from "../util/role.util";
import { promoCodeGenerator } from "../custom_function/code_generator";
import { IUserItems } from "./order.service.inteface";
import {
  IOrderPromoEligibility,
  ICheckPromoEligibityResult,
} from "./promo.service.interface";
import { IStudent } from "../models/student.interface";

class PromoService {
  private parseListInput = (value: any): any[] => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  };

  private filterUniqueByKey = <T>(
    items: T[],
    keyGetter: (item: T) => string
  ) => {
    return Array.from(
      new Map(items.map((item) => [keyGetter(item), item])).values()
    );
  };

  private hydrateCategoryMerchandise = async (promo: any) => {
    if (
      !promo ||
      promo.promo_scope === "merchandise" ||
      !Array.isArray(promo.selected_categories) ||
      promo.selected_categories.length === 0
    ) {
      return promo;
    }

    const categoryMerchandise = await Merch.find({
      category: { $in: promo.selected_categories },
    }).select("_id name");

    const mergedMerchandise = this.filterUniqueByKey(
      [...(promo.selected_merchandise || []), ...categoryMerchandise],
      (item) => item._id.toString()
    );

    promo.selected_merchandise = mergedMerchandise;
    return promo;
  };

  //fetch Promo by string
  fetchPromo = async (promo_id: string) => {
    const result = await Promo.findById(promo_id);
    if (!result) {
      throw new AppError("Promo does not exist!", 404);
    }
    return await this.hydrateCategoryMerchandise(result);
  };
  //fetch Promo by mongoose ID
  fetchPromoById = async (promo_id: Types.ObjectId) => {
    const result = await Promo.findById(promo_id);
    if (!result) {
      throw new AppError("Promo does not exist!", 404);
    }
    return await this.hydrateCategoryMerchandise(result);
  };
  //fetch Promo by promo code name
  fetchPromoByName = async (promo_name: string) => {
    const result = await Promo.findOne({ promo_name });
    if (!result) {
      throw new AppError("Promo does not exist!", 404);
    }
    return await this.hydrateCategoryMerchandise(result);
  };
  //Fetch all promo code
  fetchAll = async () => {
    return await Promo.find({ status: "Active" });
  };
  //Soft Delete Promo Code
  delete = async (id: Types.ObjectId) => {
    await Promo.findByIdAndUpdate(
      id,
      {
        status: "Deleted",
      },
      { new: true }
    );
  };
  //Verify if the merchandise associated is in the promo eligibility
  verifyMerchPromo = (promo: IPromo, merchId: string): boolean => {
    const normalizedMerchId = merchId.trim();

    return promo.selected_merchandise.some(
      (item) => item._id.toString() === normalizedMerchId
    );
  };

  //Verify if a merch category is eligible for the promo
  verifyCategoryPromo = (promo: IPromo, category: string): boolean => {
    return (
      promo.promo_scope !== "merchandise" &&
      promo.selected_categories?.some(
        (item) => item.toLowerCase() === category.toLowerCase()
      )
    );
  };

  //Check if a specific merchandise is already included in promo eligibility
  isMerchAlreadySelected = (promo: IPromo, merchId: string): boolean => {
    return promo.selected_merchandise.some(
      (item) => item._id.toString() === merchId
    );
  };
  //Check if it is expired.
  isExpired = (promo: IPromo): boolean => {
    const currentDate = new Date();
    return currentDate < promo.start_date || currentDate > promo.end_date;
  };
  //Check if it is out of stockes
  checkStocks = (promo: IPromo): boolean => {
    return promo.quantity <= 0 && promo.limit_type === "Limited";
  };
  //Check if its already in used.
  isAlreadyUsed = async (promo: any, merchId: string, id_number: string) => {
    const result = await PromoUsage.findOne({
      promo_id: promo._id,
      id_number: id_number,
    });

    return result ? true : false;
  };
  //Check on what promo type
  checkPromoType = (promo: IPromo, requestor: any) => {
    switch (promo.type) {
      case "All Students":
        return { discount: promo.discount, verfied: true };
      case "Members":
        if (
          audienceIncludesRole(
            promo.selected_audience,
            (requestor as any).orgRole
          )
        ) {
          return { discount: promo.discount, verfied: true };
        }
        break;

      case "Students":
        if (
          Array.isArray(promo.selected_specific_students) &&
          promo.selected_specific_students.includes(requestor.idNumber)
        ) {
          return { discount: promo.discount, verfied: true };
        }
        break;
      case "Membership":
        if (hasActiveMembership((requestor as any).membershipStatus)) {
          return { discount: promo.discount, verfied: true };
        }
        break;

      default:
        return {
          discount: 0,
          verfied: false,
        };
    }
  };
  //Create promo code
  create = async (data: any, requestor: any) => {
    const parsedMerchandise = this.parseListInput(data.selectedMerchandise);
    const parsedAudience = this.parseListInput(data.selectedAudience);
    const parsedCategories = this.parseListInput(
      data.selectedCategories ?? data.selectedCategory
    );

    if (this.validatePromoData(data).errors.length > 0) {
      throw new AppError(this.validatePromoData(data).errors.join("; "), 400);
    }
    const uniqueMerchandise = this.filterUniqueMerchandise(parsedMerchandise);
    const uniqueCategories = Array.from(
      new Set(
        parsedCategories
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
      )
    );
    const promoScope =
      data.promoScope ||
      (uniqueCategories.length > 0
        ? uniqueMerchandise.length > 0
          ? "Both"
          : "Category"
        : "Merchandise");

    //Saved the new Promo Code
    await new Promo({
      promo_name: promoCodeGenerator(data.promoName),
      type: data.type,
      limit_type: data.limitType,
      one_person_limit: data.singleStudent === "yes" ? true : false,
      discount: data.discount,
      start_date: data.startDate,
      end_date: data.endDate,
      selected_merchandise: uniqueMerchandise,
      selected_categories: uniqueCategories,
      promo_scope: promoScope,
      selected_audience: data.type === "Members" ? parsedAudience : [],
      selected_specific_students:
        data.type === "Students" ? parsedAudience : [],
      quantity: data.quantity,
      created_by: requestor.name,
    }).save();
  };
  //Input validation
  validatePromoData = (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.promoName || !String(data.promoName).trim()) {
      errors.push("Promo name is required");
    }
    if (!data.type) {
      errors.push("Type is required");
    }
    if (!data.limitType) {
      errors.push("Limit type is required");
    }
    if (
      data.discount === undefined ||
      data.discount === null ||
      isNaN(Number(data.discount)) ||
      Number(data.discount) <= 0
    ) {
      errors.push("Discount must be greater than 0");
    }
    if (!data.startDate) {
      errors.push("Start date is required");
    }
    if (!data.endDate) {
      errors.push("End date is required");
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      errors.push("Start date must be before end date");
    }

    const hasMerchandise =
      this.parseListInput(data.selectedMerchandise).length > 0;
    const hasCategories =
      this.parseListInput(data.selectedCategories ?? data.selectedCategory)
        .length > 0;

    if (!hasMerchandise && !hasCategories) {
      errors.push("At least one merchandise or category must be selected");
    }

    if (data.limitType === "Limited") {
      if (
        data.quantity === undefined ||
        data.quantity === null ||
        isNaN(Number(data.quantity)) ||
        Number(data.quantity) <= 0
      ) {
        errors.push("Quantity is required for limited promos");
      }
    }

    return { valid: errors.length === 0, errors };
  };
  //Filter unique merchandise in promo
  filterUniqueMerchandise = (merchandise: any[]) => {
    return this.filterUniqueByKey(merchandise, (item) => item._id.toString());
  };
  //Filter unique categories in promo
  filterUniqueCategories = (categories: string[]) => {
    return Array.from(
      new Set(
        categories
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
      )
    );
  };
  //Update promo code
  update = async (data: any) => {
    const parsedMerchandise = this.parseListInput(data.selectedMerchandise);
    const parsedAudience = this.parseListInput(data.selectedAudience);
    const parsedCategories = this.parseListInput(
      data.selectedCategories ?? data.selectedCategory
    );
    if (this.validatePromoData(data).errors.length > 0) {
      throw new AppError(this.validatePromoData(data).errors.join("; "), 400);
    }
    const uniqueMerchandise = this.filterUniqueMerchandise(parsedMerchandise);
    const uniqueCategories = this.filterUniqueCategories(parsedCategories);
    const promoScope =
      data.promoScope ||
      (uniqueCategories.length > 0
        ? uniqueMerchandise.length > 0
          ? "Both"
          : "Category"
        : "Merchandise");
    const promo = await this.fetchPromoById(data.promoId);
    //Update the field
    promo.promo_name = data.promoName;
    promo.type = data.type;
    promo.limit_type = data.limitType;
    promo.one_person_limit = data.singleStudent === "yes" ? true : false;
    promo.discount = data.discount;
    promo.start_date = data.startDate;
    promo.end_date = data.endDate;
    promo.quantity = data.quantity;
    promo.selected_merchandise = uniqueMerchandise;
    promo.selected_categories = uniqueCategories;
    promo.promo_scope = promoScope;
    promo.selected_audience = data.type === "Members" ? parsedAudience : [];
    promo.selected_specific_students =
      data.type === "Students" || data.type === "Specific"
        ? parsedAudience
        : [];

    await promo.save();
  };
  //Fetch PromoLog
  promoLog = async () => {
    return await PromoLog.find().sort({ data: -1 });
  };

  //Verify promo against order items before final order processing
  verifyOrderPromoEligibility = async (
    promoId: Types.ObjectId | undefined | null,
    requestor: IStudent,
    items: IUserItems[]
  ): Promise<IOrderPromoEligibility> => {
    if (!promoId) {
      return {
        promo: {} as IPromo,
        promoDiscount: { discount: 0, verfied: false },
      };
    }

    const promo = await this.fetchPromoById(promoId);

    if (this.isExpired(promo)) {
      throw new AppError("Promo code Expired", 404);
    }

    if (this.checkStocks(promo)) {
      throw new AppError("Promo Out of Stocks!", 404);
    }

    const promoDiscount = this.checkPromoType(promo, requestor);
    if (!promoDiscount || promoDiscount.discount <= 0) {
      throw new AppError("Promo is not eligible for this user", 403);
    }

    const eligibleItems = items.filter((item) => {
      const matchesMerch = this.verifyMerchPromo(
        promo,
        String(item.product_id)
      );
      if (matchesMerch) return true;
      if (
        promo.promo_scope !== "merchandise" &&
        Array.isArray(promo.selected_categories)
      ) {
        const itemCategory = (item as any).category;
        if (itemCategory) {
          return promo.selected_categories.some(
            (cat: string) => cat.toLowerCase() === itemCategory.toLowerCase()
          );
        }
      }
      return false;
    });

    if (eligibleItems.length === 0) {
      throw new AppError("Promo does not apply to the selected items", 403);
    }

    if (promo.limit_type === "Limited" && promo.one_person_limit) {
      for (const item of eligibleItems) {
        const alreadyUsed = await this.isAlreadyUsed(
          promo,
          String(item.product_id),
          requestor.id_number
        );

        if (alreadyUsed) {
          throw new AppError("You've already used this promo", 403);
        }
      }
    }

    return { promo, promoDiscount };
  };
}

export const promoService = new PromoService();
