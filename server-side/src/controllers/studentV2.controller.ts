import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { IStudent } from "../models/student.interface";
import { Student } from "../models/student.model";
import { user_model } from "../model_template/model_data";
import { Orders } from "../models/orders.model";
import { Merch } from "../models/merch.model";
import { Refund } from "../models/refund.model";
import { Settings } from "../models/settings.model";
import { membership_status } from "../enums/status.enums";
import { campus_type } from "../enums/campus.enums";
import { normalizeMembershipStatus } from "../util/membership.util";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2Client";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isNoSuchKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { name?: unknown; Code?: unknown };
  return candidate.name === "NoSuchKey" || candidate.Code === "NoSuchKey";
};

const findStudentByLookupId = async (rawIdNumber: string) => {
  const normalized = rawIdNumber.trim();
  const baseIdNumber = normalized.split("-")[0]?.trim() ?? "";

  let student = await Student.findOne({ id_number: normalized });

  if (!student && baseIdNumber) {
    student = await Student.findOne({
      id_number: new RegExp(`^${escapeRegex(baseIdNumber)}(?:-.*)?$`),
    });
  }

  return student;
};

export const getStudentProfile = async(req: Request, res: Response)=>{
  try{
    const {id_number} = req.params;
    const profile: IStudent | null = await Student.findOne({id_number})
    .select('id_number first_name middle_name last_name course year email campus -_id');;
    if(!profile){
      return res.status(404).json({message: "Profile Not Found!"});
    }
    return res.status(200).json({ data: profile });
  }catch(error){
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ message: 'Server error' });  
  }
}

export const getStudentImageController = async (
  req: Request,
  res: Response
) => {
  try {
    const key = req.params[0];
    if (!key) {
      return res.status(400).json({ message: "Image key is required" });
    }

    if (!R2_BUCKET_NAME) {
      return res.status(500).json({ message: "Image storage not configured" });
    }

    const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const object = await r2Client.send(command);

    if (!object.Body) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.setHeader(
      "Content-Type",
      object.ContentType || "application/octet-stream"
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = object.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error: unknown) {
    if (isNoSuchKeyError(error)) {
      return res.status(404).json({ message: "Image not found" });
    }
    console.error("Error streaming student image:", error);
    return res.status(500).json({ message: "Failed to load image" });
  }
};

export const getStudentLookupForAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const id_number = req.params.id_number as string;

    if (!id_number?.trim()) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const student: IStudent | null = await findStudentByLookupId(id_number);

    if (!student) {
      return res.status(404).json({ message: "Student not found!" });
    }

    return res.status(200).json({ data: user_model(student) });
  } catch (error) {
    console.error("Error fetching student lookup:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export interface StudentSearchResult {
  id_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  course: string;
  year: number;
  campus: string;
}

/**
 * GET /api/v2/students/search?q=<term>
 *
 * Admin-only fuzzy search across student id_number, first_name, and
 * last_name. UC_MAIN admins can search all campuses; other campus admins
 * are scoped to their own campus.
 */
export const searchStudentsV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const searchTerm = (req.query.q as string | undefined)?.trim();
    if (!searchTerm) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const escaped = escapeRegex(searchTerm);
    const regex = new RegExp(escaped, "i");

    const adminCampus = claims.campus;
    const isUcMainAdmin = adminCampus === campus_type.MAIN;

    const query: Record<string, unknown> = {
      $or: [
        { id_number: regex },
        { first_name: regex },
        { last_name: regex },
      ],
    };

    // Non-UC-MAIN admins can only search within their own campus
    if (!isUcMainAdmin && adminCampus) {
      query.campus = adminCampus;
    }

    const students = await Student.find(query)
      .select(
        "id_number first_name middle_name last_name email course year campus rfid membershipStatus"
      )
      .sort({ last_name: 1, first_name: 1 })
      // A single-letter term matches thousands of students; cap the response.
      .limit(25)
      .lean();

    const results: StudentSearchResult[] = students.map((s) => ({
      id_number: s.id_number,
      first_name: s.first_name,
      middle_name: s.middle_name,
      last_name: s.last_name,
      email: s.email,
      course: s.course,
      year: s.year,
      campus: s.campus,
      rfid: s.rfid,
      membershipStatus: s.membershipStatus,
    }));

    return res.status(200).json({ data: results });
  } catch (error) {
    console.error("Error searching students:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStudentMembershipStatusV2 = async (
  req: Request,
  res: Response
) => {
  try {
    const student = await Student.findById(req.userV2.sub).select(
      "id_number membershipStatus"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const settings = await Settings.findOne().select("membership_price").lean();
    const rawStatus = student.membershipStatus;

    return res.status(200).json({
      status: normalizeMembershipStatus(rawStatus),
      rawStatus,
      membershipPrice: settings?.membership_price ?? 0,
    });
  } catch (error) {
    console.error("Error fetching student membership status:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const requestStudentMembershipV2 = async (
  req: Request,
  res: Response
) => {
  try {
    const student = await Student.findById(req.userV2.sub).select(
      "membershipStatus"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const status = normalizeMembershipStatus(student.membershipStatus);

    if (status === "active") {
      return res.status(400).json({ message: "Membership is already active." });
    }

    if (status === "pending") {
      return res
        .status(400)
        .json({ message: "You already have a pending membership request." });
    }

    // `applied` backs the "Applied on" column of the admin requests queue, so it
    // is stamped here rather than left at the account's registration date.
    // Stored as ISO because the schema field is a String.
    await Student.updateOne(
      { _id: student._id },
      {
        $set: {
          membershipStatus: membership_status.PENDING,
          applied: new Date().toISOString(),
        },
      }
    );

    return res.status(200).json({
      message: "Membership request submitted successfully.",
      status: "pending",
      rawStatus: membership_status.PENDING,
    });
  } catch (error) {
    console.error("Error submitting membership request:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStudentOrders = async (req: Request, res: Response) => {
  try {
    const { idNumber } = req.userV2;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 8, 1);
    const status = String(req.query.status || "Pending");
    const query = {
      id_number: idNumber,
      order_status: status,
    };

    const [rawOrders, total] = await Promise.all([
      Orders.find(query)
        .sort(status === "Paid" ? { transaction_date: -1 } : { order_date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Orders.countDocuments(query),
    ]);
    const productIds = Array.from(
      new Set(
        rawOrders.flatMap((order: any) =>
          Array.isArray(order.items)
            ? order.items.map((item: any) => String(item.product_id || ""))
            : []
        )
      )
    ).filter(Boolean);
    const products = productIds.length
      ? await Merch.find({ _id: { $in: productIds } })
          .select("_id imageUrl")
          .lean()
      : [];
    const imageByProductId = new Map(
      products.map((product: any) => [
        String(product._id),
        Array.isArray(product.imageUrl) ? product.imageUrl[0] : undefined,
      ])
    );
    const studentOrders = rawOrders.map((order: any) => ({
      ...order,
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            ...item,
            imageUrl1:
              item.imageUrl1 || imageByProductId.get(String(item.product_id)),
          }))
        : [],
    }));

    return res.status(200).json({
      message: "Successfully retrieved student orders",
      data: studentOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching student orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStudentRefund = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const refunds = await Refund.find({ order_id: orderId });
    return res.status(200).json({ data: refunds });
  } catch (error) {
    console.error("Error fetching refund details:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
