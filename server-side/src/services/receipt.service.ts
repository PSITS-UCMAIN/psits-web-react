import path from "path";
import ejs from "ejs";
import { MembershipHistory } from "../models/history.model";
import { Membership } from "../models/membership.model";
import { Orders } from "../models/orders.model";
import { formatReceiptDateTime } from "../mail_template/mail.template";
import { formatReceiptReference } from "../util/membership.util";

/**
 * Templates live in `dist/assets` after the `copy-assets` build step, and this
 * file compiles to `dist/services`, so the prefix is a single "..".
 * (`../../assets` resolves to `server-side/assets`, which does not exist.)
 */
const assetPath = (file: string) => path.join(__dirname, "../assets", file);

export class ReceiptNotFoundError extends Error {}

/**
 * Rebuilds a membership receipt from stored history.
 *
 * `MembershipHistory` records no cash or change, so `cash` mirrors the total and
 * `change` is zero — the convention the resend-email path has always used.
 */
export const renderMembershipReceiptHtml = async (
  referenceCode: string
): Promise<string> => {
  const history = await MembershipHistory.findOne({
    reference_code: referenceCode,
  }).populate("student");
  if (!history) {
    throw new ReceiptNotFoundError(
      `Membership history not found for ${referenceCode}`
    );
  }

  // The denormalized student fields were removed from the schema; derive
  // them from the populated student (null-safe for orphan records).
  const student = (history as any).student as {
    first_name: string;
    middle_name?: string;
    last_name: string;
    id_number: string;
    course: string;
    year: number;
  } | null;
  const fullName = student
    ? `${student.first_name} ${student.middle_name ?? ""} ${student.last_name}`.trim()
    : "";

  // The term lives on the parent membership, not the history row. Legacy rows
  // predate `membership_id`, so this stays optional and the reference falls back
  // to the bare code.
  const membership = history.membership_id
    ? await Membership.findById(history.membership_id).lean()
    : null;

  const html = await ejs.renderFile(assetPath("appr-membership-receipt.ejs"), {
    name: fullName,
    reference_code: history.reference_code,
    reference_display: formatReceiptReference(
      history.reference_code,
      membership?.term_name
    ),
    total: history.total,
    course: student?.course ?? "",
    year: student?.year ?? 0,
    admin: history.admin,
    date: new Date(history.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    change: 0,
  });

  return html;
};

export const renderOrderReceiptHtml = async (
  referenceCode: string
): Promise<string> => {
  const order = await Orders.findOne({ reference_code: referenceCode });
  if (!order) {
    throw new ReceiptNotFoundError(`Order not found for ${referenceCode}`);
  }

  const html = await ejs.renderFile(assetPath("appr-order-receipt.ejs"), {
    reference_code: order.reference_code,
    transaction_date: formatReceiptDateTime(order.transaction_date),
    student_name: order.student_name,
    id_number: order.id_number,
    course: order.course,
    year: order.year,
    admin: order.admin || "N/A",
    items: order.items.map((item: any) => ({
      product_name: item.product_name,
      batch: item.batch,
      sizes: item.sizes || [],
      variation: item.variation || [],
      quantity: item.quantity,
      sub_total: item.sub_total,
    })),
    cash: order.total,
    total: order.total,
  });

  return html;
};
