import {
  isValidObjectId,
  Types,
  type ClientSession,
  type PipelineStage,
} from "mongoose";
import { Orders } from "../models/orders.model";
import { Refund } from "../models/refund.model";
import { Report } from "../models/report.model";
import { IOrdersItems } from "../models/orders.interface";

export interface MerchandiseReportRow {
  _id: string;
  order_id: string;
  product_id: string;
  reference_code: string;
  product_name: string;
  batch: string;
  id_number: string;
  rfid: string;
  student_name: string;
  course: string;
  year: string;
  size: unknown;
  variation: unknown;
  quantity: number;
  total: number;
  transaction_date: Date;
  date: Date;
}

export interface MerchandiseReportFilters {
  search?: string;
  referenceCode?: string;
  studentId?: string;
  rfid?: string;
  name?: string;
  course?: string;
  year?: string;
  productId?: string;
  productName?: string;
  batch?: string;
  size?: string;
  color?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MerchandiseReportQuery extends MerchandiseReportFilters {
  page?: number;
  limit?: number;
}

export interface MerchandiseReportSummary {
  unitsSold: number;
  totalRevenue: number;
}

export interface MerchandiseReportProductOption {
  productId: string;
  productName: string;
  batches: string[];
}

export interface CreateReportInput {
  orderId?: string;
  order_id?: string;
  idNumber?: string;
  id_number?: string;
  merchId?: string;
  merch_id?: string;
  itemCount?: number;
  item_count?: number;
  total?: number;
  date?: Date | string;
}

type CreateReportPayload = CreateReportInput | CreateReportInput[];

export interface CreateReportResult {
  success: boolean;
  report?: unknown;
  message?: string;
}

export interface MerchandiseReportResult {
  rows: MerchandiseReportRow[];
  data: MerchandiseReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: MerchandiseReportSummary;
}

export interface RefundReportRow {
  _id: string;
  refund_id: string;
  order_id: string;
  order_reference: string;
  product_name: string;
  student_name: string;
  id_number: string;
  course: string;
  year: string;
  refund_price: number;
  refund_admin: string;
  refund_date: Date | null;
}

export interface RefundReportFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RefundReportQuery extends RefundReportFilters {
  page?: number;
  limit?: number;
}

export interface RefundReportSummary {
  refundCount: number;
  totalRefunded: number;
}

export interface RefundReportResult {
  data: RefundReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: RefundReportSummary;
}

const normalizePage = (value?: number) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(1, Math.floor(value));
};

const normalizeLimit = (value?: number) => {
  if (!value || Number.isNaN(value)) return 10;
  return Math.min(100, Math.max(1, Math.floor(value)));
};

