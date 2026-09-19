"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { Order } from "./types";

function ElapsedTime({ startTime }: { startTime: string }) {
    const [mins, setMins] = useState(0);
    useEffect(() => {
        const update = () => {
            setMins(
                Math.floor(
                    (new Date().getTime() - new Date(startTime).getTime()) / 60000
                )
            );
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [startTime]);
    return (
        <span
            className={
                mins >= 15 ? "text-rose-500 font-extrabold" : "text-slate-400 font-bold"
            }
        >
            {mins}m
        </span>
    );
}

interface TablesGridProps {
    tables: Array<{ id: string; name: string }>;
    orders: Order[];
    selectedOrderId: string | null;
    waitingPaymentTableNos: Set<string>;
    currencySymbol: string;
    activeViewTab: "tables" | "takeaways";
    setActiveViewTab: (tab: "tables" | "takeaways") => void;
    onSelectOrder: (orderId: string) => void;
    onOpenManualModal: (orderType: string) => void;
}

export const TablesGrid: React.FC<TablesGridProps> = ({
    tables,
    orders,
    selectedOrderId,
    waitingPaymentTableNos,
    currencySymbol,
    activeViewTab,
    setActiveViewTab,
    onSelectOrder,
    onOpenManualModal,
}) => {
    const activeTakeaways = orders.filter(
        (o) =>
            (o.order_type === "takeaway" || o.order_type === "delivery") &&
            o.status?.toLowerCase() !== "completed"
    );

    const hasReadyTakeaways = activeTakeaways.some(
        (o) => o.status?.toLowerCase() === "ready"
    );

    const activeDineInCount = tables.filter((t) =>
        orders.some(
            (o) =>
                String(o.table_no) === String(t.id) &&
                (!o.order_type || o.order_type === "dine-in") &&
                o.status?.toLowerCase() !== "completed"
        )
    ).length;

    return (
        <div className="col-span-12 lg:col-span-4 xl:col-span-4 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xs overflow-hidden h-full">
            {/* Header Tabs */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 gap-1.5">
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setActiveViewTab("tables")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${activeViewTab === "tables"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Tables ({activeDineInCount}/{tables.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveViewTab("takeaways")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeViewTab === "takeaways"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : hasReadyTakeaways
                                ? "bg-emerald-500 text-white animate-pulse shadow-md"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <span>Pickups</span>
                        {activeTakeaways.length > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                                {activeTakeaways.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Action Shortcuts */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onOpenManualModal("takeaway")}
                        className="text-[11px] font-black text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-1 rounded-xl transition-all cursor-pointer shrink-0"
                        title="Shortcut: Press F9"
                    >
                        + Takeaway <span className="hidden sm:inline text-[9px] opacity-70">F9</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenManualModal("delivery")}
                        className="text-[11px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-xl transition-all cursor-pointer shrink-0"
                        title="Shortcut: Press F10"
                    >
                        + Delivery <span className="hidden sm:inline text-[9px] opacity-70">F10</span>
                    </button>
                </div>
            </div>

            {/* Grid Content -     ,     Compact Grid     */}
            {activeViewTab === "tables" ? (
                <div className="flex-1 p-2 bg-slate-100/60 overflow-y-auto no-scrollbar flex flex-col justify-between">
                    <div className="grid grid-cols-2 sm:grid-cols-3 min-[1024px]:grid-cols-3 gap-1.5 h-full min-[1024px]:auto-rows-fr">
                        {tables.map((tableObj) => {
                            const tableNo = String(tableObj.id);
                            const activeOrder = orders.find(
                                (o) =>
                                    String(o.table_no) === tableNo &&
                                    (!o.order_type || o.order_type === "dine-in") &&
                                    o.status?.toLowerCase() !== "completed"
                            );

                            // Active / Bill Printed / Ready  
                            if (activeOrder) {
                                const isSelected = selectedOrderId === activeOrder.id;
                                const isReady = activeOrder.status?.toLowerCase() === "ready";

                                const isWaitingPayment =
                                    waitingPaymentTableNos.has(tableNo) ||
                                    (activeOrder as any).is_bill_printed === true ||
                                    String(activeOrder.status || "").toLowerCase() === "waiting_payment";

                                return (
                                    <button
                                        key={tableNo}
                                        type="button"
                                        onClick={() => onSelectOrder(activeOrder.id)}
                                        className={`w-full h-full rounded-2xl p-2 flex flex-col justify-between items-center text-center cursor-pointer transition-all active:scale-95 min-h-[66px] border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${isWaitingPayment
                                            ? `bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md shadow-purple-500/20 ${isSelected ? "scale-[1.03] ring-2 ring-purple-300 z-10" : ""
                                            }`
                                            : isReady
                                                ? `bg-[#10b981] hover:bg-[#059669] text-white shadow-md shadow-emerald-500/20 ${isSelected ? "scale-[1.03] ring-2 ring-emerald-300 z-10" : ""
                                                }`
                                                : `bg-[#f97316] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/20 ${isSelected ? "scale-[1.03] ring-2 ring-orange-300 z-10" : ""
                                                }`
                                            }`}
                                    >
                                        {/* Table No & Status Dot */}
                                        <div className="w-full flex items-center justify-center relative pt-0.5">
                                            <span className="font-black text-sm tracking-tight leading-none text-white drop-shadow-xs">
                                                T{tableNo}
                                            </span>
                                            <span className="absolute right-1 w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-xs" />
                                        </div>

                                        {/* Status Text (BILL PRINTED / READY / ACTIVE) */}
                                        <span className="text-[10px] font-black uppercase tracking-wider leading-none text-white/90 drop-shadow-xs">
                                            {isWaitingPayment
                                                ? "Bill Printed"
                                                : isReady
                                                    ? "Ready"
                                                    : "Active"}
                                        </span>

                                        {/* Amount */}
                                        <span className="text-[11px] font-black leading-none pb-0.5 truncate w-full text-white drop-shadow-xs">
                                            {currencySymbol}{" "}
                                            {Number(activeOrder.total_amount || 0).toLocaleString()}
                                        </span>
                                    </button>
                                );
                            }

                            //  (FREE)  - Border  ,     
                            return (
                                <button
                                    key={tableNo}
                                    type="button"
                                    onClick={() => onOpenManualModal(`dine-in-${tableNo}`)}
                                    className="w-full h-full rounded-2xl p-2 flex flex-col justify-between items-center text-center cursor-pointer transition-all active:scale-95 border border-slate-300/80 bg-white hover:border-orange-400 hover:bg-orange-50/30 shadow-2xs group min-h-[66px] outline-none focus:outline-none focus:ring-0"
                                >
                                    <span className="font-black text-sm text-slate-800 group-hover:text-orange-600 tracking-tight leading-none pt-0.5">
                                        T{tableNo}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 uppercase tracking-wider leading-none">
                                        Free
                                    </span>
                                    <span className="text-[11px] font-bold text-orange-500 group-hover:text-orange-600 leading-none pb-0.5">
                                        + Open
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar bg-slate-50/40">
                    {activeTakeaways.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                            <ShoppingBag className="w-10 h-10 opacity-20 mb-2" />
                            <p className="font-bold text-xs">No active pickups</p>
                            <p className="text-[10px] text-slate-400">
                                Tap &quot;+ Takeaway (F9)&quot; above to create one
                            </p>
                        </div>
                    ) : (
                        activeTakeaways.map((order) => {
                            const isSelected = selectedOrderId === order.id;
                            const isReady = order.status?.toLowerCase() === "ready";

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => onSelectOrder(order.id)}
                                    className={`p-3 rounded-2xl border transition-all flex justify-between items-center cursor-pointer outline-none focus:outline-none ${isSelected
                                        ? "border-orange-500 bg-orange-50/90 shadow-sm scale-[1.01]"
                                        : isReady
                                            ? "border-emerald-300 bg-emerald-50/80 shadow-2xs"
                                            : "border-slate-200 bg-white hover:border-orange-300 shadow-2xs"
                                        }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span
                                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${isReady
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {order.order_type === "delivery" ? "Delivery" : "Takeaway"}
                                            </span>
                                            <span className="text-xs font-black text-slate-900">
                                                #{order.id.slice(0, 5).toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 truncate">
                                            {order.customer_name || "Walk-in Customer"}
                                        </p>
                                        {isReady && (
                                            <span className="inline-block mt-1 text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md animate-pulse">
                                                ⭐ READY FOR PICKUP
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-black text-orange-600 block">
                                            {currencySymbol} {Number(order.total_amount || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                            <ElapsedTime startTime={order.created_at} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};