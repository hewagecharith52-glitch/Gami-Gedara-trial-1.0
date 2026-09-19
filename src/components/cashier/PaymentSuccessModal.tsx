"use client";

import React, { useEffect } from "react";
import { Check, X } from "lucide-react";

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    details: {
        orderId?: string;
        tableNo?: string;
        totalAmount: number;
        paymentMethod: string;
        orderType?: string;
        change?: number;
    } | null;
    currencySymbol?: string;
}

export function PaymentSuccessModal({
    isOpen,
    onClose,
    details,
    currencySymbol = "LKR",
}: PaymentSuccessModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !details) return null;

    const isTakeaway = details.orderType === "takeaway";
    const isDelivery = details.orderType === "delivery";

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* Frosted Glass Main Card */}
            <div
                className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 shadow-[0_25px_70px_rgba(0,0,0,0.18)] max-w-[330px] w-full p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200 relative flex flex-col items-center overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Soft Ambient Radial Glow Behind Icon */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

                {/* Top Right Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer outline-none border-none"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Animated Smooth Scalloped Badge */}
                <div className="relative my-2 flex items-center justify-center">
                    {/* Subtle Outer Pulsing Wave */}
                    <div className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-ping duration-1000" />

                    <div className="relative w-16 h-16 flex items-center justify-center text-[#00c853] animate-in zoom-in-75 duration-300">
                        <svg
                            viewBox="0 0 48 48"
                            fill="none"
                            className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,200,83,0.3)]"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M24 2.5C26.3 2.5 28.2 4.1 30.4 4.8C32.6 5.5 35.1 5.3 37 6.6C38.8 7.9 39.6 10.3 41 12C42.3 13.7 44.3 15.2 44.8 17.4C45.3 19.6 44.5 21.9 44.5 24.1C44.5 26.3 45.3 28.6 44.8 30.8C44.3 33 42.3 34.5 41 36.2C39.6 37.9 38.8 40.3 37 41.6C35.1 42.9 32.6 42.7 30.4 43.4C28.2 44.1 26.3 45.7 24 45.7C21.7 45.7 19.8 44.1 17.6 43.4C15.4 42.7 12.9 42.9 11 41.6C9.2 40.3 8.4 37.9 7 36.2C5.7 34.5 3.7 33 3.2 30.8C2.7 28.6 3.5 26.3 3.5 24.1C3.5 21.9 2.7 19.6 3.2 17.4C3.7 15.2 5.7 13.7 7 12C8.4 10.3 9.2 7.9 11 6.6C12.9 5.3 15.4 5.5 17.6 4.8C19.8 4.1 21.7 2.5 24 2.5Z"
                                fill="currentColor"
                            />
                        </svg>
                        <Check className="absolute w-8 h-8 text-white stroke-[3.5] animate-in zoom-in-50 duration-500" />
                    </div>
                </div>

                {/* Heading and Subtitle */}
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2 leading-snug">
                    Your payment made<br />successfully!
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-[240px]">
                    Funds were transferred successfully and confirmed instantly.
                </p>

                {/* Translucent Glass Receipt Card */}
                <div className="w-full bg-white/65 backdrop-blur-md border border-white/90 rounded-2xl p-4 my-4 space-y-2 text-left shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Order Type</span>
                        <span className="font-bold text-slate-800">
                            {isTakeaway
                                ? "🛍️ Takeaway"
                                : isDelivery
                                    ? "🛵 Delivery"
                                    : `Table ${details.tableNo || "1"}`}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Payment Method</span>
                        <span className="font-bold text-slate-800">{details.paymentMethod}</span>
                    </div>

                    <div className="h-px bg-slate-200/50 my-1" />

                    <div className="flex justify-between items-baseline pt-0.5">
                        <span className="text-slate-500 font-medium text-xs">Amount Paid</span>
                        <span className="text-lg font-black font-mono text-slate-900">
                            {currencySymbol} {Number(details.totalAmount).toLocaleString()}
                        </span>
                    </div>

                    {details.change !== undefined && details.change > 0 && (
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-slate-200 text-emerald-600">
                            <span className="font-medium">Change Returned</span>
                            <span className="font-black font-mono">
                                {currencySymbol} {Number(details.change).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Done Action Button without Black Outline/Border */}
                <button
                    type="button"
                    autoFocus
                    onClick={onClose}
                    className="w-full py-3.5 rounded-2xl bg-[#00c853] hover:bg-[#00b248] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0"
                >
                    Done (Enter)
                </button>
            </div>
        </div>
    );
}