const toLowerTrim = (value: unknown): string => {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsMatch = (value: string) => ({
  $regex: escapeRegex(value.trim()),
  $options: "i",
});

const exactMatch = (value: string) => ({
  $regex: `^${escapeRegex(value.trim())}$`,
  $options: "i",
});

const parseDateBoundary = (
  value: string | undefined,
  endExclusive: boolean
) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (endExclusive) date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

const buildPaidOrderItemPipeline = (
  filters: MerchandiseReportFilters = {}
): PipelineStage[] => {
  const matchConditions: Record<string, unknown>[] = [];
  const orderMatch: Record<string, unknown> = { order_status: "Paid" };

  if (filters.productId?.trim() && isValidObjectId(filters.productId)) {
    orderMatch["items.product_id"] = new Types.ObjectId(filters.productId);
  }

  if (filters.search?.trim()) {
    const query = containsMatch(filters.search);
    matchConditions.push({
      $or: [
        { id_number: query },
        { rfid: query },
        { reference_code: query },
        { student_name: query },
        { "items.product_name": query },
      ],
    });
  }

  if (filters.referenceCode?.trim()) {
    matchConditions.push({
      reference_code: containsMatch(filters.referenceCode),
    });
  }
  if (filters.studentId?.trim()) {
    matchConditions.push({ id_number: containsMatch(filters.studentId) });
  }
  if (filters.rfid?.trim()) {
    matchConditions.push({ rfid: containsMatch(filters.rfid) });
  }
  if (filters.name?.trim()) {
    matchConditions.push({ student_name: containsMatch(filters.name) });
  }
  if (filters.course?.trim()) {
    matchConditions.push({ course: exactMatch(filters.course) });
  }
  if (filters.year?.trim()) {
    const year = Number(filters.year);
    if (Number.isFinite(year)) matchConditions.push({ year });
  }
  if (filters.productId?.trim()) {
    matchConditions.push({ report_product_id: filters.productId.trim() });
  }
  if (filters.productName?.trim()) {
    matchConditions.push({
      "items.product_name": exactMatch(filters.productName),
    });
  }
  if (filters.batch?.trim()) {
    matchConditions.push({ report_batch: filters.batch.trim() });
  }
  if (filters.size?.trim()) {
    matchConditions.push({ "items.sizes": exactMatch(filters.size) });
  }
  if (filters.color?.trim()) {
    matchConditions.push({ "items.variation": exactMatch(filters.color) });
  }

  const dateFrom = parseDateBoundary(filters.dateFrom, false);
  const dateTo = parseDateBoundary(filters.dateTo, true);
  if (dateFrom || dateTo) {
    const dateMatch: Record<string, Date> = {};
    if (dateFrom) dateMatch.$gte = dateFrom;
    if (dateTo) dateMatch.$lt = dateTo;
    matchConditions.push({ report_transaction_date: dateMatch });
  }

  return [
    { $match: orderMatch },
    { $unwind: "$items" },
    {
      $addFields: {
        report_product_id: {
          $convert: {
            input: "$items.product_id",
            to: "string",
            onError: "",
            onNull: "",
          },
        },
        report_item_id: {
          $convert: {
            input: "$items._id",
            to: "string",
            onError: "",
            onNull: "",
          },
        },
        report_batch: {
          $trim: {
            input: {
              $convert: {
                input: "$items.batch",
                to: "string",
                onError: "",
                onNull: "",
              },
            },
          },
        },
        report_transaction_date: {
          $ifNull: ["$transaction_date", "$order_date"],
        },
      },
    },
    ...(matchConditions.length > 0
      ? [{ $match: { $and: matchConditions } }]
      : []),
  ];
};

const rowProjection: PipelineStage.Project = {
  $project: {
    _id: {
      $concat: [
        { $toString: "$_id" },
        ":",
        {
          $cond: [
            { $ne: ["$report_item_id", ""] },
            "$report_item_id",
            "$report_product_id",
          ],
        },
      ],
    },
    order_id: { $toString: "$_id" },
    product_id: "$report_product_id",
    reference_code: { $ifNull: ["$reference_code", "-"] },
    product_name: { $ifNull: ["$items.product_name", "-"] },
    batch: "$report_batch",
    id_number: { $ifNull: ["$id_number", "-"] },
    rfid: { $ifNull: ["$rfid", ""] },
    student_name: { $ifNull: ["$student_name", "-"] },
    course: { $ifNull: ["$course", "-"] },
    year: {
      $convert: { input: "$year", to: "string", onError: "-", onNull: "-" },
    },
    size: { $ifNull: ["$items.sizes", []] },
    variation: { $ifNull: ["$items.variation", []] },
    quantity: { $ifNull: ["$items.quantity", 0] },
    total: { $ifNull: ["$items.sub_total", 0] },
    transaction_date: "$report_transaction_date",
    date: "$report_transaction_date",
  },
};

const rowSort: PipelineStage.Sort = {
  $sort: {
    report_transaction_date: -1,
    _id: -1,
    "items._id": 1,
  },
};

const mapToRow = (doc: Record<string, unknown>): MerchandiseReportRow => {
  const transactionDate =
    doc.transaction_date instanceof Date
      ? doc.transaction_date
      : new Date(doc.transaction_date as string | number | Date);

  return {
    _id: String(doc._id),
    order_id: String(doc.order_id ?? ""),
    product_id: String(doc.product_id ?? ""),
    reference_code: toLowerTrim(doc.reference_code)
      ? String(doc.reference_code)
      : "-",
    product_name: toLowerTrim(doc.product_name)
      ? String(doc.product_name)
      : "-",
    batch: String(doc.batch ?? ""),
    id_number: toLowerTrim(doc.id_number) ? String(doc.id_number) : "-",
    rfid: String(doc.rfid ?? ""),
    student_name: toLowerTrim(doc.student_name)
      ? String(doc.student_name)
      : "-",
    course: toLowerTrim(doc.course) ? String(doc.course) : "-",
    year: doc.year != null ? String(doc.year) : "-",
    size: doc.size ?? [],
    variation: doc.variation ?? [],
    quantity: Number(doc.quantity ?? 0),
    total: Number(doc.total ?? 0),
    transaction_date: transactionDate,
    date: transactionDate,
  };
};

export const getMerchandiseReport = async (
  params: MerchandiseReportQuery = {}
): Promise<MerchandiseReportResult> => {
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const skip = (page - 1) * limit;

  const [result] = await Orders.aggregate([
    ...buildPaidOrderItemPipeline(params),
    {
      $facet: {
        data: [rowSort, { $skip: skip }, { $limit: limit }, rowProjection],
        metadata: [{ $count: "total" }],
        summary: [
          {
            $group: {
              _id: null,
              unitsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
              totalRevenue: { $sum: { $ifNull: ["$items.sub_total", 0] } },
            },
          },
        ],
      },
    },
  ]);

  const rows = ((result?.data ?? []) as Record<string, unknown>[]).map(
    mapToRow
  );
  const total = Number(result?.metadata?.[0]?.total ?? 0);
  const summary = result?.summary?.[0] ?? {
    unitsSold: 0,
    totalRevenue: 0,
  };

  return {
    rows,
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      unitsSold: Number(summary.unitsSold ?? 0),
      totalRevenue: Number(summary.totalRevenue ?? 0),
    },
  };
};

