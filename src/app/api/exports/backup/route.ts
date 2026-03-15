import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getExportData } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = getExportData();

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dyaccounts-backup-${Date.now()}.json"`,
    },
  });
}
