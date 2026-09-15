import { NextResponse } from "next/server";
import { generateTableToken } from "@/lib/qrSecurity";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    try {
        // 1. Fetch live tables directly from the database table
        const { data: dbTables, error } = await supabase
            .from("restaurant_tables")
            .select("*")
            .order("created_at", { ascending: true });

        let tablesList: string[] = [];

        if (!error && dbTables && dbTables.length > 0) {
            // Sort tables in numerical order (Table 1, Table 2, ... Table 10)
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

        // 2. Generate signed token for each table
        const tables = tablesList.map((tableNo) => {
            const token = generateTableToken(tableNo);
            return {
                tableNo,
                token,
                url: `${origin}/menu?table=${tableNo}&t=${token}`,
            };
        });

        return NextResponse.json({ tables });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, tables: [] }, { status: 500 });
    }
}