export const getMerchandiseReportFilterOptions = async (): Promise<
  MerchandiseReportProductOption[]
> => {
  const options = await Orders.aggregate([
    ...buildPaidOrderItemPipeline(),
    {
      $match: {
        report_product_id: { $ne: "" },
        "items.product_name": { $nin: [null, ""] },
      },
    },
    {
      $group: {
        _id: "$report_product_id",
        productName: { $max: "$items.product_name" },
        batches: { $addToSet: "$report_batch" },
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        productName: 1,
        batches: { $setDifference: ["$batches", [""]] },
      },
    },
    { $sort: { productName: 1, productId: 1 } },
  ]);

  return options.map((option) => ({
    productId: String(option.productId),
    productName: String(option.productName),
    batches: (option.batches as unknown[])
      .map(String)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  }));
};

export const getMerchandiseReportExportRows = async (
  filters: MerchandiseReportFilters = {}
): Promise<MerchandiseReportRow[]> => {
  const rows = await Orders.aggregate([
    ...buildPaidOrderItemPipeline(filters),
    rowSort,
    rowProjection,
  ]);
  return (rows as Record<string, unknown>[]).map(mapToRow);
};

// Refund docs are written one per order item by refundService.processRefund;
// student details come from the refunded order.
const buildRefundPipeline = (
  filters: RefundReportFilters = {}
): PipelineStage[] => {
  const stages: PipelineStage[] = [];

  const dateFrom = parseDateBoundary(filters.dateFrom, false);
  const dateTo = parseDateBoundary(filters.dateTo, true);
  if (dateFrom || dateTo) {
    const dateMatch: Record<string, Date> = {};
    if (dateFrom) dateMatch.$gte = dateFrom;
    if (dateTo) dateMatch.$lt = dateTo;
    stages.push({ $match: { refund_date: dateMatch } });
  }

  stages.push(
    {
      $lookup: {
        from: Orders.collection.name,
        localField: "order_id",
        foreignField: "_id",
        as: "order",
      },
    },
    { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } }
  );

  if (filters.search?.trim()) {
    const query = containsMatch(filters.search);
    stages.push({
      $match: {
        $or: [
          { refund_id: query },
          { order_reference: query },
          { product_name: query },
          { refund_admin: query },
          { "order.student_name": query },
          { "order.id_number": query },
        ],
      },
    });
  }

  return stages;
};

const refundRowSort: PipelineStage.Sort = {
  $sort: { refund_date: -1, _id: -1 },
};

const refundRowProjection: PipelineStage.Project = {
  $project: {
    _id: { $toString: "$_id" },
    refund_id: "$refund_id",
    order_id: {
      $convert: { input: "$order_id", to: "string", onError: "", onNull: "" },
    },
    order_reference: "$order_reference",
    product_name: "$product_name",
    student_name: "$order.student_name",
    id_number: "$order.id_number",
    course: "$order.course",
    year: {
      $convert: { input: "$order.year", to: "string", onError: "", onNull: "" },
    },
    refund_price: { $ifNull: ["$refund_price", 0] },
    refund_admin: "$refund_admin",
    refund_date: "$refund_date",
  },
};

const textOrDash = (value: unknown): string =>
  toLowerTrim(value) ? String(value) : "-";

const mapToRefundRow = (doc: Record<string, unknown>): RefundReportRow => ({
  _id: String(doc._id),
  refund_id: textOrDash(doc.refund_id),
  order_id: String(doc.order_id ?? ""),
  order_reference: textOrDash(doc.order_reference),
  product_name: textOrDash(doc.product_name),
  student_name: textOrDash(doc.student_name),
  id_number: textOrDash(doc.id_number),
  course: textOrDash(doc.course),
  year: textOrDash(doc.year),
  refund_price: Number(doc.refund_price ?? 0),
  refund_admin: textOrDash(doc.refund_admin),
  refund_date: doc.refund_date instanceof Date ? doc.refund_date : null,
});

