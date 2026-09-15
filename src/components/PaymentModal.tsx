"use client";

import React, { useState } from "react";
import { X, CheckCircle, ArrowLeft } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    currencySymbol?: string;
    orderType?: string;
    onConfirmPayment: (
        method: string,
        tendered?: string,
        change?: number
    ) => void;
    isSubmitting?: boolean;
}

export default function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    currencySymbol = "LKR",
    orderType = "dine-in",
    onConfirmPayment,
    isSubmitting = false,
}: PaymentModalProps) {
    const [viewMode, setViewMode] = useState<"options" | "cash" | "split">("options");
    const [cashGiven, setCashGiven] = useState("");
    const [splitCashAmount, setSplitCashAmount] = useState("");

    if (!isOpen) return null;

    const handleReset = () => {
        setViewMode("options");
        setCashGiven("");
        setSplitCashAmount("");
    };

    const handleModalClose = () => {
        handleReset();
        onClose();
    };

    const isDineIn = !orderType || orderType.startsWith("dine-in");

    // Validation logic for Split Payment
    const splitCashNum = Number(splitCashAmount || 0);
    const isSplitCashExceeded = splitCashAmount !== "" && splitCashNum >= totalAmount;
    const isSplitInvalid = !splitCashAmount || isNaN(splitCashNum) || splitCashNum <= 0 || isSplitCashExceeded;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print"
            onKeyDown={(e) => {
                if (e.key === "Escape") handleModalClose();
            }}
        >
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.35s ease-in-out;
        }
      `}</style>

            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Select Payment</h2>
                        <p className="text-xs text-slate-500 font-medium">
                            {isDineIn ? "Dine-in Table" : orderType === "takeaway" ? "Takeaway Order" : "Delivery Order"}
                        </p>
                    </div>
                    <button
                        onClick={handleModalClose}
                        className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Amount Due Display */}
                    <div className="text-center mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Amount Due</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">
                            {currencySymbol} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* View 1: Main Options with original emojis and badges */}
                    {viewMode === "options" && (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setViewMode("cash")}
                                className="w-full py-4 px-4 bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 rounded-2xl flex items-center justify-between transition-all shadow-sm cursor-pointer active:scale-95 group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">💵</span>
                                    <span className="font-bold text-base text-slate-800 group-hover:text-orange-600">Cash Payment</span>
                                </div>
                                <span className="text-xs font-bold text-orange-600 bg-orange-100/70 px-2.5 py-1 rounded-lg">Auto Open</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onConfirmPayment("Card")}
                                disabled={isSubmitting}
                                className="w-full py-4 px-4 bg-white border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-2xl flex items-center justify-between transition-all shadow-sm cursor-pointer active:scale-95 group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">💳</span>
                                    <span className="font-bold text-base text-slate-800 group-hover:text-indigo-600">Card Payment</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100/70 px-2.5 py-1 rounded-lg">No Drawer</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode("split")}
                                className="w-full py-4 px-4 bg-slate-50 border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl flex items-center justify-between transition-all shadow-sm cursor-pointer active:scale-95 group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🍕</span>
                                    <span className="font-bold text-base text-slate-800 group-hover:text-emerald-700">Split (Cash + Card)</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">Custom</span>
                            </button>
                        </div>
                    )}

                    {/* View 2: Cash Calculator */}
                    {viewMode === "cash" && (
                        <form
                            className="space-y-4 animate-in fade-in duration-200"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const tendered = cashGiven ? Number(cashGiven) : totalAmount;
                                if (tendered < totalAmount) return;
                                const change = tendered - totalAmount;
                                onConfirmPayment("Cash", String(tendered), change);
                            }}
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    Cash Received
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={cashGiven}
                                    onChange={(e) => setCashGiven(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:border-orange-500 outline-none text-center text-xl shadow-inner"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCashGiven(String(totalAmount))}
                                    className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                    Exact ({Math.round(totalAmount).toLocaleString()})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashGiven(String(Math.ceil(totalAmount / 500) * 500))}
                                    className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                    Nearest 500
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashGiven("1000")}
                                    className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                    1,000
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashGiven("5000")}
                                    className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                    5,000
                                </button>
                            </div>

                            <div className="p-3 rounded-xl border border-slate-200">
                                {Number(cashGiven || 0) >= totalAmount ? (
                                    <div className="text-center text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5">Change to Return</span>
                                        <span className="font-black text-xl">
                                            {currencySymbol} {(Number(cashGiven) - totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 bg-slate-50 p-2 rounded-lg">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5">Remaining Due</span>
                                        <span className="font-bold text-lg text-slate-700">
                                            {currencySymbol} {(totalAmount - Number(cashGiven || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || (cashGiven !== "" && Number(cashGiven) < totalAmount)}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-base"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {isSubmitting ? "Processing..." : "Confirm & Open Drawer"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode("options")}
                                className="w-full py-1 text-slate-400 hover:text-slate-600 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Payment Methods
                            </button>
                        </form>
                    )}

                    {/* View 3: Split Payment with Red Shake on Exceeding Amount */}
                    {viewMode === "split" && (
                        <form
                            className="space-y-4 animate-in fade-in duration-200"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (isSplitInvalid || isSubmitting) return;
                                const card = Math.max(0, totalAmount - splitCashNum);
                                onConfirmPayment(`Split (Cash: ${splitCashNum}, Card: ${card})`, String(splitCashNum), 0);
                            }}
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    Cash Amount Received
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter amount in Cash"
                                    value={splitCashAmount}
                                    onChange={(e) => setSplitCashAmount(e.target.value)}
                                    className={`w-full rounded-xl p-3 font-black text-slate-900 outline-none text-center text-xl shadow-inner transition-all border-2 ${isSplitCashExceeded
                                            ? "border-rose-500 bg-rose-50/70 text-rose-700 animate-shake ring-4 ring-rose-500/20"
                                            : "border-slate-200 bg-slate-50 focus:border-orange-500 focus:bg-white"
                                        }`}
                                    autoFocus
                                />
                            </div>

                            {isSplitCashExceeded ? (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-600 animate-in slide-in-from-top-1">
                                    <p className="text-xs font-bold">⚠️ Cash amount cannot exceed total amount!</p>
                                    <p className="text-[10px] text-rose-500 mt-0.5 font-medium">Use Full Cash payment instead.</p>
                                </div>
                            ) : (
                                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center text-indigo-900">
                                    <span className="font-bold text-xs uppercase tracking-wider">Card Amount:</span>
                                    <span className="font-black text-lg text-indigo-700">
                                        {currencySymbol} {Math.max(0, totalAmount - splitCashNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSplitInvalid || isSubmitting}
                                className={`w-full py-4 font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-base ${isSplitInvalid
                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 cursor-pointer shadow-emerald-500/20"
                                    }`}
                            >
                                {isSubmitting ? "Processing..." : "Confirm Split & Open Drawer"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode("options")}
                                className="w-full py-1 text-slate-400 hover:text-slate-600 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Payment Methods
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}