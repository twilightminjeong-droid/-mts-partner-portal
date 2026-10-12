type DeliveryAmounts = { deliveredQty: number; passQty: number | null; unitPrice: number };

export function invoiceAmounts(d: DeliveryAmounts) {
  const supplyAmount = (d.passQty ?? d.deliveredQty) * d.unitPrice;
  const taxAmount = Math.floor(supplyAmount * 0.1);
  return { supplyAmount, taxAmount, totalAmount: supplyAmount + taxAmount };
}

// 지급 조건: 발행월 익월 말일
export function paymentDueDate(issueDate: Date) {
  return new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 0);
}
