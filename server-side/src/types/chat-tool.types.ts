import { Student } from "../models/student.model";
import { Orders } from "../models/orders.model";
import { Merch } from "../models/merch.model";
import { Event } from "../models/event.model";
import { Application } from "../models/application.model";
import { MembershipHistory } from "../models/history.model";
import { Refund } from "../models/refund.model";
import { Contribution } from "../models/contribution.model";
import { EmailQueue } from "../models/email.model";
import { RecruitmentPosition } from "../models/recruitmentPosition.model";
import { Admin } from "../models/admin.model";
import { account_status, membership_status } from "../enums/status.enums";
import { applicationStatus } from "../enums/recruitment.enums";
import { startOfDay, endOfDay } from "date-fns";
import { Log } from "../models/log.model";
import { Settings } from "../models/settings.model";
import { orderService } from "../services/order.service";
import { studentService } from "../services/student.service";
import { refundService } from "../services/refund.service";
import { membershipService } from "../services/membership.service";
import { merchandiseService } from "../services/merchandise.service";
import { EventV2Service } from "../services/eventV2.service";
import { markAttendance } from "../services/attendance.service";
import { recruitmentService } from "../services/recruitment.service";
import { adminService } from "../services/admin.service";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { psits_roles } from "../enums/role.enums";
import { orderController } from "../controllers/order.v2.controller";

// ─── Permission Types ────────────────────────────────────────────────────────

export type ToolPermission =
  | "read"
  | "admin_finance"
  | "admin_only"
  | "admin_full";

