"use client";

import React from "react";
import { Receipt, Printer } from "lucide-react";
import { Order, OrderItem } from "./types";

interface SettlementPanelProps {
    activeSettlementOrder: Order | null;
    currencySymbol: string;
    taxPct: number;
    serviceChargePct: number;
    discountType: "percent" | "fixed";
    discountValue: number;
    subtotal: number;
    calculatedDiscount: number;
    serviceCharge: number;
    tax: number;
    grandTotal: number;
    setDiscountType: (type: "percent" | "fixed") => void;
    setDiscountValue: (val: number) => void;
    onOpenCustomDiscountModal: () => void;
    onPrintGuestBill: (order: Order) => void;
    onSelectPaymentMethod: (method: string) => void;
    onInstantCardPay: () => void;
}

export const SettlementPanel: React.FC<SettlementPanelProps> = ({
    activeSettlementOrder,
    currencySymbol,
    taxPct,
    serviceChargePct,
    discountType,
    discountValue,
    subtotal,
    calculatedDiscount,
    serviceCharge,
    tax,
    grandTotal,
    setDiscountType,
    setDiscountValue,
    onOpenCustomDiscountModal,
    onPrintGuestBill,
    onSelectPaymentMethod,
    onInstantCardPay,
}) => {
    // Consolidate identical items
    const consolidateItems = (items: OrderItem[]) => {
        const map = new Map<string, OrderItem>();
        items.forEach((item) => {
            const key = `${item.id}-${(item.notes || "").trim()}`;
            if (map.has(key)) {
                const existing = map.get(key)!;
                existing.quantity += item.quantity;
            } else {
                map.set(key, { ...item });
            }
        });
        return Array.from(map.values());
    };

    const renderItemNameWithBadge = (rawName: string) => {
        const isLarge = /\(Large\)/i.test(rawName);
        const isRegular = /\(Regular\)/i.test(rawName);
        const cleanName = rawName.replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "").trim();

        return (
            <span className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900">{cleanName}</span>
                {isLarge && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-300/60 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                        Large
                    </span>
                )}
                {isRegular && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-black border border-blue-300/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                        Regular
                    </span>
                )}
            </span>
        );
    };

    const isDineIn =
        Boolean(activeSettlementOrder) &&
        (!activeSettlementOrder?.order_type ||
            activeSettlementOrder?.order_type === "dine-in");

    return (
        <div className="col-span-12 lg:col-span-3 xl:col-span-3 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-2xs overflow-hidden p-3.5 h-full">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="pb-2 border-b border-slate-100 flex justify-between items-center mb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <h2 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                            SETTLEMENT
                        </h2>
                        {activeSettlementOrder?.id === "DIRECT-STAGED" && (
                            <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Direct
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                        {activeSettlementOrder
                            ? activeSettlementOrder.order_type === "takeaway"
                                ? "Takeaway"
                                : activeSettlementOrder.order_type === "delivery"
                                    ? "Delivery"
                                    : `T${activeSettlementOrder.table_no}`
                            : ""}
                    </span>
                </div>

                {activeSettlementOrder ? (
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        {/* Items List */}
                        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 flex-1 overflow-hidden flex flex-col mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 shrink-0">
                                Order Items ({activeSettlementOrder.items?.length || 0})
                            </span>
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 pr-1 no-scrollbar text-xs">
                                {consolidateItems(activeSettlementOrder.items || []).map(
                                    (item, idx) => (
                                        <div
                                            key={idx}
                                            className="py-2 flex justify-between items-center font-bold"
                                        >
                                            <div className="truncate pr-2 min-w-0">
                                                <span className="text-slate-700 block truncate">
                                                    {item.quantity}x {renderItemNameWithBadge(item.name)}
                                                </span>
                                                {item.notes && (
                                                    <span className="text-[10px] text-slate-400 italic block truncate mt-0.5">
                                                        ↳ {item.notes}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-slate-900 shrink-0 font-black">
                                                {currencySymbol}{" "}
                                                {(item.price * item.quantity).toLocaleString()}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Calculations Breakdown */}
                        <div className="space-y-1.5 text-xs font-bold text-slate-600 pt-1 shrink-0 bg-white">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="text-slate-900">
                                    {currencySymbol} {subtotal.toLocaleString()}
                                </span>
                            </div>
                            {taxPct > 0 && (
                                <div className="flex justify-between text-slate-500 text-[11px]">
                                    <span>Tax ({taxPct}%):</span>
                                    <span>
                                        {currencySymbol} {tax.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {isDineIn && (
                                <div className="flex justify-between text-slate-500 text-[11px]">
                                    <span>Service Charge ({serviceChargePct}%):</span>
                                    <span>
                                        {currencySymbol} {serviceCharge.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {calculatedDiscount > 0 && (
                                <div className="flex justify-between text-rose-500 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                    <span>Discount:</span>
                                    <span>
                                        -{currencySymbol} {calculatedDiscount.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Grand Total */}
                            <div className="pt-2 border-t border-slate-200 mt-1">
                                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    GRAND TOTAL
                                </span>
                                <span className="text-2xl font-black text-orange-600">
                                    {currencySymbol} {grandTotal.toLocaleString()}
                                </span>
                            </div>

                            {/* Discount Section */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                        DISCOUNT
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onOpenCustomDiscountModal}
                                        className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
                                    >
                                        Custom %
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {[0, 5, 10].map((pct) => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => {
                                                setDiscountType("percent");
                                                setDiscountValue(pct);
                                            }}
                                            className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${discountType === "percent" && discountValue === pct
                                                    ? "bg-orange-500 border-orange-500 text-white shadow-xs"
                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Print Guest Bill Button */}
                            {isDineIn && (
                                <div className="pt-1.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onPrintGuestBill({
                                                ...activeSettlementOrder,
                                                discount: calculatedDiscount,
                                                total_amount: grandTotal,
                                            })
                                        }
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Print Bill (Guest Check)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-10">
                        <Receipt className="w-10 h-10 opacity-20 mb-2" />
                        <p className="font-bold text-xs">No order selected for settlement</p>
                    </div>
                )}
            </div>

            {/* Payment Action Buttons with Soft Glow */}
            <div className="pt-2 border-t border-slate-100 shrink-0 mt-2">
                <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    INSTANT SETTLE VIA
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        type="button"
                        onClick={() => onSelectPaymentMethod("Cash")}
                        disabled={!activeSettlementOrder}
                        className="py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer border border-emerald-300/60 shadow-[0_0_12px_rgba(160,185,129,0.15)]"
                    >
                        Cash <span className="text-[9px] opacity-75 block font-normal">F2</span>
                    </button>
                    <button
                        type="button"
                        onClick={onInstantCardPay}
                        disabled={!activeSettlementOrder}
                        className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer border border-blue-300/60 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                    >
                        Card <span className="text-[9px] opacity-75 block font-normal">F3</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectPaymentMethod("Split")}
                        disabled={!activeSettlementOrder}
                        className="py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-black text-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer border border-purple-300/60 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                    >
                        Split <span className="text-[9px] opacity-75 block font-normal">F4</span>
                    </button>
                </div>
            </div>
        </div>
    );
};