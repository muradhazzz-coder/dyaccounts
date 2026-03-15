import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { getExportData } from "@/lib/db";
import { formatDate } from "@/lib/format";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = getExportData();
  const workbook = XLSX.utils.book_new();

  const customersSheet = XLSX.utils.json_to_sheet(
    data.customers.map((customer) => ({
      "اسم الزبون": customer.fullName,
      "اسم المستخدم": customer.username,
      "إجمالي الموافق عليه": customer.totalApproved,
      "إجمالي المدفوع": customer.totalPaid,
      "الدين الحالي": customer.currentDebt,
      "طلبات معلقة": customer.pendingRequests,
      "تاريخ الإنشاء": formatDate(customer.createdAt),
    })),
  );

  const requestsSheet = XLSX.utils.json_to_sheet(
    data.requests.map((request) => ({
      "اسم الزبون": request.customerName,
      "اسم المستخدم": request.customerUsername,
      "المبلغ": request.amount,
      "النوع": request.source === "manual" ? "دين مباشر" : "طلب رصيد",
      "الحالة": request.status,
      "ملاحظة": request.note ?? "",
      "تاريخ الطلب": formatDate(request.createdAt),
      "تاريخ المراجعة": formatDate(request.reviewedAt),
    })),
  );

  const paymentsSheet = XLSX.utils.json_to_sheet(
    data.payments.map((payment) => ({
      "اسم الزبون": payment.customerName,
      "اسم المستخدم": payment.customerUsername,
      "المبلغ": payment.amount,
      "النوع": payment.kind === "clear" ? "تصفير كامل" : "دفعة",
      "ملاحظة": payment.note ?? "",
      "التاريخ": formatDate(payment.createdAt),
    })),
  );

  XLSX.utils.book_append_sheet(workbook, customersSheet, "الزبائن");
  XLSX.utils.book_append_sheet(workbook, requestsSheet, "الطلبات");
  XLSX.utils.book_append_sheet(workbook, paymentsSheet, "الدفعات");

  const file = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(file, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dyaccounts-export-${Date.now()}.xlsx"`,
    },
  });
}