export const getRefundReport = async (
  params: RefundReportQuery = {}
): Promise<RefundReportResult> => {
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const skip = (page - 1) * limit;

  const [result] = await Refund.aggregate([
    ...buildRefundPipeline(params),
    {
      $facet: {
        data: [
          refundRowSort,
          { $skip: skip },
          { $limit: limit },
          refundRowProjection,
        ],
        metadata: [{ $count: "total" }],
        summary: [
          {
            $group: {
              _id: null,
              totalRefunded: { $sum: { $ifNull: ["$refund_price", 0] } },
            },
          },
        ],
      },
    },
  ]);

  const rows = ((result?.data ?? []) as Record<string, unknown>[]).map(
    mapToRefundRow
  );
  const total = Number(result?.metadata?.[0]?.total ?? 0);

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      refundCount: total,
      totalRefunded: Number(result?.summary?.[0]?.totalRefunded ?? 0),
    },
  };
};

export const getRefundReportExportRows = async (
  filters: RefundReportFilters = {}
): Promise<RefundReportRow[]> => {
  const rows = await Refund.aggregate([
    ...buildRefundPipeline(filters),
    refundRowSort,
    refundRowProjection,
  ]);
  return (rows as Record<string, unknown>[]).map(mapToRefundRow);
};

export const getMerchandiseProductNames = async (): Promise<string[]> => {
  const options = await getMerchandiseReportFilterOptions();
  return Array.from(new Set(options.map((option) => option.productName)));
};

export const getMerchandiseReportById = async (reportId: string) => {
  if (!isValidObjectId(reportId)) {
    throw new Error("Invalid report id.");
  }

  const report = await Report.findById(reportId)
    .populate({
      path: "order_id",
      select:
        "reference_code id_number rfid student_name course year transaction_date",
    })
    .populate({
      path: "merch_id",
      select: "name batch selectedVariations",
    })
    .lean();

  if (!report) return null;

  const order = report.order_id as {
    _id?: unknown;
    reference_code?: string;
    items?: IOrdersItems[];
    id_number?: string;
    rfid?: string;
    student_name?: string;
    course?: string;
    year?: number;
    transaction_date?: Date;
  } | null;

  const merch = report.merch_id as {
    _id?: unknown;
    name?: string;
    batch?: string;
    selectedSizes?: unknown;
    selectedVariations?: unknown;
  } | null;
  const transactionDate = order?.transaction_date ?? report.date;

  return {
    _id: String(report._id),
    order_id: String(order?._id ?? ""),
    product_id: String(merch?._id ?? ""),
    reference_code: order?.reference_code || "-",
    product_name: merch?.name || "-",
    batch: String(merch?.batch ?? ""),
    id_number: order?.id_number || report.id_number || "-",
    rfid: order?.rfid || "",
    student_name: order?.student_name || "-",
    course: order?.course || "-",
    year: order?.year != null ? String(order.year) : "-",
    size: order?.items ?? [],
    variation: merch?.selectedVariations ?? [],
    quantity: Number(report.item_count ?? 0),
    total: Number(report.total ?? 0),
    transaction_date:
      transactionDate instanceof Date
        ? transactionDate
        : new Date(transactionDate),
    date:
      transactionDate instanceof Date
        ? transactionDate
        : new Date(transactionDate),
  } satisfies MerchandiseReportRow;
};

export const deleteMerchandiseReportById = async (reportId: string) => {
  if (!isValidObjectId(reportId)) {
    throw new Error("Invalid report id.");
  }

  return Report.findByIdAndDelete(reportId);
};

export const createReports = async (
  ...args: unknown[]
): Promise<CreateReportResult> => {
  const rawPayload = args[0] as CreateReportPayload | undefined;
  const session = args[1] as ClientSession | undefined;

  const payloadArray = Array.isArray(rawPayload)
    ? rawPayload
    : rawPayload
      ? [rawPayload]
      : [];
  const docs = payloadArray.map((payload) => ({
    order_id: payload.orderId ?? payload.order_id,
    id_number: payload.idNumber ?? payload.id_number,
    merch_id: payload.merchId ?? payload.merch_id,
    item_count: Number(payload.itemCount ?? payload.item_count ?? 0),
    total: Number(payload.total ?? 0),
    date: payload.date ? new Date(payload.date) : new Date(),
  }));

  if (!docs.length) {
    return { success: true, report: [] };
  }

  try {
    const report = session
      ? await Report.insertMany(docs, { session, ordered: false })
      : await Report.insertMany(docs, { ordered: false });

    return { success: true, report };
  } catch (err: any) {
    if (err?.code === 11000) {
      return {
        success: true,
        report: err.insertedDocs ?? [],
        message: "One or more reports already existed and were skipped",
      };
    }
    throw err;
  }
};

export const reportService = {
  createReports,
  getMerchandiseReport,
  getMerchandiseReportById,
  deleteMerchandiseReportById,
  getMerchandiseProductNames,
  getMerchandiseReportFilterOptions,
  getMerchandiseReportExportRows,
  getRefundReport,
  getRefundReportExportRows,
};

export default reportService;
