"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Printer, ArrowLeft, Loader2, Download, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function QrGeneratorPage() {
    const { settings } = useSettings();
    const [tableQrs, setTableQrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTableForPrint, setSelectedTableForPrint] = useState<string | null>(null);
    const [copiedTable, setCopiedTable] = useState<string | null>(null);
    const [downloadingTable, setDownloadingTable] = useState<string | null>(null);

    useEffect(() => {
        const loadQrs = async () => {
            try {
                const res = await fetch("/api/generate-table-qrs");
                const data = await res.json();
                setTableQrs(data.tables || []);
            } catch (err) {
                console.error("Failed to load table QRs:", err);
            } finally {
                setLoading(false);
            }
        };
        loadQrs();
    }, []);

    useEffect(() => {
        const handleAfterPrint = () => {
            setSelectedTableForPrint(null);
        };

        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    const handlePrintAll = () => {
        setSelectedTableForPrint("ALL");
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const handlePrintSingle = (tableNo: string) => {
        setSelectedTableForPrint(tableNo);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const handleCopyLink = (tableNo: string, url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedTable(tableNo);
        setTimeout(() => setCopiedTable(null), 2000);
    };

    const handleDownloadQr = async (tableNo: string, url: string) => {
        try {
            setDownloadingTable(tableNo);
            const highResUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}`;
            const res = await fetch(highResUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Table-${String(tableNo).padStart(2, "0")}-QR.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to download QR image:", err);
        } finally {
            setDownloadingTable(null);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto font-sans print:p-0 print:m-0 print:max-w-none">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @media print {
              body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              @page {
                size: auto;
                margin: 0mm;
              }
            }
          `,
                }}
            />

            {/* Top Header Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8 print:hidden">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                        title="Back to Admin"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Table QR Cards Generator</h1>
                        <p className="text-slate-500 text-sm">Download high-res QRs for design or print directly.</p>
                    </div>
                </div>

                <button
                    onClick={handlePrintAll}
                    disabled={loading || tableQrs.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-sm"
                >
                    <Printer className="w-5 h-5" /> Print All QR Cards
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 print:hidden">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
                    <p className="text-sm font-bold">Loading table QR codes from database...</p>
                </div>
            ) : tableQrs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 font-bold print:hidden">
                    No tables found in the database.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:block print:w-full print:p-0">
                    {tableQrs.map((item) => {
                        const isHiddenInPrint =
                            selectedTableForPrint &&
                            selectedTableForPrint !== "ALL" &&
                            selectedTableForPrint !== item.tableNo;

                        return (
                            <div
                                key={item.tableNo}
                                className={`bg-white rounded-2xl border-2 border-slate-900 p-5 flex flex-col items-center text-center shadow-sm transition-all ${isHiddenInPrint ? "print:hidden" : ""
                                    } print:w-[72mm] print:max-w-[72mm] print:mx-auto print:mb-8 print:p-4 print:border-2 print:border-black print:rounded-2xl print:break-inside-avoid print:page-break-after-always print:shadow-none`}
                            >
                                <h2 className="text-lg font-black text-slate-900 leading-tight mb-0.5">
                                    {settings?.name || "Restaurant"}
                                </h2>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 mb-3">
                                    Scan to Order
                                </p>

                                {/* QR Code Preview */}
                                <div className="bg-white p-2 rounded-xl border border-slate-200 mb-3 flex items-center justify-center">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.url)}`}
                                        alt={`Table ${item.tableNo} QR`}
                                        className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                                    />
                                </div>

                                {/* Table Badge */}
                                <div className="bg-slate-900 text-white font-black text-base py-1.5 px-6 rounded-xl w-full mb-3 tracking-wide">
                                    TABLE {String(item.tableNo).padStart(2, "0")}
                                </div>

                                {/* Design Export Actions (Hidden on Print) */}
                                <div className="w-full grid grid-cols-2 gap-2 mb-2 print:hidden">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadQr(item.tableNo, item.url)}
                                        disabled={downloadingTable === item.tableNo}
                                        className="w-full py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                        title="Download 1000x1000 PNG for Photoshop/Canva"
                                    >
                                        {downloadingTable === item.tableNo ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5" />
                                        )}
                                        Save PNG
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCopyLink(item.tableNo, item.url)}
                                        className="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        title="Copy direct signed link for Canva"
                                    >
                                        {copiedTable === item.tableNo ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> Copy Link
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Thermal Print Single Button (Hidden on Print) */}
                                <button
                                    type="button"
                                    onClick={() => handlePrintSingle(item.tableNo)}
                                    className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-orange-200 print:hidden"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Thermal Print
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}