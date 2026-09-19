"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { X, ShieldAlert, AlertTriangle, Delete, KeyRound, Loader2 } from "lucide-react";

interface VoidPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemName?: string;
}

export function VoidPinModal({ isOpen, onClose, onSuccess, itemName }: VoidPinModalProps) {
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockTimer, setLockTimer] = useState(0);
    const [targetPinLength, setTargetPinLength] = useState<number>(4);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Check persistent lockout status via localStorage
    useEffect(() => {
        const savedAttempts = localStorage.getItem("cashier_void_failed_attempts");
        if (savedAttempts) setAttempts(parseInt(savedAttempts, 10));

        const checkLock = () => {
            const lockUntil = localStorage.getItem("cashier_void_locked_until");
            if (lockUntil) {
                const remaining = Math.ceil((parseInt(lockUntil, 10) - Date.now()) / 1000);
                if (remaining > 0) {
                    setLockTimer(remaining);
                } else {
                    localStorage.removeItem("cashier_void_locked_until");
                    setLockTimer(0);
                }
            }
        };

        checkLock();
        const timer = setInterval(checkLock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch configured PIN length dynamically from database on open
    useEffect(() => {
        if (isOpen) {
            setPinInput("");
            setPinError("");

            const fetchPinLength = async () => {
                try {
                    const { data } = await supabase
                        .from("restaurant_settings")
                        .select("void_pin")
                        .limit(1)
                        .maybeSingle();

                    if (data?.void_pin) {
                        const cleanPin = String(data.void_pin).trim();
                        setTargetPinLength(cleanPin.length || 4);
                    }
                } catch {
                    setTargetPinLength(4);
                }
            };

            fetchPinLength();
            setTimeout(() => hiddenInputRef.current?.focus(), 60);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleVerifyPin = async (enteredPin: string) => {
        if (!enteredPin || lockTimer > 0 || isVerifying) return;
        setIsVerifying(true);
        setPinError("");

        try {
            const { data, error } = await supabase
                .from("restaurant_settings")
                .select("void_pin")
                .limit(1)
                .maybeSingle();

            if (error || !data?.void_pin) {
                setPinError("Settings error: Void PIN not found.");
                setIsVerifying(false);
                return;
            }

            const dbVoidPin = String(data.void_pin).trim();
            setTargetPinLength(dbVoidPin.length);

            if (enteredPin.trim() !== dbVoidPin) {
                const nextAttempts = attempts + 1;
                setAttempts(nextAttempts);
                localStorage.setItem("cashier_void_failed_attempts", nextAttempts.toString());
                setPinInput("");

                if (nextAttempts === 3) {
                    const lockTime = Date.now() + 120000;
                    localStorage.setItem("cashier_void_locked_until", lockTime.toString());
                    setLockTimer(120);
                    setPinError("3 failed attempts! Locked for 2 minutes.");
                } else if (nextAttempts >= 6) {
                    const lockTime = Date.now() + 1800000;
                    localStorage.setItem("cashier_void_locked_until", lockTime.toString());
                    setLockTimer(1800);
                    setPinError("Security lockout: Locked for 30 minutes.");
                } else {
                    const left = nextAttempts < 3 ? 3 - nextAttempts : 6 - nextAttempts;
                    setPinError(`Incorrect PIN (${left} attempts remaining)`);
                }
                setIsVerifying(false);
                return;
            }

            setAttempts(0);
            localStorage.removeItem("cashier_void_failed_attempts");
            localStorage.removeItem("cashier_void_locked_until");
            setPinInput("");
            onSuccess();
        } catch (err: any) {
            setPinError(err.message || "Verification failed");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleKeyClick = (digit: string) => {
        if (lockTimer > 0 || isVerifying) return;
        if (pinInput.length < targetPinLength) {
            const next = pinInput + digit;
            setPinInput(next);
            setPinError("");
            if (next.length === targetPinLength) {
                handleVerifyPin(next);
            }
        }
    };

    const handleBackspace = () => {
        if (lockTimer > 0 || isVerifying) return;
        setPinInput((prev) => prev.slice(0, -1));
        setPinError("");
    };

    return (
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* High-Contrast Frosted Glass Card */}
            <div
                className="bg-white/95 backdrop-blur-2xl border border-white shadow-[0_25px_80px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-6 sm:p-7 max-w-[340px] w-full animate-in zoom-in-95 duration-150 flex flex-col items-center relative overflow-hidden text-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Soft Ambient Radial Glow */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />

                {/* Hidden Input for Hardware Keyboard */}
                <input
                    ref={hiddenInputRef}
                    type="password"
                    maxLength={targetPinLength}
                    value={pinInput}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= targetPinLength) {
                            setPinInput(val);
                            if (val.length === targetPinLength) handleVerifyPin(val);
                        }
                    }}
                    className="opacity-0 absolute pointer-events-none w-0 h-0"
                    autoFocus
                />

                {/* Top Header */}
                <div className="w-full flex items-center justify-between mb-3 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-xs">
                            <KeyRound className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            POS Security
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border-none outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Title & Description */}
                <div className="text-center mb-3 z-10">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                        Void Authorization
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 truncate max-w-[260px]">
                        {itemName ? `Remove: ${itemName}` : "Enter Manager PIN to void item"}
                    </p>
                </div>

                {lockTimer > 0 ? (
                    /* Lockout Screen */
                    <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center my-4 animate-in fade-in z-10">
                        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2 animate-bounce" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Terminal Locked</p>
                        <p className="text-3xl font-black font-mono text-rose-600 my-1">
                            {Math.floor(lockTimer / 60).toString().padStart(2, "0")}:{(lockTimer % 60).toString().padStart(2, "0")}
                        </p>
                        <p className="text-[10px] font-bold text-rose-500">Security lockout active. Please wait.</p>
                    </div>
                ) : (
                    <>
                        {/* PIN Dots Indicator */}
                        <div
                            className="flex items-center justify-center gap-3.5 my-2.5 cursor-pointer py-1.5 z-10"
                            onClick={() => hiddenInputRef.current?.focus()}
                        >
                            {Array.from({ length: targetPinLength }).map((_, idx) => {
                                const isFilled = pinInput.length > idx;
                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-full transition-all duration-200 ${targetPinLength > 4 ? "w-3.5 h-3.5" : "w-4 h-4"
                                            } ${isFilled
                                                ? "bg-orange-500 scale-125 shadow-[0_4px_12px_rgba(249,115,22,0.5)]"
                                                : "bg-slate-100 border-2 border-slate-300"
                                            }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Status / Error Message */}
                        <div className="h-5 flex items-center justify-center mb-3 z-10">
                            {isVerifying ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 animate-in fade-in">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Verifying PIN...</span>
                                </div>
                            ) : pinError ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-in fade-in">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{pinError}</span>
                                </div>
                            ) : (
                                <span className="text-[11px] font-bold text-slate-400">
                                    {targetPinLength}-digit passcode required
                                </span>
                            )}
                        </div>

                        {/* Crisp Tactile Glass Numpad */}
                        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[270px] z-10">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                                <button
                                    key={digit}
                                    type="button"
                                    disabled={isVerifying}
                                    onClick={() => handleKeyClick(digit)}
                                    className="h-12 rounded-2xl bg-slate-50/90 hover:bg-slate-100 active:bg-orange-500 active:text-white text-slate-900 text-lg font-black transition-all shadow-xs active:scale-95 flex items-center justify-center cursor-pointer border border-slate-200/80 outline-none disabled:opacity-50"
                                >
                                    {digit}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => setPinInput("")}
                                className="h-12 rounded-2xl bg-slate-50/70 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-500 text-xs font-black uppercase transition-all flex items-center justify-center cursor-pointer border border-slate-200/80 outline-none disabled:opacity-50"
                            >
                                C
                            </button>
                            <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => handleKeyClick("0")}
                                className="h-12 rounded-2xl bg-slate-50/90 hover:bg-slate-100 active:bg-orange-500 active:text-white text-slate-900 text-lg font-black transition-all shadow-xs active:scale-95 flex items-center justify-center cursor-pointer border border-slate-200/80 outline-none disabled:opacity-50"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                disabled={isVerifying}
                                onClick={handleBackspace}
                                className="h-12 rounded-2xl bg-slate-50/70 hover:bg-slate-100 active:scale-95 text-slate-700 text-sm font-black transition-all flex items-center justify-center cursor-pointer border border-slate-200/80 outline-none disabled:opacity-50"
                            >
                                <Delete className="w-5 h-5 stroke-[2.5]" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}