"use server";

import { requirePartner } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { nextInvoiceNo } from "@/lib/numbering";
import { invoiceAmounts, paymentDueDate } from "@/lib/invoice";

export async function issueInvoice(formData: FormData) {
  const user = await requirePartner();

  const deliveryId = String(formData.get("deliveryId"));
  const issueDate = new Date(String(formData.get("issueDate")));
  if (Number.isNaN(issueDate.getTime())) redirect(`/invoices/new?deliveryId=${deliveryId}&error=date`);

  const delivery = await db.delivery.findFirst({
    where: { id: deliveryId, partnerId: user.id, status: "PASSED", invoices: { none: {} } },
  });
  if (!delivery) redirect("/invoices");

  await db.invoice.create({
    data: {
      invoiceNo: await nextInvoiceNo(),
      deliveryId,
      partnerId: user.id,
      ...invoiceAmounts(delivery),
      issueDate,
      paymentDueDate: paymentDueDate(issueDate),
      status: "ISSUED",
    },
  });

  redirect("/invoices");
}