export const PERMISSION_MAP: Record<ToolPermission, string[]> = {
  read: [],
  admin_finance: [psits_roles.ADMIN, psits_roles.FINANCE],
  admin_only: [psits_roles.ADMIN],
  admin_full: [
    psits_roles.ADMIN,
    psits_roles.FINANCE,
    psits_roles.DEVELOPER,
    psits_roles.EXECUTIVE,
    psits_roles.HEAD_FINANCE,
  ],
};

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ToolPermissionError extends Error {
  constructor(
    public toolName: string,
    public requiredPermission: ToolPermission,
    public userAccess: string
  ) {
    super(
      `Insufficient permissions for tool "${toolName}". Required: ${requiredPermission}, got: ${userAccess}`
    );
    this.name = "ToolPermissionError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeAccessKey = (value?: string): string => {
  if (!value) return "";
  return value.trim().toUpperCase();
};

const checkPermission = (
  toolPerm: ToolPermission,
  userAccess: string
): void => {
  if (toolPerm === "read") return;
  const allowed = PERMISSION_MAP[toolPerm];
  const normalized = normalizeAccessKey(userAccess);
  if (!allowed.includes(normalized)) {
    throw new ToolPermissionError(toolPerm, toolPerm, userAccess);
  }
};

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ChatTool {
  name: string;
  description: string;
  category: string;
  permission: ToolPermission;
  args?: Array<{ name: string; description: string; pattern?: string }>;
  execute: (
    args: unknown,
    userAccess: string,
    userName: string
  ) => Promise<unknown>;
}

// ─── Read Tools (50) ─────────────────────────────────────────────────────────

const safeCount = async (
  fn: () => Promise<number>,
  defaultValue = 0
): Promise<number> => {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
};

const readTools: ChatTool[] = [
  // ── Students (10) ─────────────────────────────────────────────────────────
  {
    name: "get_student_count",
    description: "Returns the total number of students in the system.",
    category: "Students",
    permission: "read",
    execute: () => Student.countDocuments(),
  },
  {
    name: "get_active_student_count",
    description: "Returns the count of students with ACTIVE status.",
    category: "Students",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({ status: account_status.ACTIVE })
      ),
  },
  {
    name: "get_suspended_student_count",
    description: "Returns the count of suspended students.",
    category: "Students",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({ status: account_status.SUSPENDED })
      ),
  },
  {
    name: "get_pending_account_count",
    description: "Returns the count of students with PENDING account status.",
    category: "Students",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({ status: account_status.PENDING })
      ),
  },
  {
    name: "get_deleted_student_count",
    description: "Returns the count of deleted students.",
    category: "Students",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({ status: account_status.DELETED })
      ),
  },
  {
    name: "get_new_students_today",
    description: "Returns the count of students created today.",
    category: "Students",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({ createdAt: { $gte: startOfDay(new Date()) } })
      ),
  },
  {
    name: "get_new_students_this_week",
    description: "Returns the count of students created in the last 7 days.",
    category: "Students",
    permission: "read",
    execute: () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return safeCount(() =>
        Student.countDocuments({ createdAt: { $gte: weekAgo } })
      );
    },
  },
  {
    name: "get_students_by_campus",
    description:
      "Returns a record mapping each campus to its active student count.",
    category: "Students",
    permission: "read",
    execute: async () => {
      try {
        const result = await Student.aggregate([
          { $match: { status: account_status.ACTIVE } },
          { $group: { _id: "$campus", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },
  {
    name: "get_students_by_course",
    description:
      "Returns a record mapping each course to its total student count.",
    category: "Students",
    permission: "read",
    execute: async () => {
      try {
        const result = await Student.aggregate([
          { $group: { _id: "$course", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },
  {
    name: "get_students_by_year",
    description:
      "Returns a record mapping each year to its total student count.",
    category: "Students",
    permission: "read",
    execute: async () => {
      try {
        const result = await Student.aggregate([
          { $group: { _id: "$year", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>(
          (acc, row) => {
            if (row._id !== null && row._id !== undefined) {
              acc[String(row._id)] = row.count;
            }
            return acc;
          },
          {} as Record<string, number>
        );
      } catch {
        return {};
      }
    },
  },
  {
    name: "find_student",
    description:
      "Searches for student by name using a partial wildcard match, so incomplete names still find results. Returns matching students with their ID number, name, course, year, and campus. And use it to other tools add_attendee, create order, approve order, and more. Note that you need to provide the partial name of the student you want to search for, and it will return a list of matching students. Do not call this tool without a name argument, as it will throw an error. Use the returned ID number to perform other actions on the student.",
    category: "Students",
    permission: "read",
    args: [
      {
        name: "name",
        description:
          "Full or partial student name to search for. Supports incomplete names.",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { name?: string };
      const query = parsed.name?.trim();
      if (!query) throw new Error("name is required");
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const projection =
        "id_number first_name middle_name last_name course year campus status -_id";
      // Match any word against name fields so partial or multi-word
      // queries like "john" or "john smi" still find "John Smith".
      // id_number is included so pasting an ID also resolves the student.
      const words = escaped.split(/\s+/).filter(Boolean);
      const students = await Student.find(
        {
          $or: words.flatMap((word) => [
            { first_name: new RegExp(word, "i") },
            { middle_name: new RegExp(word, "i") },
            { last_name: new RegExp(word, "i") },
            { id_number: new RegExp(`^${word}`, "i") },
          ]),
        },
        projection
      )
        .limit(25)
        .lean();
      return { count: students.length, students };
    },
  },
  {
    name: "get_student_by_name",
    description:
      "Searches for a student by partial name using wildcard matching on first_name, middle_name, and last_name. Returns matching students with their full name, id_number, year, and course. Use this tool to check if a student exists by name. Do not call without a name argument — it will throw an error.",
    category: "Students",
    permission: "read",
    args: [
      {
        name: "name",
        description:
          "Partial or full student name to search for. Supports incomplete names (e.g. 'john' matches 'John').",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { name?: string };
      const query = parsed.name?.trim();
      if (!query) throw new Error("name is required");
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      const students = await Student.find(
        {
          $or: [
            { first_name: regex },
            { middle_name: regex },
            { last_name: regex },
          ],
        },
        "id_number first_name middle_name last_name course year -_id"
      )
        .limit(20)
        .lean();
      const results = students.map((s) => ({
        name: `${s.first_name} ${s.middle_name ?? ""} ${s.last_name}`.trim(),
        id_number: s.id_number,
        year: s.year,
        course: s.course,
      }));
      return { count: results.length, students: results };
    },
  },

  // ── Memberships (4) ────────────────────────────────────────────────────────
  {
    name: "get_active_memberships",
    description:
      "Returns the count of students with ACTIVE or RENEWED membership status.",
    category: "Memberships",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({
          status: account_status.ACTIVE,
          membershipStatus: {
            $in: [membership_status.ACTIVE, membership_status.RENEWED],
          },
        })
      ),
  },
  {
    name: "get_pending_membership_count",
    description:
      "Returns the count of students with PENDING membership status.",
    category: "Memberships",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({
          membershipStatus: membership_status.PENDING,
        })
      ),
  },
  {
    name: "get_membership_revenue_today",
    description: "Returns the total membership revenue collected today.",
    category: "Memberships",
    permission: "read",
    execute: async () => {
      try {
        const result = await MembershipHistory.aggregate([
          {
            $match: {
              date: {
                $gte: startOfDay(new Date()),
                $lte: endOfDay(new Date()),
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_total_membership_revenue",
    description: "Returns the lifetime total membership revenue.",
    category: "Memberships",
    permission: "read",
    execute: async () => {
      try {
        const result = await MembershipHistory.aggregate([
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },

  // ── Orders & Payments (10) ─────────────────────────────────────────────────
  {
    name: "get_total_orders",
    description:
      "Returns the total count of all orders without filtering by student order",
    category: "Orders",
    permission: "read",
    execute: () => Orders.countDocuments(),
  },
  {
    name: "get_paid_orders_count",
    description:
      "Returns the count of orders with PAID status without filtering by student order",
    category: "Orders",
    permission: "read",
    execute: () => Orders.countDocuments({ order_status: "Paid" }),
  },
  {
    name: "get_pending_orders_count",
    description: "Returns the count of orders with PENDING status.",
    category: "Orders",
    permission: "read",
    execute: () => Orders.countDocuments({ order_status: "Pending" }),
  },
  {
    name: "get_pending_orders",
    description:
      "Returns a paginated list of pending orders with order_id, student name/id_number/course/year, items (product_name, quantity, sub_total), total, and order_date. Use limit (default 20) and skip (default 0) to paginate. Do not return all pending orders at once — paginate using skip.",
    category: "Orders",
    permission: "read",
    args: [
      {
        name: "limit",
        description: "Number of orders to return (default 20, max 100).",
        pattern: "^\\d+$",
      },
      {
        name: "skip",
        description: "Number of orders to skip for pagination (default 0).",
        pattern: "^\\d+$",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { limit?: string; skip?: string };
      const limit = Math.min(parseInt(parsed.limit ?? "20", 10) || 20, 100);
      const skip = parseInt(parsed.skip ?? "0", 10) || 0;
      const total = await Orders.countDocuments({ order_status: "Pending" });
      const orders = await Orders.find({ order_status: "Pending" })
        .sort({ order_date: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      return {
        total,
        limit,
        skip,
        returned: orders.length,
        orders: orders.map((o) => ({
          order_id: o._id.toString(),
          student: {
            name: o.student_name,
            id_number: o.id_number,
            course: o.course,
            year: o.year,
          },
          items: (
            o.items as Array<{
              product_name: string;
              quantity: number;
              sub_total: number;
              batch?: string | number;
              sizes?: string[];
              variation?: string[];
            }>
          ).map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            sub_total: item.sub_total,
            batch: item.batch,
            sizes: item.sizes,
            variation: item.variation,
          })),
          total: o.total,
          order_date: o.order_date,
          reference_code: o.reference_code,
        })),
      };
    },
  },
  {
    name: "get_refunded_orders_count",
    description: "Returns the count of refunded orders.",
    category: "Orders",
    permission: "read",
    execute: () => Orders.countDocuments({ order_status: "Refunded" }),
  },
  {
    name: "get_total_order_revenue",
    description: "Returns the total revenue from all paid orders.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          { $match: { order_status: "Paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_today_order_revenue",
    description: "Returns the total revenue from paid orders placed today.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          {
            $match: {
              order_status: "Paid",
              transaction_date: {
                $gte: startOfDay(new Date()),
                $lte: endOfDay(new Date()),
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_today_order_count",
    description: "Returns the count of paid orders placed today.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        return await Orders.countDocuments({
          order_status: "Paid",
          transaction_date: {
            $gte: startOfDay(new Date()),
            $lte: endOfDay(new Date()),
          },
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_avg_order_value",
    description: "Returns the average order total for all paid orders.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          { $match: { order_status: "Paid" } },
          { $group: { _id: null, avg: { $avg: "$total" } } },
        ]);
        return result?.[0]?.avg ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_top_selling_products",
    description: "Returns the top 5 best-selling products by quantity sold.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          { $match: { order_status: "Paid" } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product_name",
              totalQuantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 },
          { $project: { product_name: "$_id", totalQuantity: 1, _id: 0 } },
        ]);
        return result ?? [];
      } catch {
        return [];
      }
    },
  },
  {
    name: "get_refunded_orders_total",
    description: "Returns the total refund amount across all refunds.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        const result = await Refund.aggregate([
          { $group: { _id: null, total: { $sum: "$refund_price" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },

  // ── Merch (6) ──────────────────────────────────────────────────────────────
  {
    name: "find_merch",
    description:
      "Searches for merchandise products by name using a partial wildcard match, so incomplete product names still find results. Returns matching products with their product_id, name, price, stock, and active state. And use it to other tools create_order, approve_order, publish_merch, update_merch_stock, and more. Do not call this tool without a name argument, as it will throw an error. Use the returned product_id to perform other actions on the merchandise.",
    category: "Merch",
    permission: "read",
    args: [
      {
        name: "name",
        description:
          "Full or partial product name to search for. Supports incomplete names.",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { name?: string };
      const query = parsed.name?.trim();
      if (!query) throw new Error("name is required");
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const projection = "_id name price stocks is_active category type";
      // Match any word against the product name so partial or multi-word
      // queries like "shirt" or "dept shirt" still find matching products.
      const words = escaped.split(/\s+/).filter(Boolean);
      const products = await Merch.find(
        {
          $or: words.map((word) => ({ name: new RegExp(word, "i") })),
        },
        projection
      )
        .limit(10)
        .lean();
      return {
        count: products.length,
        products: products.map((p) => ({
          product_id: p._id.toString(),
          name: p.name,
          price: p.price,
          stocks: p.stocks,
          is_active: p.is_active,
          category: p.category,
          type: p.type,
        })),
      };
    },
  },
  {
    name: "get_merch_active_count",
    description:
      "Returns the count of active merchandise products currently on sale.",
    category: "Merch",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Merch.countDocuments({
          is_active: true,
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() },
        })
      ),
  },
  {
    name: "get_merch_total_products",
    description: "Returns the total count of all merchandise products.",
    category: "Merch",
    permission: "read",
    execute: () => Merch.countDocuments(),
  },
  {
    name: "get_merch_total_stock",
    description:
      "Returns the total stock units across all active on-sale merchandise.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        const result = await Merch.aggregate([
          {
            $match: {
              is_active: true,
              start_date: { $lte: new Date() },
              end_date: { $gte: new Date() },
            },
          },
          { $group: { _id: null, total: { $sum: "$stocks" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_low_stock_alert_count",
    description:
      "Returns the count of active on-sale products with stock <= 10.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        return await Merch.countDocuments({
          is_active: true,
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() },
          stocks: { $lte: 10 },
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_out_of_stock_count",
    description: "Returns the count of active products with zero stock.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        return await Merch.countDocuments({
          is_active: true,
          stocks: 0,
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_merch_revenue_today",
    description:
      "Returns the total merch revenue from paid orders placed today.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          {
            $match: {
              order_status: "Paid",
              transaction_date: {
                $gte: startOfDay(new Date()),
                $lte: endOfDay(new Date()),
              },
            },
          },
          { $unwind: "$items" },
          { $group: { _id: null, total: { $sum: "$items.sub_total" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },

  // ── Events (5) ─────────────────────────────────────────────────────────────
  {
    name: "get_total_events",
    description: "Returns the total count of all events.",
    category: "Events",
    permission: "read",
    execute: () => Event.countDocuments(),
  },
  {
    name: "get_upcoming_events",
    description:
      "Returns upcoming events (name, id, description, date). Optionally filter by event_name.",
    category: "Events",
    permission: "read",
    args: [
      {
        name: "event_name",
        description: "Optional event name to filter results.",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { event_name?: string };
      const projection = "eventId eventName eventDescription eventDate -_id";
      const base: Record<string, unknown> = {};
      if (parsed.event_name) {
        // Escape regex special chars so names like "Orientation (2026)" match literally
        const escaped = parsed.event_name.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        base.eventName = { $regex: new RegExp(escaped, "i") };
      }

      console.log("Filter for get_upcoming_events:", base);
      const events = await Event.find(
        { ...base, eventDate: { $gte: new Date() } },
        projection
      ).lean();
      if (events.length > 0) {
        return { count: events.length, events };
      }

      // No upcoming matches — check if the event exists at all so the agent
      // can report why instead of retrying the same empty query.
      if (parsed.event_name) {
        const anyDate = await Event.find(base, projection).lean();
        if (anyDate.length > 0) {
          return {
            count: anyDate.length,
            message:
              "Matching event(s) found but none are upcoming — event date has already passed.",
            events: anyDate,
          };
        }
        return {
          count: 0,
          message: `No event found matching "${parsed.event_name}".`,
          events: [],
        };
      }

      return { count: 0, events: [] };
    },
  },
  {
    name: "get_total_event_attendees",
    description: "Returns the total number of attendees across all events.",
    category: "Events",
    permission: "read",
    execute: async () => {
      try {
        const result = await Event.aggregate([
          { $group: { _id: null, total: { $sum: { $size: "$attendees" } } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_event_revenue",
    description: "Returns the total revenue from all events.",
    category: "Events",
    permission: "read",
    execute: async () => {
      try {
        const result = await Event.aggregate([
          { $group: { _id: null, total: { $sum: "$totalRevenueAll" } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_upcoming_event_tickets_sold",
    description: "Returns total tickets sold for future events.",
    category: "Events",
    permission: "read",
    execute: async () => {
      try {
        const result = await Event.aggregate([
          { $match: { eventDate: { $gte: new Date() } } },
          { $group: { _id: null, total: { $sum: { $size: "$attendees" } } } },
        ]);
        return result?.[0]?.total ?? 0;
      } catch {
        return 0;
      }
    },
  },

  // ── Recruitment (5) ────────────────────────────────────────────────────────
  {
    name: "get_open_positions",
    description:
      "Returns the count of open recruitment positions that are active.",
    category: "Recruitment",
    permission: "read",
    execute: () =>
      safeCount(() =>
        RecruitmentPosition.countDocuments({
          hiringStatus: "OPEN",
          isActive: true,
        })
      ),
  },
  {
    name: "get_approved_applications",
    description: "Returns the count of approved recruitment applications.",
    category: "Recruitment",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Application.countDocuments({
          status: applicationStatus.APPROVED,
        })
      ),
  },
  {
    name: "get_interview_scheduled",
    description:
      "Returns the count of applications with an interview scheduled.",
    category: "Recruitment",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Application.countDocuments({
          status: applicationStatus.INTERVIEW_SCHEDULED,
        })
      ),
  },
  {
    name: "get_submitted_applications",
    description:
      "Returns the count of submitted (pending) recruitment applications.",
    category: "Recruitment",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Application.countDocuments({
          status: applicationStatus.SUBMITTED,
        })
      ),
  },
  {
    name: "get_recruitment_pipeline",
    description: "Returns recruitment applications grouped by position.",
    category: "Recruitment",
    permission: "read",
    execute: async () => {
      try {
        const result = await Application.aggregate([
          { $group: { _id: "$position", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },

  // ── Contributions (2) ──────────────────────────────────────────────────────
  {
    name: "get_contributions_total",
    description: "Returns the total count of all contribution records.",
    category: "Contributions",
    permission: "read",
    execute: () => Contribution.countDocuments(),
  },
  {
    name: "get_contributions_by_type",
    description: "Returns contribution records grouped by type.",
    category: "Contributions",
    permission: "read",
    execute: async () => {
      try {
        const result = await Contribution.aggregate([
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },

  // ── Email Queue (3) ───────────────────────────────────────────────────────
  {
    name: "get_email_pending",
    description: "Returns the count of pending emails in the queue.",
    category: "Email",
    permission: "read",
    execute: () => EmailQueue.countDocuments({ status: "pending" }),
  },
  {
    name: "get_email_sent",
    description: "Returns the count of successfully sent emails.",
    category: "Email",
    permission: "read",
    execute: () => EmailQueue.countDocuments({ status: "sent" }),
  },
  {
    name: "get_email_failed",
    description: "Returns the count of failed emails.",
    category: "Email",
    permission: "read",
    execute: () => EmailQueue.countDocuments({ status: "failed" }),
  },

  // ── Dashboard & Analytics (5) ──────────────────────────────────────────────
  {
    name: "get_dashboard_counts",
    description: "Returns dashboard counts: students by year and by course.",
    category: "Analytics",
    permission: "read",
    execute: async () => {
      try {
        const [yearResult, courseResult] = await Promise.all([
          Student.aggregate([{ $group: { _id: "$year", count: { $sum: 1 } } }]),
          Student.aggregate([
            { $group: { _id: "$course", count: { $sum: 1 } } },
          ]),
        ]);
        const years = (yearResult ?? []).reduce<Record<string, number>>(
          (acc, row) => {
            if (row._id !== null && row._id !== undefined) {
              acc[String(row._id)] = row.count;
            }
            return acc;
          },
          {} as Record<string, number>
        );
        const courses = (courseResult ?? []).reduce<Record<string, number>>(
          (acc, row) => {
            if (row._id) acc[String(row._id)] = row.count;
            return acc;
          },
          {}
        );
        return { years, courses };
      } catch {
        return { years: {}, courses: {} };
      }
    },
  },
  {
    name: "get_recent_activity_logs",
    description: "Returns the count of activity logs recorded today.",
    category: "Analytics",
    permission: "read",
    execute: async () => {
      try {
        return await Log.countDocuments({
          timestamp: {
            $gte: startOfDay(new Date()),
            $lte: endOfDay(new Date()),
          },
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_top_spenders",
    description:
      "Returns the top 5 students by total spending across paid orders.",
    category: "Analytics",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          { $match: { order_status: "Paid" } },
          { $group: { _id: "$id_number", totalSpent: { $sum: "$total" } } },
          { $sort: { totalSpent: -1 } },
          { $limit: 5 },
          { $project: { id_number: "$_id", totalSpent: 1, _id: 0 } },
        ]);
        return result ?? [];
      } catch {
        return [];
      }
    },
  },
  {
    name: "get_revenue_by_year",
    description: "Returns order revenue grouped by student year level.",
    category: "Analytics",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          { $match: { order_status: "Paid" } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$year",
              totalRevenue: { $sum: "$items.sub_total" },
            },
          },
        ]);
        return (result ?? []).reduce<Record<string, number>>(
          (acc, row) => {
            if (row._id !== null && row._id !== undefined) {
              acc[String(row._id)] = row.totalRevenue;
            }
            return acc;
          },
          {} as Record<string, number>
        );
      } catch {
        return {};
      }
    },
  },
  {
    name: "get_orders_today_by_campus",
    description: "Returns today's paid orders grouped by student course.",
    category: "Analytics",
    permission: "read",
    execute: async () => {
      try {
        const result = await Orders.aggregate([
          {
            $match: {
              order_status: "Paid",
              transaction_date: {
                $gte: startOfDay(new Date()),
                $lte: endOfDay(new Date()),
              },
            },
          },
          { $group: { _id: "$course", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },

  // ── Students Extra (3) ────────────────────────────────────────────────────
  {
    name: "get_student_by_id_number",
    description:
      "Returns the full student profile (id_number, first_name, middle_name, last_name, email, course, year, campus, status, membershipStatus) for a student with the given 8-digit ID number. Use find_student first to locate the student, then this tool for complete details.",
    category: "Students",
    permission: "read",
    args: [
      {
        name: "id_number",
        description: "Student ID number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");
      const student = await Student.findOne(
        { id_number: parsed.id_number.trim() },
        "id_number first_name middle_name last_name email course year campus status membershipStatus -_id"
      ).lean();
      if (!student) return { message: "Student not found", student: null };
      return { student };
    },
  },
  {
    name: "get_student_cart_contents",
    description:
      "Returns the cart items for a student by their 8-digit ID number. Shows product names, quantities, and prices. Use find_student first to confirm the student exists.",
    category: "Students",
    permission: "read",
    args: [
      {
        name: "id_number",
        description: "Student ID number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");
      const student = await Student.findOne(
        { id_number: parsed.id_number.trim() },
        "cart id_number -_id"
      ).lean();
      if (!student) return { message: "Student not found", cart: [] };
      const items =
        (student.cart as unknown as Array<Record<string, unknown>>) ?? [];
      return { id_number: student.id_number, cart: items };
    },
  },
  {
    name: "get_new_students_this_month",
    description: "Returns the count of students created in the last 30 days.",
    category: "Students",
    permission: "read",
    execute: () => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return safeCount(() =>
        Student.countDocuments({ createdAt: { $gte: monthAgo } })
      );
    },
  },

  // ── Orders Extra (2) ──────────────────────────────────────────────────────
  {
    name: "get_order_detail_by_id",
    description:
      "Returns full order details (student, items, total, status, date, reference_code) by MongoDB order _id. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "order_id",
        description: "MongoDB ObjectId of the order to retrieve.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { order_id?: string };
      if (!parsed.order_id) throw new Error("order_id is required");
      const order = await Orders.findById(new Types.ObjectId(parsed.order_id))
        .lean()
        .exec();
      if (!order) throw new Error("Order not found");
      return { order };
    },
  },
  {
    name: "get_refunds_today",
    description: "Returns the count of refunds processed today.",
    category: "Orders",
    permission: "read",
    execute: async () => {
      try {
        return await Refund.countDocuments({
          refund_date: {
            $gte: startOfDay(new Date()),
            $lte: endOfDay(new Date()),
          },
        });
      } catch {
        return 0;
      }
    },
  },

  // ── Merch Extra (2) ────────────────────────────────────────────────────────
  {
    name: "get_merch_by_category",
    description:
      "Returns a record mapping each active merch category to its product count.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        const result = await Merch.aggregate([
          {
            $match: {
              is_active: true,
              start_date: { $lte: new Date() },
              end_date: { $gte: new Date() },
            },
          },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]);
        return (result ?? []).reduce<Record<string, number>>((acc, row) => {
          if (row._id) acc[String(row._id)] = row.count;
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },
  {
    name: "get_low_stock_merch_list",
    description:
      "Returns up to 10 active products with stock <= 5, including product_id, name, and remaining stock.",
    category: "Merch",
    permission: "read",
    execute: async () => {
      try {
        const products = await Merch.find(
          {
            is_active: true,
            start_date: { $lte: new Date() },
            end_date: { $gte: new Date() },
            stocks: { $lte: 5, $gt: 0 },
          },
          "_id name stocks -_id"
        )
          .limit(10)
          .lean();
        return {
          count: products.length,
          products: products.map((p) => ({
            product_id: p._id.toString(),
            name: p.name,
            stocks: p.stocks,
          })),
        };
      } catch {
        return { count: 0, products: [] };
      }
    },
  },

  // ── Events Extra (4) ───────────────────────────────────────────────────────
  {
    name: "get_event_detail_by_id",
    description:
      "Returns full event info (eventId, eventName, eventDescription, eventDate, status, totalRevenueAll, attendeeCount) by event ID.",
    category: "Events",
    permission: "read",
    args: [
      {
        name: "event_id",
        description: "MongoDB ObjectId of the event.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { event_id?: string };
      if (!parsed.event_id) throw new Error("event_id is required");
      const event = await Event.findById(new Types.ObjectId(parsed.event_id))
        .lean()
        .exec();
      if (!event) throw new Error("Event not found");
      const attendeeCount = (event.attendees as unknown as unknown[]).length;
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        eventDescription: event.eventDescription,
        eventDate: event.eventDate,
        status: event.status,
        totalRevenueAll: event.totalRevenueAll,
        attendeeCount,
      };
    },
  },
  {
    name: "get_event_attendee_list",
    description:
      "Returns list of all registered attendees for an event by event_id or event_name. Each attendee includes id_number, name, course, year, campus.",
    category: "Events",
    permission: "read",
    args: [
      {
        name: "event_id",
        description: "MongoDB ObjectId of the event.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "event_name",
        description:
          "Optional event name to identify the event instead of event_id.",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { event_id?: string; event_name?: string };
      if (!parsed.event_id && !parsed.event_name)
        throw new Error("event_id or event_name is required");
      const filter: Record<string, unknown> = {};
      if (parsed.event_id) filter.eventId = parsed.event_id;
      if (parsed.event_name) filter.eventName = parsed.event_name;
      const event = await Event.findOne(filter).lean();
      if (!event) throw new Error("Event not found");
      const attendees =
        (event.attendees as Array<Record<string, unknown>>) ?? [];
      return { count: attendees.length, attendees };
    },
  },
  {
    name: "get_event_attendance_rate",
    description:
      "Returns attendance percentages per session (morning/afternoon/evening) for an event by event_id.",
    category: "Events",
    permission: "read",
    args: [
      {
        name: "event_id",
        description: "MongoDB ObjectId of the event.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown) => {
      const parsed = args as { event_id?: string };
      if (!parsed.event_id) throw new Error("event_id is required");
      const event = await Event.findById(new Types.ObjectId(parsed.event_id))
        .lean()
        .exec();
      if (!event) throw new Error("Event not found");
      const attendees =
        (event.attendees as Array<Record<string, unknown>>) ?? [];
      const total = attendees.length;
      if (total === 0) return { morning: 0, afternoon: 0, evening: 0, total };
      let morningCount = 0;
      let afternoonCount = 0;
      let eveningCount = 0;
      for (const attendee of attendees) {
        const attendance = attendee.attendance as
          | Record<string, unknown>
          | undefined;
        if (!attendance) continue;
        if ((attendance.morning as { attended?: boolean })?.attended)
          morningCount++;
        if ((attendance.afternoon as { attended?: boolean })?.attended)
          afternoonCount++;
        if ((attendance.evening as { attended?: boolean })?.attended)
          eveningCount++;
      }
      return {
        morning: Math.round((morningCount / total) * 100),
        afternoon: Math.round((afternoonCount / total) * 100),
        evening: Math.round((eveningCount / total) * 100),
        total,
      };
    },
  },
  {
    name: "get_event_revenue_by_campus",
    description:
      "Returns revenue from event sales_data grouped by campus code (UC_MAIN, UC_BANILAD, etc.).",
    category: "Events",
    permission: "read",
    execute: async () => {
      try {
        const result = await Event.aggregate([
          { $unwind: "$sales_data" },
          {
            $group: {
              _id: "$sales_data.campus",
              totalRevenue: { $sum: "$sales_data.totalRevenue" },
              unitsSold: { $sum: "$sales_data.unitsSold" },
            },
          },
        ]);
        return (result ?? []).reduce<
          Record<string, { totalRevenue: number; unitsSold: number }>
        >((acc, row) => {
          if (row._id)
            acc[String(row._id)] = {
              totalRevenue: row.totalRevenue ?? 0,
              unitsSold: row.unitsSold ?? 0,
            };
          return acc;
        }, {});
      } catch {
        return {};
      }
    },
  },

  // ── Recruitment Extra (2) ──────────────────────────────────────────────────
  {
    name: "get_application_by_id",
    description:
      "Returns full application details (applicant snapshot, status, interview info, internal notes) by application _id. Requires ADMIN, FINANCE, DEVELOPER, EXECUTIVE, or HEAD_FINANCE access.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "application_id",
        description: "MongoDB ObjectId of the application.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as { application_id?: string };
      if (!parsed.application_id) throw new Error("application_id is required");
      const app = await Application.findById(
        new Types.ObjectId(parsed.application_id)
      )
        .lean()
        .exec();
      if (!app) throw new Error("Application not found");
      return { application: app };
    },
  },
  {
    name: "get_interviews_today",
    description: "Returns the count of interviews scheduled for today.",
    category: "Recruitment",
    permission: "read",
    execute: async () => {
      try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const result = await Application.aggregate([
          {
            $match: {
              "interview.scheduledAt": { $gte: todayStart, $lte: todayEnd },
              "interview.status": "SCHEDULED",
            },
          },
          { $count: "count" },
        ]);
        return result?.[0]?.count ?? 0;
      } catch {
        return 0;
      }
    },
  },

  // ── Contributions Extra (1) ────────────────────────────────────────────────
  {
    name: "get_contributions_this_week",
    description:
      "Returns the count of contributions recorded in the last 7 days.",
    category: "Contributions",
    permission: "read",
    execute: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      try {
        return await Contribution.countDocuments({
          date: { $gte: weekAgo },
        });
      } catch {
        return 0;
      }
    },
  },

  // ── Admin Extra (4) ────────────────────────────────────────────────────────
  {
    name: "get_active_admins_count",
    description: "Returns the count of active admin accounts.",
    category: "Admin",
    permission: "read",
    execute: () =>
      safeCount(() => Admin.countDocuments({ status: account_status.ACTIVE })),
  },
  {
    name: "get_all_active_admins",
    description:
      "Returns list of active admins (id_number, name, position, access, email). ADMIN only.",
    category: "Admin",
    permission: "admin_only",
    execute: async (_args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      try {
        const admins = await Admin.find(
          { status: account_status.ACTIVE },
          "id_number name position access email -_id"
        )
          .lean()
          .exec();
        return { count: admins.length, admins };
      } catch {
        return { count: 0, admins: [] };
      }
    },
  },
  {
    name: "get_admin_action_count_today",
    description: "Returns the count of activity logs recorded today.",
    category: "Admin",
    permission: "read",
    execute: async () => {
      try {
        return await Log.countDocuments({
          timestamp: {
            $gte: startOfDay(new Date()),
            $lte: endOfDay(new Date()),
          },
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_suspended_admins_count",
    description: "Returns the count of suspended admin accounts.",
    category: "Admin",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Admin.countDocuments({ status: account_status.SUSPENDED })
      ),
  },

  // ── Membership Extra (2) ───────────────────────────────────────────────────
  {
    name: "get_membership_expiry_risk_count",
    description:
      "Returns count of members whose membership is ACTIVE or RENEWED but who applied more than 90 days ago with no recent renewal activity.",
    category: "Membership",
    permission: "read",
    execute: async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      try {
        return await Student.countDocuments({
          membershipStatus: {
            $in: [membership_status.ACTIVE, membership_status.RENEWED],
          },
          createdAt: { $lte: ninetyDaysAgo },
        });
      } catch {
        return 0;
      }
    },
  },
  {
    name: "get_pending_membership_detail_count",
    description: "Returns count of students with PENDING membership status.",
    category: "Membership",
    permission: "read",
    execute: () =>
      safeCount(() =>
        Student.countDocuments({
          membershipStatus: membership_status.PENDING,
        })
      ),
  },
];

// ─── Write Tools (15) ────────────────────────────────────────────────────────

const writeTools: ChatTool[] = [
  // ── Orders (3) ─────────────────────────────────────────────────────────────

  {
    name: "create_order",
    description:
      "Creates Pending order(s) for one or more students for the same product. Product can be identified by product_id or product_name. Size and color are optional and only apply if the product supports them. Use id_number for a single student, or id_numbers for multiple students (each gets their own separate order). Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "id_number",
        description:
          "Student ID number to create the order for. Composed of 8 digits. Required unless id_numbers is provided.",
        pattern: "^\\d{8}$",
      },
      {
        name: "id_numbers",
        description:
          'Comma-separated list of student ID numbers (e.g. "20230001, 20230002") to create the same order for multiple students. Each student gets their own separate order. Required unless id_number is provided.',
      },
      {
        name: "product_id",
        description:
          "MongoDB ObjectId of the product. Required unless product_name is provided.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "product_name",
        description:
          "Name of the product. Required unless product_id is provided.",
      },
      {
        name: "quantity",
        description:
          "How many units to order. Must be a positive whole number.",
        pattern: "^\\d+$",
      },
      {
        name: "size",
        description:
          "Optional t-shirt size (e.g. S, M, L, XL). Only applies if the product has sizes.",
      },
      {
        name: "color",
        description:
          "Optional color variation. Only applies if the product has color variations.",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as {
        id_number?: string;
        id_numbers?: string | string[];
        product_id?: string;
        product_name?: string;
        quantity?: number | string;
        size?: string;
        color?: string;
      };

      const rawIdNumbers: string[] = [];
      if (Array.isArray(parsed.id_numbers)) {
        rawIdNumbers.push(...parsed.id_numbers.map(String));
      } else if (typeof parsed.id_numbers === "string") {
        rawIdNumbers.push(...parsed.id_numbers.split(","));
      }
      if (parsed.id_number) rawIdNumbers.push(parsed.id_number);

      const idList = Array.from(
        new Set(
          rawIdNumbers.map((id) => id.trim()).filter((id) => id.length > 0)
        )
      );
      if (idList.length === 0)
        throw new Error("id_number or id_numbers is required");
      if (!parsed.product_id && !parsed.product_name)
        throw new Error("product_id or product_name is required");
      const quantity = Number(parsed.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0)
        throw new Error("quantity must be a positive whole number");

      const students = await Student.find({
        id_number: { $in: idList },
      });
      const foundIds = new Set(students.map((s) => s.id_number));
      const missing = idList.filter((id) => !foundIds.has(id));
      if (missing.length > 0)
        throw new Error(`Student not found: ${missing.join(", ")}`);

      let merch;
      if (parsed.product_id) {
        merch = await Merch.findById(new Types.ObjectId(parsed.product_id));
      } else {
        const escaped = parsed.product_name!.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        merch = await Merch.findOne({
          name: { $regex: new RegExp(`^${escaped}$`, "i") },
        });
      }
      if (!merch) throw new Error("Product not found");

      const items = [
        {
          product_id: merch._id.toString(),
          quantity,
          sizes: parsed.size,
          variation: parsed.color,
        },
      ] as unknown as Parameters<typeof orderService.orderProcessingService>[0];

      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const processOrder = await orderService.orderProcessingService(
          items,
          session
        );
        const createdOrders: unknown[] = [];
        for (const student of students) {
          const finalOrder = {
            id_number: student.id_number,
            course: student.course,
            year: student.year,
            student_name: studentService.fullNameFormat(student),
            items: processOrder.orderItems,
            total: processOrder.orderTotal,
            order_date: new Date(),
            order_status: "Pending",
            role: student.role,
          };
          const newOrder = new Orders(finalOrder);
          await newOrder.save({ session });
          createdOrders.push({
            order_id: newOrder._id,
            student_name: finalOrder.student_name,
            id_number: finalOrder.id_number,
          });
        }
        await session.commitTransaction();
        session.endSession();
        return {
          message:
            createdOrders.length === 1
              ? "Order created successfully (Pending approval)"
              : `${createdOrders.length} orders created successfully (Pending approval)`,
          orders: createdOrders,
          product_name: merch.name,
          quantity,
          size: parsed.size,
          color: parsed.color,
          total_per_order: processOrder.orderTotal,
        };
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },

  {
    name: "get_order_by_id_number",
    description:
      "Retrieves an order by using student ID number. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "id_number",
        description:
          "Student ID number of the order to retrieve composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");

      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const result = await orderService.getOrderByIdNumber(
          parsed.id_number,
          session
        );
        await session.commitTransaction();
        session.endSession();
        return result;
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },
  {
    name: "cancel_order",
    description:
      "Cancels Pending Orders by its MongoDB _id and restores product stock. Dont call this tool if the order is not pending. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "order_id",
        description: "MongoDB ObjectId of the order to cancel.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { order_id?: string };
      if (!parsed.order_id) throw new Error("order_id is required");
      const oid = new Types.ObjectId(parsed.order_id);
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const result = await orderService.cancelOrderWithStockRestore(
          oid,
          session
        );
        await session.commitTransaction();
        session.endSession();
        return result;
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },
  {
    name: "approve_order",
    description:
      "Approves a pending order by its MongoDB _id. Sets status to Paid, records transaction date. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "order_id",
        description: "MongoDB ObjectId of the pending order to approve.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "cash",
        description:
          "Cash amount received (defaults to order total if omitted).",
        pattern: "^\\d+(\\.\\d+)?$",
      },
    ],
    execute: async (args: unknown, userAccess: string, userName: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { order_id?: string; cash?: number };
      if (!parsed.order_id) throw new Error("order_id is required");
      const oid = new Types.ObjectId(parsed.order_id);
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const result = await orderService.approveOrderService(
          oid,
          `${userName} (NoetixAI)`,
          parsed.cash,
          session
        );
        if (!result) throw new Error("Order approval failed");
        await session.commitTransaction();
        session.endSession();
        return { message: "Order approved successfully" };
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },
  {
    name: "process_refund",
    description:
      "Processes a full refund for a paid order. Sets order status to Refunded and restores stock. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "order_id",
        description: "MongoDB ObjectId of the paid order to refund.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { order_id?: string };
      if (!parsed.order_id) throw new Error("order_id is required");
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const result = await refundService.processRefund(
          parsed.order_id,
          "NoetixAI",
          "NoetixAI",
          session
        );
        await session.commitTransaction();
        session.endSession();
        return result;
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },

  // ── Membership (2) ─────────────────────────────────────────────────────────
  {
    name: "approve_membership",
    description:
      "Approves a student membership request. Sets membership status to ACTIVE or RENEWED. Requires ADMIN or FINANCE access.",
    category: "Membership",
    permission: "admin_finance",
    args: [
      {
        name: "id_number",
        description:
          "Student ID number of the member to approve, id number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");
      const student = await Student.findOne({
        id_number: parsed.id_number.trim(),
      });
      if (!student) throw new Error("Student not found");
      const result = await membershipService.checkApplication(student);
      return { message: "Membership approved", result };
    },
  },
  {
    name: "revoke_membership",
    description:
      "Revokes all student memberships, setting every student's membershipStatus to NOT_APPLIED. ADMIN only.",
    category: "Membership",
    permission: "admin_only",
    execute: async (_args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const result = await membershipService.revokeMembership();
      return { message: "All memberships revoked", result };
    },
  },

  // ── Merch (3) ──────────────────────────────────────────────────────────────
  {
    name: "publish_merch",
    description:
      "Publishes or unpublishes a merchandise product by toggling is_active. Requires ADMIN or FINANCE access.",
    category: "Merch",
    permission: "admin_finance",
    args: [
      {
        name: "product_id",
        description: "MongoDB ObjectId of the product to publish/unpublish.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "active",
        description: "True to publish, false to unpublish.",
        pattern: "^(true|false)$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { product_id?: string; active?: boolean };
      if (!parsed.product_id) throw new Error("product_id is required");
      if (parsed.active === undefined)
        throw new Error("active is required (true or false)");
      const result = await merchandiseService.toggleMerchActive(
        new Types.ObjectId(parsed.product_id),
        parsed.active
      );
      return {
        message: `Product ${parsed.active ? "published" : "unpublished"}`,
        product: result,
      };
    },
  },
  {
    name: "update_merch_stock",
    description:
      "Updates the stock count for a merchandise product. Requires ADMIN or FINANCE access.",
    category: "Merch",
    permission: "admin_finance",
    args: [
      {
        name: "product_id",
        description: "MongoDB ObjectId of the product.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "stocks",
        description: "New stock count.",
        pattern: "^\\d+$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { product_id?: string; stocks?: number };
      if (!parsed.product_id || parsed.stocks === undefined)
        throw new Error("product_id and stocks are required");
      const result = await merchandiseService.updateStockById(
        new Types.ObjectId(parsed.product_id),
        parsed.stocks
      );
      return { message: "Stock updated", product: result };
    },
  },
  {
    name: "soft_delete_merch",
    description:
      "Soft-deletes a merchandise product by setting is_active to false. Requires ADMIN or FINANCE access.",
    category: "Merch",
    permission: "admin_finance",
    args: [
      {
        name: "product_id",
        description: "MongoDB ObjectId of the product to soft-delete.",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { product_id?: string };
      if (!parsed.product_id) throw new Error("product_id is required");
      const result = await merchandiseService.toggleMerchActive(
        new Types.ObjectId(parsed.product_id),
        false
      );
      return { message: "Product soft-deleted", product: result };
    },
  },

  // ── Events (3) ─────────────────────────────────────────────────────────────
  {
    name: "add_event_attendee",
    description:
      "Adds a student as an attendee to an event by student ID number. ADMIN only.",
    category: "Events",
    permission: "admin_only",
    args: [
      {
        name: "event_id",
        description: "Event eventId string.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "event_name",
        description:
          "Optional event name to identify the event instead of event_id.",
      },
      {
        name: "id_number",
        description:
          "Student ID number to add as attendee. id number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as {
        event_id?: string;
        event_name?: string;
        id_number?: string;
      };
      if (!parsed.id_number) throw new Error("id_number is required");
      if (!parsed.event_id && !parsed.event_name)
        throw new Error("event_id or event_name is required");
      const eventId = parsed.event_id ?? "";
      return EventV2Service.addAttendee(eventId, parsed.id_number);
    },
  },
  {
    name: "edit_attendee",
    description:
      "Returns attendee details for an event participant. ADMIN only.",
    category: "Events",
    permission: "admin_only",
    args: [
      {
        name: "event_id",
        description: "Event eventId string.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "event_name",
        description:
          "Optional event name to identify the event instead of event_id.",
      },
      {
        name: "id_number",
        description:
          "Student ID number of the attendee. id number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as {
        event_id?: string;
        event_name?: string;
        id_number?: string;
      };
      if (!parsed.id_number) throw new Error("id_number is required");
      if (!parsed.event_id && !parsed.event_name)
        throw new Error("event_id or event_name is required");
      const filter: Record<string, unknown> = {};
      if (parsed.event_id) filter.eventId = parsed.event_id;
      if (parsed.event_name) filter.eventName = parsed.event_name;
      const event = await Event.findOne(filter);
      if (!event) throw new Error("Event not found");
      const attendee = (event.attendees as Array<{ id_number: string }>).find(
        (a) => a.id_number === parsed.id_number
      );
      if (!attendee) throw new Error("Attendee not found in event");
      return {
        message: "Attendee found",
        event_id: parsed.event_id,
        event_name: parsed.event_name,
        id_number: parsed.id_number,
        attendee,
      };
    },
  },
  {
    name: "mark_attendance",
    description: "Records attendance for a student at an event. ADMIN only.",
    category: "Events",
    permission: "admin_only",
    args: [
      {
        name: "event_id",
        description: "Event eventId string.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "event_name",
        description:
          "Optional event name to identify the event instead of event_id.",
      },
      {
        name: "id_number",
        description: "Student ID number. id number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
      {
        name: "session",
        description:
          "Session to mark: morning, afternoon, or evening. Defaults to morning.",
        pattern: "^(morning|afternoon|evening)$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as {
        event_id?: string;
        event_name?: string;
        id_number?: string;
        session?: string;
      };
      if (!parsed.id_number) throw new Error("id_number is required");
      if (!parsed.event_id && !parsed.event_name)
        throw new Error("event_id or event_name is required");
      const sessionKey = (parsed.session ?? "morning") as
        | "morning"
        | "afternoon"
        | "evening";
      const eventId = parsed.event_id ?? "";
      const student = await Student.findOne({ id_number: parsed.id_number });
      const result = await markAttendance({
        eventId,
        attendeeIdNumber: parsed.id_number,
        attendeeName: student
          ? `${student.first_name} ${student.last_name}`
          : "Unknown",
        campus: student?.campus ?? "Unknown",
        course: student?.course ?? "Unknown",
        year: student?.year ?? 0,
        confirmedByAdminName: "NoetixAI",
      });
      return {
        message: `Attendance marked (${sessionKey})`,
        event_id: parsed.event_id,
        event_name: parsed.event_name,
        id_number: parsed.id_number,
        session: sessionKey,
        attendee: result.attendee,
      };
    },
  },

  // ── Recruitment (2) ────────────────────────────────────────────────────────
  {
    name: "update_application_status",
    description:
      "Updates the status of a recruitment application. Requires ADMIN, FINANCE, DEVELOPER, EXECUTIVE, or HEAD_FINANCE.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "application_id",
        description: "MongoDB ObjectId of the application.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "status",
        description:
          "New status: APPROVED, REJECTED, INTERVIEW_SCHEDULED, INTERVIEWING, WITHDRAWN.",
        pattern:
          "^(APPROVED|REJECTED|INTERVIEW_SCHEDULED|INTERVIEWING|WITHDRAWN)$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as { application_id?: string; status?: string };
      if (!parsed.application_id || !parsed.status)
        throw new Error("application_id and status are required");
      const result = await recruitmentService.updateApplicationStatus(
        parsed.application_id,
        {} as any
      );
      return { message: "Application status updated", application: result };
    },
  },
  {
    name: "toggle_position_hiring",
    description:
      "Toggles a recruitment position's hiringStatus between OPEN and CLOSED. Requires full admin access.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "position_id",
        description: "MongoDB ObjectId of the recruitment position.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as { position_id?: string };
      if (!parsed.position_id) throw new Error("position_id is required");
      const result = await recruitmentService.toggleHiringStatus(
        parsed.position_id,
        {} as any
      );
      return {
        message: `Position ${result.hiringStatus.toLowerCase()}`,
        position_id: parsed.position_id,
        hiringStatus: result.hiringStatus,
      };
    },
  },

  // ── Admin (2) ──────────────────────────────────────────────────────────────
  {
    name: "suspend_admin_account",
    description:
      "Suspends an admin account by setting status to SUSPENDED. ADMIN only.",
    category: "Admin",
    permission: "admin_only",
    args: [
      {
        name: "id_number",
        description:
          "ID number of the admin to suspend. ID number composed of 8 digits with -admin appended.",
        pattern: "^\\d{8}-admin$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");
      return adminService.suspendByIdNumber(parsed.id_number);
    },
  },
  {
    name: "add_admin_account",
    description: "Creates a new admin account. ADMIN only.",
    category: "Admin",
    permission: "admin_only",
    args: [
      {
        name: "id_number",
        description:
          "Unique ID number for the new admin. ID number composed of 8 digits with -admin appended.",
        pattern: "^\\d{8}-admin$",
      },
      { name: "name", description: "Full name of the new admin." },
      {
        name: "password",
        description: "Initial password for the admin account.",
      },
      { name: "course", description: "Course: BSIT, BSCS, ACT." },
      { name: "position", description: "Position within the organization." },
      { name: "year", description: "Year of the admin." },
      {
        name: "email",
        description: "Email address of the admin.",
        pattern: "^\\S+@\\S+\\.\\S+$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as {
        id_number?: string;
        name?: string;
        password?: string;
        access?: string;
        course?: string;
        position?: string;
        year?: string;
        email?: string;
      };
      if (
        !parsed.id_number ||
        !parsed.name ||
        !parsed.password ||
        !parsed.course ||
        !parsed.position ||
        !parsed.year ||
        !parsed.email
      ) {
        throw new Error("All fields are required");
      }
      const result = await adminService.create(
        {
          id_number: parsed.id_number,
          name: parsed.name,
          password: parsed.password,
          course: parsed.course,
          position: parsed.position,
          year: parsed.year,
          email: parsed.email,
        },
        {} as any
      );
      return { message: "Admin account created", id_number: parsed.id_number };
    },
  },

  // ── Orders Extra (1) ───────────────────────────────────────────────────────
  {
    name: "approve_multiple_orders",
    description:
      "Approves multiple pending orders by their MongoDB _ids in a single call. Each order is processed independently. Requires ADMIN or FINANCE access.",
    category: "Orders",
    permission: "admin_finance",
    args: [
      {
        name: "order_ids",
        description: "Array of MongoDB ObjectIds of pending orders to approve.",
      },
    ],
    execute: async (args: unknown, userAccess: string, userName: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { order_ids?: string[] };
      if (
        !parsed.order_ids ||
        !Array.isArray(parsed.order_ids) ||
        parsed.order_ids.length === 0
      )
        throw new Error("order_ids is required and must be a non-empty array");
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const results: Array<{ order_id: string; status: string }> = [];
        for (const orderId of parsed.order_ids) {
          const oid = new Types.ObjectId(orderId);
          const order = await Orders.findById(oid).session(session);
          if (!order) continue;
          if (order.order_status !== "Pending") {
            results.push({ order_id: orderId, status: "not_pending" });
            continue;
          }
          const result = await orderService.approveOrderService(
            oid,
            `${userName} (NoetixAI)`,
            undefined,
            session
          );
          if (result) {
            results.push({ order_id: orderId, status: "approved" });
          }
        }
        await session.commitTransaction();
        session.endSession();
        const approved = results.filter((r) => r.status === "approved").length;
        return {
          message: `${approved} order(s) approved`,
          results,
        };
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },

  // ── Merch Extra (3) ────────────────────────────────────────────────────────
  {
    name: "create_merch_product",
    description:
      "Creates a new merchandise product with name, price, stock, category, and type. Requires ADMIN or FINANCE access.",
    category: "Merch",
    permission: "admin_finance",
    args: [
      { name: "name", description: "Product name." },
      {
        name: "price",
        description: "Product price as a positive number.",
        pattern: "^\\d+(\\.\\d+)?$",
      },
      {
        name: "stocks",
        description: "Initial stock count.",
        pattern: "^\\d+$",
      },
      {
        name: "category",
        description: "Product category (e.g. shirt, pant, accessory).",
      },
      { name: "type", description: "Product type." },
      {
        name: "start_date",
        description:
          "Optional start date for sale (ISO date string). Defaults to now.",
      },
      {
        name: "end_date",
        description: "Optional end date for sale (ISO date string).",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as {
        name?: string;
        price?: number | string;
        stocks?: number | string;
        category?: string;
        type?: string;
        start_date?: string;
        end_date?: string;
      };
      if (
        !parsed.name ||
        parsed.price === undefined ||
        parsed.stocks === undefined ||
        !parsed.category ||
        !parsed.type
      )
        throw new Error("name, price, stocks, category, and type are required");
      const priceNum =
        typeof parsed.price === "string"
          ? parseFloat(parsed.price)
          : parsed.price;
      const stocksNum =
        typeof parsed.stocks === "string"
          ? parseInt(parsed.stocks, 10)
          : parsed.stocks;
      if (isNaN(priceNum) || priceNum < 0)
        throw new Error("price must be a non-negative number");
      if (isNaN(stocksNum) || stocksNum < 0)
        throw new Error("stocks must be a non-negative integer");
      const newMerch = new Merch({
        name: parsed.name.trim(),
        price: priceNum,
        stocks: stocksNum,
        category: parsed.category.trim(),
        type: parsed.type.trim(),
        is_active: true,
        start_date: parsed.start_date
          ? new Date(parsed.start_date)
          : new Date(),
        end_date: parsed.end_date ? new Date(parsed.end_date) : undefined,
      });
      await newMerch.save();
      return {
        message: "Product created",
        product_id: newMerch._id.toString(),
        name: newMerch.name,
      };
    },
  },
  {
    name: "edit_merch_product",
    description:
      "Edits name, price, stock, or category of an existing product by product_id. Requires ADMIN or FINANCE access.",
    category: "Merch",
    permission: "admin_finance",
    args: [
      {
        name: "product_id",
        description: "MongoDB ObjectId of the product to edit.",
        pattern: "^[a-f0-9]{24}$",
      },
      { name: "name", description: "New product name." },
      {
        name: "price",
        description: "New price as a non-negative number.",
        pattern: "^\\d+(\\.\\d+)?$",
      },
      {
        name: "stocks",
        description: "New stock count.",
        pattern: "^\\d+$",
      },
      { name: "category", description: "New category." },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as {
        product_id?: string;
        name?: string;
        price?: number | string;
        stocks?: number | string;
        category?: string;
      };
      if (!parsed.product_id) throw new Error("product_id is required");
      const updates: Record<string, unknown> = {};
      if (parsed.name) updates.name = parsed.name.trim();
      if (parsed.price !== undefined) {
        const priceNum =
          typeof parsed.price === "string"
            ? parseFloat(parsed.price)
            : parsed.price;
        if (isNaN(priceNum) || priceNum < 0)
          throw new Error("price must be a non-negative number");
        updates.price = priceNum;
      }
      if (parsed.stocks !== undefined) {
        const stocksNum =
          typeof parsed.stocks === "string"
            ? parseInt(parsed.stocks, 10)
            : parsed.stocks;
        if (isNaN(stocksNum) || stocksNum < 0)
          throw new Error("stocks must be a non-negative integer");
        updates.stocks = stocksNum;
      }
      if (parsed.category) updates.category = parsed.category.trim();
      if (Object.keys(updates).length === 0)
        throw new Error("At least one field to update is required");
      const result = await Merch.findByIdAndUpdate(
        new Types.ObjectId(parsed.product_id),
        { $set: updates },
        { new: true }
      );
      if (!result) throw new Error("Product not found");
      return { message: "Product updated", product: result };
    },
  },
  {
    name: "delete_merch_product",
    description:
      "Permanently removes a merchandise product by product_id. ADMIN only.",
    category: "Merch",
    permission: "admin_only",
    args: [
      {
        name: "product_id",
        description: "MongoDB ObjectId of the product to delete.",
        pattern: "^[a-f0-9]{24}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { product_id?: string };
      if (!parsed.product_id) throw new Error("product_id is required");
      const result = await Merch.findByIdAndDelete(
        new Types.ObjectId(parsed.product_id)
      );
      if (!result) throw new Error("Product not found");
      return { message: "Product deleted", product_id: parsed.product_id };
    },
  },

  // ── Events Extra (2) ───────────────────────────────────────────────────────
  {
    name: "add_event",
    description:
      "Creates a new event with name, description, date, venue, and theme. ADMIN only.",
    category: "Events",
    permission: "admin_only",
    args: [
      { name: "event_name", description: "Event name." },
      { name: "event_description", description: "Event description." },
      {
        name: "event_date",
        description: "Event date as ISO date string (e.g. 2026-12-31).",
      },
      { name: "event_venue", description: "Event venue location." },
      { name: "event_theme", description: "Event theme." },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as {
        event_name?: string;
        event_description?: string;
        event_date?: string;
        event_venue?: string;
        event_theme?: string;
      };
      if (!parsed.event_name || !parsed.event_description || !parsed.event_date)
        throw new Error(
          "event_name, event_description, and event_date are required"
        );
      const newEvent = new Event({
        eventId: new Types.ObjectId(),
        eventName: parsed.event_name.trim(),
        eventDescription: parsed.event_description.trim(),
        eventDate: new Date(parsed.event_date),
        eventVenue: parsed.event_venue ?? "",
        eventTheme: parsed.event_theme ?? "",
        status: "UPCOMING",
        attendees: [],
        sales_data: [
          { campus: "UC_MAIN", unitsSold: 0, totalRevenue: 0 },
          { campus: "UC_BANILAD", unitsSold: 0, totalRevenue: 0 },
          { campus: "UC_LM", unitsSold: 0, totalRevenue: 0 },
          { campus: "UC_PT", unitsSold: 0, totalRevenue: 0 },
          { campus: "UC_CS", unitsSold: 0, totalRevenue: 0 },
        ],
        totalUnitsSold: 0,
        totalRevenueAll: 0,
        createdBy: "NoetixAI",
      });
      await newEvent.save();
      return {
        message: "Event created",
        event_id: newEvent.eventId.toString(),
        event_name: newEvent.eventName,
      };
    },
  },
  {
    name: "remove_event_attendee",
    description:
      "Removes a student from an event by event_id and student id_number. ADMIN only.",
    category: "Events",
    permission: "admin_only",
    args: [
      {
        name: "event_id",
        description: "MongoDB ObjectId of the event.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "id_number",
        description: "Student ID number. id number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { event_id?: string; id_number?: string };
      if (!parsed.event_id || !parsed.id_number)
        throw new Error("event_id and id_number are required");
      return EventV2Service.removeAttendee(parsed.event_id, parsed.id_number);
    },
  },

  // ── Recruitment Extra (2) ──────────────────────────────────────────────────
  {
    name: "schedule_interview",
    description:
      "Schedules an interview for an application with date, location, and notes. Requires full admin access.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "application_id",
        description: "MongoDB ObjectId of the application.",
        pattern: "^[a-f0-9]{24}$",
      },
      {
        name: "scheduled_at",
        description: "Interview date/time as ISO date string.",
      },
      { name: "location", description: "Interview location." },
      { name: "notes", description: "Optional interview notes." },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as {
        application_id?: string;
        scheduled_at?: string;
        location?: string;
        notes?: string;
      };
      if (!parsed.application_id || !parsed.scheduled_at)
        throw new Error("application_id and scheduled_at are required");
      const result = await recruitmentService.createInterview(
        parsed.application_id,
        {
          body: {
            scheduledAt: parsed.scheduled_at,
            location: parsed.location,
            notes: parsed.notes,
          },
        } as any
      );
      return {
        message: "Interview scheduled",
        application_id: parsed.application_id,
      };
    },
  },
  {
    name: "add_interview_note",
    description:
      "Adds internal notes to an application without changing its status. Requires full admin access.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "application_id",
        description: "MongoDB ObjectId of the application.",
        pattern: "^[a-f0-9]{24}$",
      },
      { name: "note", description: "Internal note to add." },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as { application_id?: string; note?: string };
      if (!parsed.application_id || !parsed.note)
        throw new Error("application_id and note are required");
      const app = await Application.findById(
        new Types.ObjectId(parsed.application_id)
      );
      if (!app) throw new Error("Application not found");
      app.internalNotes = parsed.note;
      await app.save();
      return { message: "Note added", application_id: parsed.application_id };
    },
  },

  // ── Admin Extra (3) ────────────────────────────────────────────────────────
  {
    name: "suspend_student_account",
    description:
      "Suspends a student account by setting status to SUSPENDED. Requires ADMIN access.",
    category: "Admin",
    permission: "admin_only",
    args: [
      {
        name: "id_number",
        description: "Student ID number composed of 8 digits.",
        pattern: "^\\d{8}$",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { id_number?: string };
      if (!parsed.id_number) throw new Error("id_number is required");
      return studentService.suspendByIdNumber(parsed.id_number.trim());
    },
  },
  {
    name: "bulk_suspend_students",
    description:
      "Suspends multiple student accounts in one call by comma-separated id_numbers. Requires ADMIN access.",
    category: "Admin",
    permission: "admin_only",
    args: [
      {
        name: "id_numbers",
        description:
          'Comma-separated list of student ID numbers (e.g. "20230001, 20230002").',
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { id_numbers?: string };
      if (!parsed.id_numbers) throw new Error("id_numbers is required");
      const idList = parsed.id_numbers
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length === 8);
      if (idList.length === 0) throw new Error("No valid id_numbers provided");
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        const result = await Student.updateMany(
          { id_number: { $in: idList } },
          { $set: { status: account_status.SUSPENDED } },
          { session }
        );
        await session.commitTransaction();
        session.endSession();
        return {
          message: `${result.modifiedCount} student(s) suspended`,
          count: result.modifiedCount,
        };
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        if (session.transaction) session.endSession();
        throw err;
      }
    },
  },
  {
    name: "approve_multiple_memberships",
    description:
      "Approves memberships for multiple students in one call. Each student gets their membership checked and updated. Requires ADMIN or FINANCE access.",
    category: "Membership",
    permission: "admin_finance",
    args: [
      {
        name: "id_numbers",
        description:
          'Comma-separated list of student ID numbers (e.g. "20230001, 20230002").',
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_finance", userAccess);
      const parsed = args as { id_numbers?: string };
      if (!parsed.id_numbers) throw new Error("id_numbers is required");
      const idList = parsed.id_numbers
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (idList.length === 0) throw new Error("No valid id_numbers provided");
      const results: Array<{ id_number: string; status: string }> = [];
      for (const idNumber of idList) {
        const student = await Student.findOne({ id_number: idNumber });
        if (!student) {
          results.push({ id_number: idNumber, status: "not_found" });
          continue;
        }
        try {
          await membershipService.checkApplication(student);
          results.push({ id_number: idNumber, status: "approved" });
        } catch {
          results.push({ id_number: idNumber, status: "error" });
        }
      }
      const approved = results.filter((r) => r.status === "approved").length;
      return {
        message: `${approved} membership(s) approved`,
        results,
      };
    },
  },

  // ── Recruitment Position (1) ───────────────────────────────────────────────
  {
    name: "update_position_details",
    description:
      "Updates a recruitment position's title, description, and requirements. Requires full admin access.",
    category: "Recruitment",
    permission: "admin_full",
    args: [
      {
        name: "position_id",
        description: "MongoDB ObjectId of the recruitment position.",
        pattern: "^[a-f0-9]{24}$",
      },
      { name: "title", description: "New position title." },
      { name: "description", description: "New position description." },
      {
        name: "requirements",
        description: "Comma-separated list of requirements.",
      },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_full", userAccess);
      const parsed = args as {
        position_id?: string;
        title?: string;
        description?: string;
        requirements?: string;
      };
      if (!parsed.position_id) throw new Error("position_id is required");
      const position = await RecruitmentPosition.findById(
        new Types.ObjectId(parsed.position_id)
      );
      if (!position) throw new Error("Position not found");
      const updates: Record<string, unknown> = {};
      if (parsed.title) updates.title = parsed.title.trim();
      if (parsed.description !== undefined)
        updates.description = parsed.description;
      if (parsed.requirements !== undefined) {
        updates.requirements = parsed.requirements
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
      }
      if (Object.keys(updates).length === 0)
        throw new Error("At least one field to update is required");
      Object.assign(position, updates);
      await position.save();
      return { message: "Position updated", position_id: parsed.position_id };
    },
  },

  // ── Settings (1) ───────────────────────────────────────────────────────────
  {
    name: "update_system_setting",
    description: "Updates a system-wide setting key-value pair. ADMIN only.",
    category: "Settings",
    permission: "admin_only",
    args: [
      {
        name: "key",
        description: "Setting key (e.g. chatbotEnabled, membership_price).",
      },
      { name: "value", description: "Setting value (string or number)." },
    ],
    execute: async (args: unknown, userAccess: string) => {
      checkPermission("admin_only", userAccess);
      const parsed = args as { key?: string; value?: unknown };
      if (!parsed.key) throw new Error("key is required");
      if (parsed.value === undefined) throw new Error("value is required");
      const setting = await Settings.findOne();
      if (!setting) {
        const newSetting = new Settings({ [parsed.key]: parsed.value });
        await newSetting.save();
        return {
          message: "Setting created",
          key: parsed.key,
          value: parsed.value,
        };
      }
      (setting as unknown as Record<string, unknown>)[parsed.key] =
        parsed.value;
      await setting.save();
      return {
        message: "Setting updated",
        key: parsed.key,
        value: parsed.value,
      };
    },
  },
];

// ─── Registry ────────────────────────────────────────────────────────────────

// Converts a tool result into a short human-readable summary string.
// Used for agent history so Noetix works with clean text instead of raw
// JSON blobs, which keeps its final answers (and the UI) readable.
const MAX_SUMMARY_ITEMS = 5;
const MAX_SUMMARY_LENGTH = 1200;

const summarizeValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return `${value.length} item(s): ${value
      .slice(0, MAX_SUMMARY_ITEMS)
      .map((v) => summarizeValue(v))
      .join("; ")}`;
  }
  if (typeof value === "object") {
    // Mongoose documents expose toJSON() — use it so internal fields
    // ($__, _doc, activePaths...) never leak into summaries.
    const doc = value as { toJSON?: () => unknown };
    if (typeof doc.toJSON === "function") {
      const json = doc.toJSON();
      return summarizeValue(json);
    }
    return Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => !k.startsWith("$") && v !== undefined && v !== null)
      .map(
        ([k, v]) =>
          `${k}=${typeof v === "object" ? summarizeValue(v) : String(v)}`
      )
      .join(", ");
  }
  return String(value);
};

export const summarizeToolResult = (result: unknown): string => {
  if (result === null || result === undefined) return "null";
  if (typeof result !== "object") return String(result);

  const obj = result as Record<string, unknown>;
  let summary: string;

  if (typeof obj.message === "string") {
    const extras = Object.entries(obj)
      .filter(
        ([k, v]) => k !== "message" && v !== undefined && v !== null && v !== ""
      )
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${summarizeValue(v)}`)
      .join(", ");
    summary = extras ? `${obj.message} (${extras})` : obj.message;
  } else if (Array.isArray(result)) {
    summary = `${result.length} record(s). ${result
      .slice(0, MAX_SUMMARY_ITEMS)
      .map((entry) => `- ${summarizeValue(entry)}`)
      .join("\n")}`;
    if (result.length > MAX_SUMMARY_ITEMS) {
      summary += `\n(and ${result.length - MAX_SUMMARY_ITEMS} more)`;
    }
  } else {
    summary = summarizeValue(obj);
  }

  return summary.slice(0, MAX_SUMMARY_LENGTH);
};

export const TOOL_REGISTRY: ChatTool[] = [...readTools, ...writeTools];

export const getToolRegistry = (): ChatTool[] => [...TOOL_REGISTRY];

export const findToolByName = (name: string): ChatTool | undefined =>
  TOOL_REGISTRY.find((t) => t.name === name);
