import { NextResponse } from "next/server";
import { verifyTableToken } from "@/lib/qrSecurity";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const token = searchParams.get("t");

    if (!table || !token) {
        return NextResponse.json({ valid: false, reason: "Missing table or token" }, { status: 400 });
    }

    const isValid = verifyTableToken(table, token);
    return NextResponse.json({ valid: isValid });
}