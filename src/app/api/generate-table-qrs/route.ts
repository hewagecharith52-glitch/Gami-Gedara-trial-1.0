import { NextResponse } from "next/server";
import { generateTableToken } from "@/lib/qrSecurity";
import { supabase } from "@/lib/supabase";

// Force dynamic so fresh database table counts are always returned immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // 1. Resolve the actual live domain (Query parameter -> Headers -> Env fallback)
    const queryOrigin = searchParams.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const headerOrigin = host ? `${proto}://${host}` : null;

    const origin =
        queryOrigin ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        headerOrigin ||
        "https://gami-gedara-trial-1-0.vercel.app";

    try {
        // 2. Fetch live tables directly from the database table
        const { data: dbTables, error } = await supabase
            .from("restaurant_tables")
            .select("*")
            .order("created_at", { ascending: true });

        let tablesList: string[] = [];

        if (!error && dbTables && dbTables.length > 0) {
            // Sort tables in numerical order (Table 1, Table 2, ... Table 10, Table 11, Table 12)
            const sorted = [...dbTables].sort((a, b) => {
                const numA = parseInt(a.table_no, 10);
                const numB = parseInt(b.table_no, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a.table_no).localeCompare(String(b.table_no));
            });
            tablesList = sorted.map((t) => String(t.table_no));
        } else {
            // Fallback: 12 tables if table is not populated yet
            tablesList = Array.from({ length: 12 }, (_, i) => String(i + 1));
        }

        // 3. Generate signed token for each table
        const tables = tablesList.map((tableNo) => {
            const token = generateTableToken(tableNo);
            return {
                tableNo,
                token,
                url: `${origin}/menu?table=${tableNo}&t=${token}`,
            };
        });

        return NextResponse.json(
            { tables },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                },
            }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err.message, tables: [] }, { status: 500 });
    }
}