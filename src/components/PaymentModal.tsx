"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, ArrowLeft, CreditCard, Banknote, Split } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    currencySymbol: string;
    orderType?: string;
    onConfirmPayment: (method: string, tendered?: string, change?: number) => Promise<void>;
    isSubmitting: boolean;
    initialMethod?: string;
}

export default function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    currencySymbol,
    orderType = "dine-in",
    onConfirmPayment,
    isSubmitting,
    initialMethod = "Cash",
}: PaymentModalProps) {
    const [activeTab, setActiveTab] = useState<string>(initialMethod);
    const [cashTendered, setCashTendered] = useState<string>("");
    const [splitCash, setSplitCash] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setActiveTab(initialMethod);
        setCashTendered("");
        setSplitCash("");
    }, [initialMethod, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    const tenderedNumber = Number(cashTendered) || 0;
    const changeToReturn = Math.max(0, tenderedNumber - totalAmount);
    const remainingDue = Math.max(0, totalAmount - tenderedNumber);

    const splitCashNumber = Number(splitCash) || 0;
    const splitCardAmount = Math.max(0, totalAmount - splitCashNumber);

    const handleCashSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        const finalTendered = tenderedNumber > 0 ? String(tenderedNumber) : String(totalAmount);
        onConfirmPayment("Cash", finalTendered, changeToReturn);
    };

    const handleSplitSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || splitCashNumber <= 0) return;
        onConfirmPayment("Split", String(splitCashNumber), 0);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 no-print animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200/90 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            {activeTab === "Cash" ? "Cash Payment" : activeTab === "Split" ? "Split Payment" : "Card Payment"}
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 capitalize mt-1.5">
                            {orderType} Order
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Amount Due Banner */}
                    <div className="text-center py-2 bg-slate-50/60 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                            Amount Due
                        </span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            {currencySymbol} {totalAmount.toLocaleString()}
                        </span>
                    </div>

                    {/* CASH VIEW */}
                    {activeTab === "Cash" && (
                        <form onSubmit={handleCashSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Cash Received
                                </label>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    placeholder="Enter amount"
                                    value={cashTendered}
                                    onChange={(e) => setCashTendered(e.target.value)}
                                    className="w-full bg-white border-2 border-orange-500 rounded-2xl py-3 px-4 text-center font-black text-xl text-slate-900 placeholder:text-slate-300 outline-none shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                                />
                            </div>

                            {/* Quick Amount Suggestion Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCashTendered(String(totalAmount))}
                                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    Exact ({totalAmount.toLocaleString()})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashTendered(String(Math.ceil(totalAmount / 500) * 500))}
                                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    Nearest 500
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashTendered("1000")}
                                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    1,000
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashTendered("5000")}
                                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    5,000
                                </button>
                            </div>

                            {/* Change / Remaining Alert Box */}
                            {changeToReturn > 0 ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 block">Change to Return</span>
                                    <span className="text-xl font-black text-emerald-700">
                                        {currencySymbol} {changeToReturn.toLocaleString()}
                                    </span>
                                </div>
                            ) : remainingDue > 0 && tenderedNumber > 0 ? (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                                    <span className="text-[10px] font-black uppercase text-rose-500 block">Remaining Due</span>
                                    <span className="text-xl font-black text-rose-600">
                                        {currencySymbol} {remainingDue.toLocaleString()}
                                    </span>
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? "Processing..." : "Confirm & Open Drawer (Enter)"}
                            </button>
                        </form>
                    )}

                    {/* SPLIT VIEW */}
                    {activeTab === "Split" && (
                        <form onSubmit={handleSplitSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Cash Amount Received
                                </label>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    placeholder="Enter amount in Cash"
                                    value={splitCash}
                                    onChange={(e) => setSplitCash(e.target.value)}
                                    className="w-full bg-white border-2 border-orange-500 rounded-2xl py-3 px-4 text-center font-black text-xl text-slate-900 placeholder:text-slate-300 outline-none shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                                />
                            </div>

                            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-700">Card Amount:</span>
                                <span className="text-lg font-black text-indigo-900">
                                    {currencySymbol} {splitCardAmount.toLocaleString()}
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || splitCashNumber <= 0}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? "Processing..." : "Confirm Split & Open Drawer (Enter)"}
                            </button>
                        </form>
                    )}

                    {/* Switch Payment Method Links */}
                    <div className="pt-2 flex justify-center gap-4 text-xs font-bold text-slate-400">
                        {activeTab !== "Cash" && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("Cash")}
                                className="hover:text-slate-700 cursor-pointer flex items-center gap-1"
                            >
                                <Banknote className="w-3.5 h-3.5" /> Pay with Cash
                            </button>
                        )}
                        {activeTab !== "Split" && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("Split")}
                                className="hover:text-slate-700 cursor-pointer flex items-center gap-1"
                            >
                                <Split className="w-3.5 h-3.5" /> Split Payment
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}