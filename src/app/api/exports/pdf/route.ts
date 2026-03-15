import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getExportData } from "@/lib/db";
import { formatDate, formatIqd } from "@/lib/format";

function pickFontPath() {
  const candidates = [
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = getExportData();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontPath = pickFontPath();
  const fontBytes = fontPath
    ? fs.readFileSync(fontPath)
    : fs.readFileSync(path.join(process.cwd(), "node_modules", "pdf-lib", "assets", "ubuntu", "Ubuntu-R.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });

  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  let y = height - 42;

  page.drawText("dyaccounts Report", {
    x: width - 230,
    y,
    size: 20,
    font,
    color: rgb(0.1, 0.17, 0.25),
  });

  y -= 28;
  page.drawText(`Generated: ${formatDate(data.generatedAt)}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: rgb(0.35, 0.4, 0.45),
  });

  y -= 26;
  page.drawText(`Total customers: ${data.totals.totalCustomers}`, {
    x: 40,
    y,
    size: 12,
    font,
    color: rgb(0.1, 0.17, 0.25),
  });
  page.drawText(`Current debt: ${formatIqd(data.totals.totalDebt)}`, {
    x: 300,
    y,
    size: 12,
    font,
    color: rgb(0.1, 0.17, 0.25),
  });

  y -= 34;
  page.drawText("Customers summary", {
    x: 40,
    y,
    size: 14,
    font,
    color: rgb(0.0, 0.35, 0.33),
  });

  y -= 20;
  for (const customer of data.customers.slice(0, 16)) {
    const line = `${customer.fullName} | @${customer.username} | debt: ${formatIqd(
      customer.currentDebt,
    )} | paid: ${formatIqd(customer.totalPaid)}`;

    page.drawText(line, {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0.18, 0.2, 0.24),
      maxWidth: width - 80,
    });

    y -= 18;
    if (y < 110) {
      break;
    }
  }

  y -= 10;
  page.drawText("Recent payments", {
    x: 40,
    y,
    size: 14,
    font,
    color: rgb(0.0, 0.35, 0.33),
  });

  y -= 20;
  for (const payment of data.payments.slice(0, 10)) {
    const line = `${payment.customerName} | ${formatIqd(payment.amount)} | ${
      payment.kind === "clear" ? "clear" : "payment"
    } | ${formatDate(payment.createdAt)}`;

    page.drawText(line, {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0.18, 0.2, 0.24),
      maxWidth: width - 80,
    });

    y -= 18;
    if (y < 40) {
      break;
    }
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dyaccounts-report-${Date.now()}.pdf"`,
    },
  });
}
