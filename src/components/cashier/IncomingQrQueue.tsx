"use client";

import React from "react";
import { BellRing, QrCode, Printer } from "lucide-react";
import { Order } from "./types";

interface IncomingQrQueueProps {
    incomingQrOrders: Order[];
    selectedOrderId: string | null;
    onReviewOrder: (order: Order) => void;
    onAcceptKot: (order: Order) => void;
}

export const IncomingQrQueue: React.FC<IncomingQrQueueProps> = ({
    incomingQrOrders,
    selectedOrderId,
    onReviewOrder,
    onAcceptKot,
}) => {
    return (
        <div className="flex flex-col w-full">
            {/* Header Bar */}
            <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                <div className="flex items-center gap-1.5">
                    <BellRing
                        className={`w-3.5 h-3.5 ${incomingQrOrders.length > 0
                            ? "text-orange-600 animate-bounce"
                            : "text-slate-400"
                            }`}
                    />
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        Incoming QR Orders ({incomingQrOrders.length})
                    </span>
                </div>
                {incomingQrOrders.length > 0 && (
                    <span className="text-[10px] font-bold text-orange-600">
                        Review or Print KOT
                    </span>
                )}
            </div>

            {/* Empty State */}
            {incomingQrOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-4 text-center">
                    <QrCode className="w-7 h-7 opacity-20 mb-1" />
                    <p className="font-bold text-[11px]">No pending QR orders</p>
                    <p className="text-[9px] text-slate-400">
                        Customer table scans will appear here
                    </p>
                </div>
            ) : (
                /* Order Cards List */
                <div className="space-y-2 overflow-y-auto pr-1 no-scrollbar">
                    {incomingQrOrders.map((qrOrd) => {
                        const isBeingViewed = selectedOrderId === qrOrd.id;
                        const items = qrOrd.items || [];
                        const hasUnprintedItems = items.some(
                            (i) => i.kot_printed === false || i.kot_printed === undefined
                        );
                        //  KOT         Add-on QR   
                        const isAddOnTicket =
                            items.some((i) => i.kot_printed === true) && hasUnprintedItems;

                        return (
                            <div
                                key={qrOrd.id}
                                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-2xs relative overflow-hidden ${isAddOnTicket
                                    ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30"
                                    : isBeingViewed
                                        ? "bg-white border-orange-500 ring-2 ring-orange-500/20"
                                        : "bg-white hover:bg-slate-50 border-slate-200/90"
                                    }`}
                            >
                                <div
                                    className={`absolute left-0 inset-y-0 w-1.5 ${isAddOnTicket
                                        ? "bg-amber-500 animate-pulse"
                                        : "bg-orange-500"
                                        } rounded-l-2xl`}
                                />

                                <div className="min-w-0 flex-1 pl-1.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span
                                            className={`font-black text-xs px-2 py-0.5 rounded-md ${isAddOnTicket
                                                ? "bg-amber-500 text-white animate-pulse"
                                                : "bg-slate-900 text-white"
                                                }`}
                                        >
                                            {isAddOnTicket
                                                ? `🔥 ADD-ON: T${qrOrd.table_no}`
                                                : qrOrd.order_type === "takeaway"
                                                    ? "🛍️ Takeaway"
                                                    : `Table T${qrOrd.table_no}`}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-slate-400">
                                            #{qrOrd.id.slice(0, 5).toUpperCase()}
                                        </span>
                                        {qrOrd.status === "reviewing" && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                                Reviewing
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-700 truncate font-bold">
                                        {items
                                            .filter((it) =>
                                                isAddOnTicket
                                                    ? it.kot_printed === false || it.kot_printed === undefined
                                                    : true
                                            )
                                            .map(
                                                (it) =>
                                                    `${it.quantity}x ${it.name
                                                        .replace(/\(Regular\)/gi, "")
                                                        .replace(/\(Large\)/gi, "")
                                                        .trim()}`
                                            )
                                            .join(", ")}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onReviewOrder(qrOrd)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                                    >
                                        Review
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onAcceptKot(qrOrd)}
                                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Accept KOT</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};