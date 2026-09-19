"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, DollarSign, CreditCard, Sparkles, ArrowRightLeft, AlertCircle } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    currencySymbol?: string;
    orderType?: string;
    onConfirmPayment: (method: string, tendered?: string, change?: number) => void;
    isSubmitting?: boolean;
    initialMethod?: string;
}

export default function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    currencySymbol = "LKR",
    orderType = "dine-in",
    onConfirmPayment,
    isSubmitting = false,
    initialMethod = "Cash",
}: PaymentModalProps) {
    const [activeTab, setActiveTab] = useState<"Cash" | "Split">(() => {
        return initialMethod === "Split" ? "Split" : "Cash";
    });
    const [cashTendered, setCashTendered] = useState<string>("");
    const [validationError, setValidationError] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialMethod === "Split" ? "Split" : "Cash");
            setCashTendered("");
            setValidationError("");
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialMethod]);

    if (!isOpen) return null;

    const due = Number(totalAmount || 0);
    const tenderedNum = Number(cashTendered) || 0;

    const changeDue = Math.max(0, tenderedNum - due);
    const splitCardAmount = Math.max(0, due - tenderedNum);

    const handlePresetClick = (amount: number) => {
        setCashTendered(amount.toString());
        setValidationError("");
    };

    const nearest500 = Math.ceil(due / 500) * 500;
    const nearest1000 = Math.ceil(due / 1000) * 1000;
    const nearest5000 = Math.ceil(due / 5000) * 5000;

    const handleConfirm = () => {
        if (isSubmitting) return;

        if (activeTab === "Cash") {
            const finalTendered = cashTendered.trim() === "" ? due : tenderedNum;
            if (finalTendered < due) {
                setValidationError(`Insufficient amount! Minimum due is ${currencySymbol} ${due.toLocaleString()}`);
                return;
            }
            const change = finalTendered > due ? finalTendered - due : 0;
            onConfirmPayment("Cash", finalTendered.toString(), change);
        } else {
            if (cashTendered.trim() === "") {
                setValidationError("Please enter cash portion amount.");
                return;
            }
            if (tenderedNum <= 0) {
                setValidationError("Cash portion must be greater than zero.");
                return;
            }
            if (tenderedNum >= due) {
                setValidationError(`Cash portion must be less than total due (${currencySymbol} ${due.toLocaleString()}). Use Cash payment.`);
                return;
            }

            const cashPortion = tenderedNum;
            const cardPortion = due - cashPortion;
            const splitNote = `Cash: ${cashPortion} | Card: ${cardPortion}`;
            onConfirmPayment("Split", splitNote, 0);
        }
    };

    const isCash = activeTab === "Cash";

    return (
        <div
            className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* Border    Glassmorphic Modal Frame  */}
            <div
                className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.3)] max-w-[340px] w-full overflow-hidden animate-in zoom-in-95 duration-150 relative border-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div
                    className={`px-6 py-4.5 flex justify-between items-center text-white transition-colors duration-200 ${isCash
                        ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600"
                        : "bg-[#7c3aed]"
                        }`}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-xs">
                            {isCash ? <DollarSign className="w-5 h-5 stroke-[2.5]" /> : <CreditCard className="w-5 h-5 stroke-[2.5]" />}
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight leading-tight">
                                {isCash ? "Cash Payment" : "Split Payment"}
                            </h2>
                            <p className="text-[11px] font-bold text-white/85 capitalize">
                                {orderType.replace("-", " ")} Order
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 border-none outline-none"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-3.5">
                    {/* Amount Due Card - Glassy & Clean */}
                    <div className="bg-slate-100/70 backdrop-blur-md rounded-2xl py-3 px-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                            Amount Due
                        </span>
                        <div className="flex items-center justify-center gap-1.5 text-slate-900 tracking-tight">
                            <span className="text-sm font-black text-slate-500 font-mono">
                                {currencySymbol}
                            </span>
                            <span className="text-3xl font-black font-mono leading-none">
                                {due.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Amount Received Input Box */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 px-1 block">
                            {isCash ? "Cash Received" : "Cash Amount Received"}
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 font-black text-xs text-slate-500 pointer-events-none select-none">
                                {currencySymbol}
                            </span>
                            <input
                                ref={inputRef}
                                type="number"
                                min="0"
                                step="any"
                                value={cashTendered}
                                onChange={(e) => {
                                    setCashTendered(e.target.value);
                                    setValidationError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleConfirm();
                                    }
                                }}
                                placeholder="0.00"
                                className={`w-full bg-slate-50/90 backdrop-blur-md rounded-2xl py-3 pl-14 pr-4 font-black text-lg text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium border-2 ${isCash
                                    ? "border-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                                    : "border-purple-500/20 focus:border-[#7c3aed] focus:bg-white"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Validation Error Message Box */}
                    {validationError && (
                        <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold animate-in fade-in duration-150">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Split Remaining Card */}
                    {!isCash && (
                        <div className="bg-purple-50/80 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#7c3aed]" />
                                <span className="text-xs font-bold text-slate-800">Card Portion:</span>
                            </div>
                            <span className="text-sm font-black font-mono text-[#7c3aed]">
                                {currencySymbol} {splitCardAmount.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Cash Change Due Box */}
                    {isCash && tenderedNum > due && (
                        <div className="bg-emerald-50/90 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center animate-in fade-in duration-150">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-black text-slate-800">Change Due:</span>
                            </div>
                            <span className="text-base font-black font-mono text-emerald-600">
                                {currencySymbol} {changeDue.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Quick Preset Buttons (Cash Tab Only) */}
                    {isCash && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handlePresetClick(due)}
                                className="py-2.5 px-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-xs font-black transition-all active:scale-95 cursor-pointer outline-none border-none"
                            >
                                Exact ({due.toLocaleString()})
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetClick(nearest500 > due ? nearest500 : due + 500)}
                                className="py-2.5 px-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-xs font-black transition-all active:scale-95 cursor-pointer outline-none border-none"
                            >
                                Nearest 500
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetClick(nearest1000 > due ? nearest1000 : 1000)}
                                className="py-2.5 px-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-xs font-black transition-all active:scale-95 cursor-pointer outline-none border-none"
                            >
                                {nearest1000 > due ? nearest1000.toLocaleString() : "1,000"}
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetClick(nearest5000 > due ? nearest5000 : 5000)}
                                className="py-2.5 px-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-xs font-black transition-all active:scale-95 cursor-pointer outline-none border-none"
                            >
                                {nearest5000 > due ? nearest5000.toLocaleString() : "5,000"}
                            </button>
                        </div>
                    )}

                    {/* Confirm Button -     overflow clip   */}
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirm}
                        className={`w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition-all active:scale-98 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 border-none outline-none overflow-hidden relative ${isCash
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/25"
                            : "bg-[#7c3aed] hover:bg-[#6d28d9] shadow-lg shadow-purple-500/25"
                            }`}
                    >
                        {isSubmitting ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3] shrink-0" />
                                <span className="truncate">
                                    {isCash
                                        ? "Confirm & Open Drawer (Enter)"
                                        : "Confirm Split & Open Drawer (Enter)"}
                                </span>
                            </>
                        )}
                    </button>

                    {/* Switch Tab Link */}
                    <div className="text-center pt-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                const nextTab = isCash ? "Split" : "Cash";
                                setActiveTab(nextTab);
                                setCashTendered("");
                                setValidationError("");
                                setTimeout(() => inputRef.current?.focus(), 40);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border-none outline-none bg-transparent"
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>{isCash ? "Split Payment" : "Pay with Cash"}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}