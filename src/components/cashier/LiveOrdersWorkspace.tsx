"use client";

import React from "react";
import { Receipt, Minus, Trash2, Printer, Plus } from "lucide-react";
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Receipt className="w-12 h-12 opacity-20 mb-2" />
                <p className="font-bold text-xs text-slate-500">No active ticket selected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Select any table or incoming QR order above to view details
                </p>
            </div>
        );
    }

    const items = selectedOrder.items || [];

    // NEW badge & highlight should ONLY show if this order ALREADY had some printed items (True Add-on)
    const hasPreviouslyPrintedItems = items.some((i) => i.kot_printed === true);
    const isQr = incomingQrOrders.some((o) => o.id === selectedOrder.id);

    // Consolidate identical items
    const consolidatedItems = () => {
        const map = new Map<string, OrderItem>();
        items.forEach((item) => {
            const key = `${item.id}-${(item.notes || "").trim()}-${item.kot_printed ? "printed" : "unprinted"}`;
            if (map.has(key)) {
                map.get(key)!.quantity += item.quantity;
            } else {
                map.set(key, { ...item });
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            const aUnprinted = a.kot_printed === false || a.kot_printed === undefined ? 0 : 1;
            const bUnprinted = b.kot_printed === false || b.kot_printed === undefined ? 0 : 1;
            return aUnprinted - bUnprinted;
        });
    };

    // Clean food name and format size badge neatly
    const formatItemDetails = (rawName: string) => {
        const isLarge = /\(Large\)/i.test(rawName);
        const isRegular = /\(Regular\)/i.test(rawName);
        const cleanName = rawName.replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "").trim();

        return { cleanName, isLarge, isRegular };
    };

    const displayList = consolidatedItems();

    return (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-3 bg-white min-h-0">

            {/* Order Info Header Banner */}
            <div className="bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 rounded-2xl flex justify-between items-center mb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm tracking-tight">
                        {selectedOrder.order_type === "takeaway"
                            ? "🛍️ Takeaway"
                            : selectedOrder.order_type === "delivery"
                                ? "🛵 Delivery"
                                : `Table T${selectedOrder.table_no}`}
                    </span>
                    {isQr && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider animate-pulse">
                            QR Order
                        </span>
                    )}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                    #{selectedOrder.id.slice(0, 5).toUpperCase()}
                </span>
            </div>

            {/* Modern Item List Cards */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
                {displayList.map((item, idx) => {
                    const { cleanName, isLarge, isRegular } = formatItemDetails(item.name);
                    const isUnprinted = item.kot_printed === false || item.kot_printed === undefined;
                    // Only mark as NEW if this ticket is a real add-on order
                    const isRealNewAddOn = hasPreviouslyPrintedItems && isUnprinted;

                    return (
                        <div
                            key={idx}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isRealNewAddOn
                                    ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30"
                                    : "bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
                                }`}
                        >
                            {/* Left Side: Quantity & Food Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${isRealNewAddOn
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "bg-slate-100 text-slate-800"
                                        }`}
                                >
                                    {item.quantity}x
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-xs text-slate-800 tracking-tight truncate">
                                            {cleanName}
                                        </span>

                                        {/* Clean Size Badges */}
                                        {isLarge && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                                Large
                                            </span>
                                        )}
                                        {isRegular && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                                Regular
                                            </span>
                                        )}

                                        {/* NEW Badge only for true Add-ons */}
                                        {isRealNewAddOn && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
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

                            {/* Right Side: Price & Void / Reduce Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-black text-slate-700">
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

            {/* Bottom Action Buttons */}
            <div className="pt-3 border-t border-slate-100 shrink-0 grid grid-cols-2 gap-2 mt-2">
                <button
                    type="button"
                    onClick={onOpenAddItemModal}
                    className="py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Add Item</span>
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