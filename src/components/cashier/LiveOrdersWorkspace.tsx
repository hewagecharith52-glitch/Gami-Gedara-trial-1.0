"use client";

import React from "react";
import { Receipt, Minus, Trash2, Printer, Plus, QrCode } from "lucide-react";
import { Order, OrderItem } from "./types";

interface LiveOrdersWorkspaceProps {
    selectedOrder: Order | null;
    incomingQrOrders: Order[];
    onOpenVoidModal: (orderId: string, itemId: string, delta: number) => void;
    onOpenAddItemModal: () => void;
    onPrintKot: (order: Order) => void;
}

export const LiveOrdersWorkspace: React.FC<LiveOrdersWorkspaceProps> = ({
    selectedOrder,
    incomingQrOrders,
    onOpenVoidModal,
    onOpenAddItemModal,
    onPrintKot,
}) => {
    if (!selectedOrder) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-white rounded-3xl border-2 border-orange-500/50 shadow-sm">
                <Receipt className="w-12 h-12 opacity-20 mb-2" />
                <p className="font-bold text-xs text-slate-500">No active ticket selected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Select any table or incoming QR order above to view details
                </p>
            </div>
        );
    }

    const items = selectedOrder.items || [];
    const isQr = incomingQrOrders.some((o) => o.id === selectedOrder.id);

    //  KOT Print    
    const hasAlreadyPrintedItems = items.some((i) => i.kot_printed === true);

    // Consolidate identical items
    const consolidatedItems = () => {
        const map = new Map<string, OrderItem>();
        items.forEach((item) => {
            const isPrinted = item.kot_printed === true;
            const isAddOn = hasAlreadyPrintedItems && !isPrinted;
            const key = `${item.id}-${(item.notes || "").trim()}-${isPrinted ? "printed" : "unprinted"}-${isAddOn ? "addon" : "base"}`;

            if (map.has(key)) {
                map.get(key)!.quantity += item.quantity;
            } else {
                map.set(key, { ...item });
            }
        });

        // Add-on    sort 
        return Array.from(map.values()).sort((a, b) => {
            const aIsAddOn = hasAlreadyPrintedItems && (a.kot_printed === false || a.kot_printed === undefined);
            const bIsAddOn = hasAlreadyPrintedItems && (b.kot_printed === false || b.kot_printed === undefined);
            if (aIsAddOn && !bIsAddOn) return -1;
            if (!aIsAddOn && bIsAddOn) return 1;
            return 0;
        });
    };

    const displayList = consolidatedItems();

    return (
        <div className="h-full w-full flex flex-col justify-between overflow-hidden p-3.5 bg-white rounded-3xl border-2 border-orange-500/50 shadow-sm transition-all">

            {/* Order Info Header Banner */}
            <div className="bg-slate-50 border border-slate-200/90 px-4 py-2.5 rounded-2xl flex justify-between items-center mb-2.5 shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <span className="font-black text-slate-900 text-sm tracking-tight">
                        {selectedOrder.order_type === "takeaway"
                            ? "🛍️ Takeaway"
                            : selectedOrder.order_type === "delivery"
                                ? "🛵 Delivery"
                                : `Table T${selectedOrder.table_no}`}
                    </span>

                    {isQr && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-300 text-[10px] font-black uppercase rounded-full tracking-wider shadow-2xs">
                            <QrCode className="w-3 h-3 text-orange-600" /> QR ORDER
                        </span>
                    )}
                </div>

                <span className="text-[11px] font-mono font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200">
                    #{selectedOrder.id.slice(0, 5).toUpperCase()}
                </span>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 min-h-0">
                {displayList.map((item, idx) => {
                    const isUnprinted = item.kot_printed === false || item.kot_printed === undefined;
                    const isRealAddOn = hasAlreadyPrintedItems && isUnprinted;

                    return (
                        <div
                            key={idx}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isRealAddOn
                                ? "bg-amber-50/90 border-amber-400 ring-1 ring-amber-400/40 shadow-xs"
                                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${isRealAddOn
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-800"
                                        }`}
                                >
                                    {item.quantity}x
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-black text-xs tracking-tight truncate ${isRealAddOn ? "text-amber-950" : "text-slate-800"}`}>
                                            {item.name}
                                        </span>

                                        {isRealAddOn && (
                                            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse shadow-2xs">
                                                NEW ADD-ON
                                            </span>
                                        )}
                                    </div>

                                    {item.notes && (
                                        <p className="text-[11px] text-orange-600 font-medium truncate mt-0.5">
                                            ↳ {item.notes}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-xs font-black ${isRealAddOn ? "text-amber-900" : "text-slate-800"}`}>
                                    {(Number(item.price || 0) * item.quantity).toLocaleString()}
                                </span>

                                {selectedOrder.status?.toLowerCase() !== "completed" && (
                                    <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200/80">
                                        <button
                                            type="button"
                                            onClick={() => onOpenVoidModal(selectedOrder.id, item.id, -1)}
                                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                            title="Reduce quantity (PIN)"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onOpenVoidModal(selectedOrder.id, item.id, 0)}
                                            className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Remove item (PIN)"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Action Buttons (Fixed single '+' icon) */}
            <div className="pt-2.5 border-t border-slate-100 shrink-0 grid grid-cols-2 gap-2 mt-2">
                <button
                    type="button"
                    onClick={onOpenAddItemModal}
                    className="py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Add Item</span>
                </button>
                <button
                    type="button"
                    onClick={() => onPrintKot(selectedOrder)}
                    className="py-2.5 px-3 text-xs font-black rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                    <Printer className="w-3.5 h-3.5" />
                    <span>KOT Print</span>
                </button>
            </div>

        </div>
    );
};