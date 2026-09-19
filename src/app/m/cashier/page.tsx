"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    Receipt,
    Clock,
    CreditCard,
    Banknote,
    Printer,
    Plus,
    X,
    CheckCircle,
    ArrowLeft,
    ChevronRight,
    RefreshCw
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PaymentModal from "@/components/PaymentModal";
import { useSettings } from "@/context/SettingsContext";
import PrintReceipt from "@/components/PrintReceipt";
import { ManualOrderModal } from "@/components/cashier/ManualOrderModal";
import { Order, OrderItem, OrderStatus } from "@/components/cashier/types";

export default function MobileCashierPage() {
    const { settings, refreshSettings } = useSettings();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"tables" | "live" | "settle">("tables");

    // Tables State
    const [dbTables, setDbTables] = useState<any[]>([]);
    const [incomingQrOrders, setIncomingQrOrders] = useState<Order[]>([]);
    const [waitingPaymentTableNos, setWaitingPaymentTableNos] = useState<Set<string>>(new Set());

    // Payment & Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentModalMethod, setPaymentModalMethod] = useState<string>("Cash");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualModalType, setManualModalType] = useState("takeaway");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Discount State
    const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
    const [discountValue, setDiscountValue] = useState<number>(0);

    // Success & Print States
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const [lastSettledDetails, setLastSettledDetails] = useState<any>(null);
    const [printOrderData, setPrintOrderData] = useState<Order | null>(null);
    const [kotPrintData, setKotPrintData] = useState<Order | null>(null);
    const isPrintingRef = useRef(false);

    useEffect(() => {
        if (refreshSettings) refreshSettings();
    }, [refreshSettings]);

    useEffect(() => {
        const fetchRestaurantTables = async () => {
            const { data } = await supabase.from("restaurant_tables").select("*").order("created_at", { ascending: true });
            if (data && data.length > 0) {
                setDbTables(data.map((t: any) => ({ id: String(t.table_no), name: `T${t.table_no}` })));
            }
        };
        fetchRestaurantTables();
    }, []);

    const tables = useMemo(() => {
        if (dbTables.length > 0) return dbTables;
        return Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `T${i + 1}` }));
    }, [dbTables]);

    const fetchOrders = useCallback(async () => {
        const { data } = await supabase
            .from("orders")
            .select("*")
            .not("status", "in", '("completed","Completed")')
            .order("created_at", { ascending: false });

        if (data) {
            const fetched = data as Order[];
            setOrders(fetched);
            const pendingQr = fetched.filter((o) => {
                const s = String(o.status || "").toLowerCase();
                const m = String(o.payment_method || "").toLowerCase();
                return (s === "pending" || s === "reviewing") && m !== "cashier" && m !== "staff";
            });
            setIncomingQrOrders(pendingQr);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const channel = supabase
            .channel("mobile_cashier_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOrders]);

    const selectedOrder: Order | null = orders.find((o) => o.id === selectedOrderId) || null;
    const currencySymbol = settings?.currency || "LKR";
    const serviceChargePct = Number(settings?.service_charge_pct ?? 10);
    const taxPct = Number(settings?.tax_pct ?? 0);

    // Calculations
    const subtotal = useMemo(() => {
        if (!selectedOrder) return 0;
        return (selectedOrder.items || []).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    }, [selectedOrder]);

    const calculatedDiscount = useMemo(() => {
        if (!selectedOrder) return 0;
        if (discountType === "percent") return (subtotal * Number(discountValue || 0)) / 100;
        return Number(discountValue || 0);
    }, [selectedOrder, subtotal, discountType, discountValue]);

    const serviceCharge = useMemo(() => {
        if (!selectedOrder) return 0;
        const isDineIn = !selectedOrder.order_type || selectedOrder.order_type === "dine-in";
        return isDineIn ? (subtotal * serviceChargePct) / 100 : 0;
    }, [selectedOrder, subtotal, serviceChargePct]);

    const tax = useMemo(() => {
        if (!selectedOrder) return 0;
        return (subtotal * taxPct) / 100;
    }, [selectedOrder, subtotal, taxPct]);

    const grandTotal = useMemo(() => {
        return Math.max(0, subtotal + serviceCharge + tax - calculatedDiscount);
    }, [subtotal, serviceCharge, tax, calculatedDiscount]);

    // Safe Print Trigger
    const triggerSafePrint = useCallback((order: Order, isKot: boolean = false) => {
        if (typeof window === "undefined") return;
        if (isPrintingRef.current) return;
        isPrintingRef.current = true;

        if (isKot) {
            setKotPrintData(order);
            setPrintOrderData(null);
        } else {
            setPrintOrderData(order);
            setKotPrintData(null);
        }

        setTimeout(() => {
            window.print();
            isPrintingRef.current = false;
        }, 250);
    }, []);

    const handlePrintKOT = async (order: Order) => {
        const totalItems = order.items || [];
        const unprintedItems = totalItems.filter((i) => !i.kot_printed);
        const itemsToPrint = unprintedItems.length > 0 ? unprintedItems : totalItems;

        triggerSafePrint({ ...order, items: itemsToPrint }, true);

        const updatedItems = totalItems.map((i) => ({ ...i, kot_printed: true, prepared: false }));
        await supabase.from("orders").update({ status: "Preparing", payment_method: "Cashier", items: updatedItems, order_type: order.order_type || "dine-in" }).eq("id", order.id);
        fetchOrders();
    };

    const handleSettlePayment = async (method: string, tendered?: string, change?: number) => {
        if (!selectedOrder) return;
        setIsSubmitting(true);

        try {
            const isDineIn = !selectedOrder.order_type || selectedOrder.order_type === "dine-in";
            const updateData: any = {
                status: "completed",
                payment_method: method,
                total_amount: Number(grandTotal),
                discount: Number(calculatedDiscount),
            };

            await supabase.from("orders").update(updateData).eq("id", selectedOrder.id);

            if (!isDineIn) {
                triggerSafePrint({ ...selectedOrder, ...updateData, discount: calculatedDiscount, total_amount: grandTotal }, false);
            }

            setLastSettledDetails({
                tableNo: selectedOrder.table_no,
                totalAmount: grandTotal,
            });

            setShowPaymentSuccess(true);
            setSelectedOrderId(null);
            setIsPaymentModalOpen(false);
            setActiveTab("tables");
            fetchOrders();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans select-none">

                {/* Mobile App Header */}
                <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm">
                            POS
                        </span>
                        <div>
                            <h1 className="text-xs font-black tracking-tight leading-tight">Smart Mobile POS</h1>
                            <p className="text-[10px] text-slate-400 font-semibold">
                                {selectedOrder ? `Table ${selectedOrder.table_no}` : "Select Table"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setManualModalType("takeaway");
                                setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 font-black text-[11px] cursor-pointer"
                        >
                            + Takeaway
                        </button>
                        <button
                            onClick={fetchOrders}
                            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 active:rotate-180 transition-all"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </header>

                {/* Incoming QR Alert Banner */}
                {incomingQrOrders.length > 0 && (
                    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shrink-0 animate-pulse">
                        <span>🔥 {incomingQrOrders.length} New QR Order(s) waiting!</span>
                        <button
                            onClick={() => {
                                setSelectedOrderId(incomingQrOrders[0].id);
                                setActiveTab("live");
                            }}
                            className="bg-white text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black"
                        >
                            Review
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-3 pb-20">

                    {/* TAB 1: TABLES GRID */}
                    {activeTab === "tables" && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Restaurant Tables</span>
                                <span className="text-[11px] font-bold text-slate-500">
                                    {orders.filter(o => !o.order_type || o.order_type === "dine-in").length} Occupied
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                {tables.map((table) => {
                                    const activeTableOrder = orders.find(
                                        (o) => String(o.table_no) === String(table.id) && (!o.order_type || o.order_type === "dine-in")
                                    );
                                    const isOccupied = !!activeTableOrder;
                                    const isSelected = activeTableOrder && activeTableOrder.id === selectedOrderId;

                                    return (
                                        <button
                                            key={table.id}
                                            type="button"
                                            onClick={() => {
                                                if (activeTableOrder) {
                                                    setSelectedOrderId(activeTableOrder.id);
                                                    setActiveTab("live");
                                                } else {
                                                    setManualModalType(`dine-in-${table.id}`);
                                                    setIsModalOpen(true);
                                                }
                                            }}
                                            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${isSelected
                                                    ? "bg-orange-500 text-white border-orange-500 shadow-md scale-95"
                                                    : isOccupied
                                                        ? "bg-amber-50/80 border-amber-300 text-amber-900"
                                                        : "bg-white border-slate-200 text-slate-700 active:scale-95"
                                                }`}
                                        >
                                            <span className="text-sm font-black tracking-tight">{table.name}</span>
                                            <span className={`text-[10px] font-bold mt-1 ${isOccupied ? "text-amber-700" : "text-slate-400"}`}>
                                                {isOccupied ? `${currencySymbol} ${Number(activeTableOrder.total_amount || 0).toLocaleString()}` : "+ Open"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LIVE ORDERS VIEW */}
                    {activeTab === "live" && (
                        <div className="space-y-3">
                            {selectedOrder ? (
                                <>
                                    <div className="bg-white border border-slate-200 p-3 rounded-2xl flex justify-between items-center">
                                        <div>
                                            <span className="text-xs font-black text-slate-800">
                                                {selectedOrder.order_type === "takeaway" ? "🛍️ Takeaway" : `Table ${selectedOrder.table_no}`}
                                            </span>
                                            <p className="text-[10px] text-slate-400 font-mono">#{selectedOrder.id.slice(0, 5).toUpperCase()}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setManualModalType(selectedOrder.order_type === "dine-in" ? `dine-in-${selectedOrder.table_no}` : "takeaway");
                                                setIsModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Food
                                        </button>
                                    </div>

                                    {/* Food Items List */}
                                    <div className="space-y-2">
                                        {(selectedOrder.items || []).map((item: OrderItem, idx: number) => (
                                            <div key={idx} className="bg-white border border-slate-200 p-3 rounded-2xl flex justify-between items-center">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center shrink-0">
                                                        {item.quantity}x
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800 leading-tight">{item.name}</p>
                                                        <p className="text-[10px] font-semibold text-slate-400">
                                                            {currencySymbol} {Number(item.price).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-slate-900">
                                                    {currencySymbol} {(Number(item.price) * item.quantity).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handlePrintKOT(selectedOrder)}
                                            className="py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                                        >
                                            <Printer className="w-4 h-4 text-orange-500" />
                                            <span>Print KOT</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("settle")}
                                            className="py-3 bg-orange-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95"
                                        >
                                            <span>Proceed Settle</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    <Receipt className="w-10 h-10 mx-auto opacity-25 mb-2" />
                                    <p className="text-xs font-bold">No active table selected</p>
                                    <button
                                        onClick={() => setActiveTab("tables")}
                                        className="mt-3 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                                    >
                                        Go to Tables
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: SETTLEMENT VIEW */}
                    {activeTab === "settle" && (
                        <div className="space-y-3">
                            {selectedOrder ? (
                                <>
                                    {/* Bill Breakdown Card */}
                                    <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-2.5 shadow-2xs">
                                        <div className="flex justify-between text-xs font-bold text-slate-500">
                                            <span>Subtotal</span>
                                            <span>{currencySymbol} {subtotal.toLocaleString()}</span>
                                        </div>

                                        {serviceCharge > 0 && (
                                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                                <span>Service Charge ({serviceChargePct}%)</span>
                                                <span>{currencySymbol} {serviceCharge.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {calculatedDiscount > 0 && (
                                            <div className="flex justify-between text-xs font-bold text-rose-500">
                                                <span>Discount</span>
                                                <span>- {currencySymbol} {calculatedDiscount.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                                            <span className="text-xs font-black uppercase text-slate-400">Total Payable</span>
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                                {currencySymbol} {grandTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Buttons */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setPaymentModalMethod("Cash");
                                                setIsPaymentModalOpen(true);
                                            }}
                                            className="py-3.5 bg-emerald-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                                        >
                                            <Banknote className="w-4 h-4" /> Pay Cash
                                        </button>
                                        <button
                                            onClick={() => handleSettlePayment("Card")}
                                            className="py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                                        >
                                            <CreditCard className="w-4 h-4" /> Pay Card
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    <Receipt className="w-10 h-10 mx-auto opacity-25 mb-2" />
                                    <p className="text-xs font-bold">No order to settle</p>
                                    <button
                                        onClick={() => setActiveTab("tables")}
                                        className="mt-3 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                                    >
                                        Select a Table
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </main>

                {/* Floating Mobile Bottom Navigation Bar */}
                <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 flex items-center justify-around z-30 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setActiveTab("tables")}
                        className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${activeTab === "tables" ? "text-orange-600 font-black scale-105" : "text-slate-400 font-bold"
                            }`}
                    >
                        <span className="text-base leading-none">🪑</span>
                        <span className="text-[10px] tracking-wider uppercase">Tables</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("live")}
                        className={`relative flex flex-col items-center gap-1 transition-all cursor-pointer ${activeTab === "live" ? "text-orange-600 font-black scale-105" : "text-slate-400 font-bold"
                            }`}
                    >
                        <span className="text-base leading-none">🔥</span>
                        <span className="text-[10px] tracking-wider uppercase">Live</span>
                        {selectedOrder && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 absolute -top-0.5 right-1"></span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("settle")}
                        className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${activeTab === "settle" ? "text-orange-600 font-black scale-105" : "text-slate-400 font-bold"
                            }`}
                    >
                        <span className="text-base leading-none">💳</span>
                        <span className="text-[10px] tracking-wider uppercase">Settle</span>
                    </button>
                </nav>

                {/* Modular Modals */}
                {isModalOpen && (
                    <ManualOrderModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        tables={tables}
                        currencySymbol={currencySymbol}
                        serviceChargePct={serviceChargePct}
                        taxPct={taxPct}
                        initialOrderType={manualModalType}
                        initialCustomerName=""
                        onSubmitOrder={async (isDirectSettle, payload) => {
                            setIsSubmitting(true);
                            try {
                                const { data } = await supabase.from("orders").insert([{
                                    table_no: payload.tableNumber,
                                    items: payload.items,
                                    total_amount: payload.cartTotal,
                                    status: "Preparing",
                                    order_type: payload.type,
                                    customer_name: payload.customerName || null,
                                    payment_method: "Cashier",
                                    notes: payload.specialNotes || ""
                                }]).select();

                                if (data && data[0]) {
                                    setSelectedOrderId(data[0].id);
                                    setActiveTab("live");
                                }
                                setIsModalOpen(false);
                                fetchOrders();
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        isSubmitting={isSubmitting}
                    />
                )}

                {/* Payment Modal */}
                {isPaymentModalOpen && selectedOrder && (
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        totalAmount={grandTotal}
                        currencySymbol={currencySymbol}
                        orderType={selectedOrder.order_type}
                        onConfirmPayment={handleSettlePayment}
                        isSubmitting={isSubmitting}
                        initialMethod={paymentModalMethod}
                    />
                )}

                {/* Success Alert Modal */}
                {showPaymentSuccess && lastSettledDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
                        <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full space-y-3">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-black">Payment Completed!</h3>
                            <p className="text-xs text-slate-500">
                                Table {lastSettledDetails.tableNo} · {currencySymbol} {lastSettledDetails.totalAmount.toLocaleString()}
                            </p>
                            <button
                                onClick={() => setShowPaymentSuccess(false)}
                                className="w-full py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden Printable Receipt Component */}
                <PrintReceipt
                    kotPrintData={kotPrintData}
                    voucherData={null}
                    receiptOrder={printOrderData}
                    settings={settings}
                    currencySymbol={currencySymbol}
                    serviceChargePct={serviceChargePct}
                    taxPct={taxPct}
                    calculatedDiscount={calculatedDiscount}
                />
            </div>
        </ProtectedRoute>
    );
}