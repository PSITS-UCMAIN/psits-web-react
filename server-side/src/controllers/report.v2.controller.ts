import {
  reportService,
  type MerchandiseReportFilters,
  type MerchandiseReportRow,
  type RefundReportFilters,
  type RefundReportRow,
} from "../services/report.service";
import { catchAsync } from "../util/catch.async.util";
import { Request, Response } from "express";

const getFiltersFromQuery = (req: Request): MerchandiseReportFilters => ({
  search: req.query.search as string,
  referenceCode: req.query.referenceCode as string,
  studentId: req.query.studentId as string,
  rfid: req.query.rfid as string,
  name: req.query.name as string,
  course: req.query.course as string,
  year: req.query.year as string,
  productId: req.query.productId as string,
  productName: req.query.productName as string,
  batch: req.query.batch as string,
  size: req.query.size as string,
  color: req.query.color as string,
  dateFrom: req.query.dateFrom as string,
  dateTo: req.query.dateTo as string,
});

const escapeCsvCell = (value: unknown) => {
  const stringValue = Array.isArray(value)
    ? value.join(", ")
    : value instanceof Date
      ? value.toISOString()
      : String(value ?? "");
  const safeValue =
    typeof value === "string" && /^[=+\-@]/.test(stringValue)
      ? `'${stringValue}`
      : stringValue;
  return `"${safeValue.replace(/"/g, '""')}"`;
};

const toCsv = (rows: MerchandiseReportRow[]) => {
  const columns: Array<[string, (row: MerchandiseReportRow) => unknown]> = [
    ["Reference Code", (row) => row.reference_code],
    ["Product", (row) => row.product_name],
    ["Batch", (row) => row.batch],
    ["Student ID", (row) => row.id_number],
    ["RFID", (row) => row.rfid],
    ["Name", (row) => row.student_name],
    ["Course", (row) => row.course],
    ["Year Level", (row) => row.year],
    ["Size", (row) => row.size],
    ["Color", (row) => row.variation],
    ["Quantity", (row) => row.quantity],
    ["Total", (row) => row.total],
    ["Transaction Date", (row) => row.transaction_date],
  ];

  return [
    columns.map(([heading]) => escapeCsvCell(heading)).join(","),
    ...rows.map((row) =>
      columns.map(([, getValue]) => escapeCsvCell(getValue(row))).join(",")
    ),
  ].join("\n");
};

const getRefundFiltersFromQuery = (req: Request): RefundReportFilters => ({
  search: req.query.search as string,
  dateFrom: req.query.dateFrom as string,
  dateTo: req.query.dateTo as string,
});

const toRefundCsv = (rows: RefundReportRow[]) => {
  const columns: Array<[string, (row: RefundReportRow) => unknown]> = [
    ["Refund ID", (row) => row.refund_id],
    ["Order Reference", (row) => row.order_reference],
    ["Product", (row) => row.product_name],
    ["Student ID", (row) => row.id_number],
    ["Name", (row) => row.student_name],
    ["Course", (row) => row.course],
    ["Year Level", (row) => row.year],
    ["Amount", (row) => row.refund_price],
    ["Refunded By", (row) => row.refund_admin],
    ["Refund Date", (row) => row.refund_date],
  ];

  return [
    columns.map(([heading]) => escapeCsvCell(heading)).join(","),
    ...rows.map((row) =>
      columns.map(([, getValue]) => escapeCsvCell(getValue(row))).join(",")
    ),
  ].join("\n");
};

class ReportController {
  fetchReport = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await reportService.getMerchandiseReport({
      page,
      limit,
      ...getFiltersFromQuery(req),
    });
    return res.status(200).json({
      message: "Successfully retrieved merchandise reports",
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      summary: result.summary,
    });
  });

  fetchFilterOptions = catchAsync(async (_req: Request, res: Response) => {
    const products = await reportService.getMerchandiseReportFilterOptions();
    return res.status(200).json({
      message: "Successfully retrieved merchandise report filter options",
      products,
    });
  });

  exportReport = catchAsync(async (req: Request, res: Response) => {
    const rows = await reportService.getMerchandiseReportExportRows(
      getFiltersFromQuery(req)
    );
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="merchandise-report-${date}.csv"`
    );
    return res.status(200).send(`\uFEFF${toCsv(rows)}`);
  });

  fetchRefundReport = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await reportService.getRefundReport({
      page,
      limit,
      ...getRefundFiltersFromQuery(req),
    });
    return res.status(200).json({
      message: "Successfully retrieved refund reports",
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      summary: result.summary,
    });
  });

  exportRefundReport = catchAsync(async (req: Request, res: Response) => {
    const rows = await reportService.getRefundReportExportRows(
      getRefundFiltersFromQuery(req)
    );
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="refund-report-${date}.csv"`
    );
    return res.status(200).send(`\uFEFF${toRefundCsv(rows)}`);
  });
}

export const reportController = new ReportController();
