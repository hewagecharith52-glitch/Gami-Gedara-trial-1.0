"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface PettyCashModalProps {
    isOpen: boolean;
    onClose: () => void;
    currencySymbol: string;
    onLogOutflow: (amount: number, reason: string, staffName: string) => Promise<void>;
    isSubmitting: boolean;
}

export const PettyCashModal: React.FC<PettyCashModalProps> = ({
    isOpen,
    onClose,
    currencySymbol,
    onLogOutflow,
    isSubmitting,
}) => {
    const [form, setForm] = useState({ amount: "", reason: "", receivedBy: "" });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900">Log Petty Cash / Outflow</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!form.amount || !form.reason || !form.receivedBy || isSubmitting) return;
                        await onLogOutflow(Number(form.amount), form.reason, form.receivedBy);
                        setForm({ amount: "", reason: "", receivedBy: "" });
                        onClose();
                    }}
                >
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Amount ({currencySymbol}) *</label>
                        <input
                            type="number"
                            value={form.amount}
                            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-900 text-sm outline-none focus:border-orange-500"
                            placeholder="e.g. 1500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Reason / Category *</label>
                        <input
                            type="text"
                            value={form.reason}
                            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-900 text-sm outline-none focus:border-orange-500"
                            placeholder="e.g. Grocery"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Received By / Paid To *</label>
                        <input
                            type="text"
                            value={form.receivedBy}
                            onChange={(e) => setForm((p) => ({ ...p, receivedBy: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-900 text-sm outline-none focus:border-orange-500"
                            placeholder="e.g. Kamal"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!form.amount || !form.reason || !form.receivedBy || isSubmitting}
                        className="w-full py-3 mt-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Logging..." : "Confirm Cash Outflow"}
                    </button>
                </form>
            </div>
        </div>
    );
};