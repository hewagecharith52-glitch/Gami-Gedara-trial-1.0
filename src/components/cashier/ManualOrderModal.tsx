"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Star, ShoppingBag, Send, User, Minus, Plus } from "lucide-react";
import MenuItemCard, { MenuItem as CardMenuItem } from "@/components/MenuItemCard";
import { OrderItem, OrderType } from "./types";
import { supabase } from "@/lib/supabase";

interface ManualOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Array<{ id: string; name: string }>;
    currencySymbol: string;
    serviceChargePct: number;
    taxPct: number;
    initialOrderType?: string;
    initialCustomerName?: string;
    onSubmitOrder: (isDirectSettle: boolean, orderPayload: {
        type: OrderType;
        tableNumber: string;
        items: OrderItem[];
        cartTotal: number;
        customerName: string;
        specialNotes: string;
    }) => Promise<void>;
    isSubmitting: boolean;
}

const MENU_CACHE_KEY = "pos_cached_manual_menu_items";
const FAST_MOVING_CACHE_KEY = "pos_cached_fast_moving_ids";

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
    isOpen,
    onClose,
    tables,
    currencySymbol,
    serviceChargePct,
    taxPct,
    initialOrderType = "dine-in-1",
    initialCustomerName = "",
    onSubmitOrder,
    isSubmitting,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [orderType, setOrderType] = useState<string>(initialOrderType);
    const [customerName, setCustomerName] = useState(initialCustomerName);
    const [specialNotes, setSpecialNotes] = useState("");

    // Instant load from Cache to eliminate 0-second loading lag
    const [dbMenu, setDbMenu] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const cached = localStorage.getItem(MENU_CACHE_KEY);
                if (cached) return JSON.parse(cached);
            } catch (e) {
                console.warn("Failed reading cached menu", e);
            }
        }
        return [];
    });

    const [fastMovingItemIds, setFastMovingItemIds] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const cached = localStorage.getItem(FAST_MOVING_CACHE_KEY);
                if (cached) return JSON.parse(cached);
            } catch (e) {
                console.warn("Failed reading fast moving cache", e);
            }
        }
        return [];
    });

    const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("pos_favorite_dishes");
                return saved ? JSON.parse(saved) : [];
            } catch {
                return [];
            }
        }
        return [];
    });

    useEffect(() => {
        setOrderType(initialOrderType);
        setCustomerName(initialCustomerName);
    }, [initialOrderType, initialCustomerName]);

    // Fetch and sync menu data in the background without blocking the UI
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const fetchMenu = async () => {
            try {
                const { data } = await supabase
                    .from("menu_items")
                    .select("*")
                    .eq("is_available", true)
                    .order("category")
                    .order("name");

                if (isMounted && data && data.length > 0) {
                    setDbMenu(data);
                    if (typeof window !== "undefined") {
                        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(data));
                    }
                }
            } catch (err) {
                console.warn("Error fetching menu items:", err);
            }
        };

        const fetchTopSellingItems = async () => {
            try {
                const { data } = await supabase
                    .from("orders")
                    .select("items")
                    .in("status", ["completed", "Completed"])
                    .order("created_at", { ascending: false })
                    .limit(60);

                if (isMounted && data && data.length > 0) {
                    const itemSalesMap = new Map<string, number>();
                    data.forEach((order: any) => {
                        if (Array.isArray(order.items)) {
                            order.items.forEach((item: any) => {
                                const rawName = String(item.name || "")
                                    .replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "")
                                    .trim()
                                    .toLowerCase();
                                const qty = Number(item.quantity || 1);
                                if (rawName) itemSalesMap.set(rawName, (itemSalesMap.get(rawName) || 0) + qty);
                            });
                        }
                    });
                    const sortedNames = Array.from(itemSalesMap.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name]) => name);

                    setFastMovingItemIds(sortedNames);
                    if (typeof window !== "undefined") {
                        localStorage.setItem(FAST_MOVING_CACHE_KEY, JSON.stringify(sortedNames));
                    }
                }
            } catch (e) {
                console.warn("Error fetching top selling items:", e);
            }
        };

        fetchMenu();
        fetchTopSellingItems();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    const toggleFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavoriteIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            if (typeof window !== "undefined") {
                localStorage.setItem("pos_favorite_dishes", JSON.stringify(next));
            }
            return next;
        });
    };

    const groupedMenu = useMemo(() => {
        const map = new Map<string, CardMenuItem>();
        dbMenu.forEach((item) => {
            const isRegular = item.name.includes("(Regular)");
            const isLarge = item.name.includes("(Large)");
            if (isRegular || isLarge) {
                const baseName = item.name.replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "").trim();
                const groupKey = `${item.category}-${baseName}`;
                if (!map.has(groupKey)) {
                    map.set(groupKey, {
                        id: item.id,
                        name: baseName,
                        description: item.description,
                        price: Number(item.price),
                        category: item.category,
                        image_url: item.image_url,
                        is_veg: item.is_veg,
                        is_spicy: item.is_spicy,
                        is_popular: item.is_popular,
                        is_available: item.is_available,
                    });
                }
                const existing = map.get(groupKey)!;
                if (isLarge) {
                    existing.large_item = {
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        price: Number(item.price),
                        category: item.category,
                        image_url: item.image_url,
                    };
                } else if (isRegular) {
                    existing.id = item.id;
                    existing.name = item.name;
                    existing.price = Number(item.price);
                }
            } else {
                map.set(item.id, {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: Number(item.price),
                    category: item.category,
                    image_url: item.image_url,
                    is_veg: item.is_veg,
                    is_spicy: item.is_spicy,
                    is_popular: item.is_popular,
                    is_available: item.is_available,
                });
            }
        });
        return Array.from(map.values());
    }, [dbMenu]);

    const filteredMenu = useMemo(() => {
        let filtered = groupedMenu;
        if (activeCategory === "⭐ Favorites") {
            filtered = filtered.filter((item) => favoriteIds.includes(item.id));
        } else if (activeCategory === "🔥 Fast Moving") {
            filtered = filtered.filter((item) => {
                const cleanBase = item.name.replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "").trim().toLowerCase();
                return fastMovingItemIds.slice(0, 10).some((name) => cleanBase.includes(name) || name.includes(cleanBase));
            });
        } else if (activeCategory !== "All") {
            filtered = filtered.filter((item) => item.category === activeCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((item) => item.name.toLowerCase().includes(q));
        }
        return filtered;
    }, [activeCategory, searchQuery, groupedMenu, favoriteIds, fastMovingItemIds]);

    const menuCategories = useMemo(() => {
        const cats = Array.from(new Set(groupedMenu.map((item) => item.category).filter(Boolean))).sort() as string[];
        return ["All", "⭐ Favorites", "🔥 Fast Moving", ...cats];
    }, [groupedMenu]);

    const handleAddCardToCart = (item: CardMenuItem, selectedSize: "Regular" | "Large", finalPrice: number) => {
        const cleanBaseName = item.name.replace(/\s*\((Regular\vert{}Large)\)\s*/gi, "").trim();
        const cartItemName = `${cleanBaseName} (${selectedSize})`;
        setCart((prev) => {
            const existing = prev.find((i) => i.name === cartItemName);
            if (existing) return prev.map((i) => (i.name === cartItemName ? { ...i, quantity: i.quantity + 1 } : i));
            return [...prev, { id: item.id, name: cartItemName, price: finalPrice, quantity: 1, notes: "", kot_printed: false }];
        });
    };

    const updateCart = (item: OrderItem, delta: number) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id || i.name === item.name);
            if (existing) {
                const newQty = existing.quantity + delta;
                if (newQty <= 0) return prev.filter((i) => i.id !== item.id && i.name !== item.name);
                return prev.map((i) => (i.name === item.name ? { ...i, quantity: newQty } : i));
            }
            return prev;
        });
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const isDineInCart = typeof orderType === "string" && orderType.startsWith("dine-in");
    const cartServiceCharge = isDineInCart ? (cartSubtotal * serviceChargePct) / 100 : 0;
    const cartTax = (cartSubtotal * taxPct) / 100;
    const cartTotal = cartSubtotal + cartServiceCharge + cartTax;

    const handleClose = () => {
        setCart([]);
        setSearchQuery("");
        setSpecialNotes("");
        onClose();
    };

    const handleTriggerSubmit = (isDirectSettle: boolean) => {
        if (cart.length === 0) return;
        const isDineInOrder = typeof orderType === "string" && orderType.startsWith("dine-in");
        const type: OrderType = isDineInOrder ? "dine-in" : (orderType as OrderType);
        const tableNumber = isDineInOrder ? String(orderType.split("-")[2] || "1") : "0";

        onSubmitOrder(isDirectSettle, {
            type,
            tableNumber,
            items: cart,
            cartTotal,
            customerName,
            specialNotes,
        });
        setCart([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 lg:p-6 overflow-hidden">
            <div className="w-full max-w-7xl h-full sm:h-[90vh] bg-white rounded-none sm:rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-slate-200 relative">
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 z-40 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Categories Sidebar */}
                <div className="w-full lg:w-48 xl:w-56 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
                    <div className="hidden lg:block p-4 border-b border-slate-200 bg-white shrink-0">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Categories</span>
                    </div>
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto p-2 gap-1.5 flex-1 no-scrollbar">
                        {menuCategories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-between shrink-0 cursor-pointer ${activeCategory === cat
                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-[1.01]"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    }`}
                            >
                                <span className="truncate">{cat}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dishes Grid */}
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
                    <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search in ${activeCategory}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-slate-50/40">
                        {groupedMenu.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-orange-500 animate-spin mb-2" />
                                <span className="text-xs font-bold">Loading dishes...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {filteredMenu.map((item) => {
                                    const isFav = favoriteIds.includes(item.id);
                                    return (
                                        <div key={item.id} className="relative group">
                                            <button
                                                type="button"
                                                onClick={(e) => toggleFavorite(item.id, e)}
                                                className={`absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all cursor-pointer ${isFav
                                                    ? "bg-amber-400 text-white shadow-xs"
                                                    : "bg-white/90 text-slate-400 hover:text-amber-500"
                                                    }`}
                                            >
                                                <Star
                                                    className={`w-3.5 h-3.5 ${isFav ? "fill-white stroke-white" : "stroke-[2.5]"
                                                        }`}
                                                />
                                            </button>
                                            <MenuItemCard
                                                item={item}
                                                currencySymbol={currencySymbol}
                                                onAddToCart={handleAddCardToCart}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Drawer */}
                <div className="w-full lg:w-[360px] xl:w-[400px] bg-white flex flex-col shrink-0 min-h-0 overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
                        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-orange-500" /> Order Details
                        </h2>
                    </div>

                    <div className="p-3 bg-slate-50 border-b border-slate-100 shrink-0 space-y-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Order Destination
                            </label>
                            <select
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs outline-none focus:border-orange-500 cursor-pointer shadow-2xs"
                            >
                                <option value="takeaway">🛍️ Takeaway (F9)</option>
                                <option value="delivery">🛵 Delivery (F10)</option>
                                <optgroup label="Dine-in Tables">
                                    {tables.map((t) => (
                                        <option key={t.id} value={`dine-in-${t.id}`}>
                                            🍽️ Table {t.id}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" /> Customer Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Kamal / Table Guest"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs outline-none focus:border-orange-500 shadow-2xs"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {cart.map((item) => (
                            <div
                                key={item.name}
                                className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs space-y-2"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-slate-900 text-xs truncate">{item.name}</h4>
                                        <p className="text-orange-500 font-bold text-xs mt-0.5">
                                            {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-1 border border-slate-200 shrink-0">
                                        <button
                                            onClick={() => updateCart(item, -1)}
                                            className="w-6 h-6 flex items-center justify-center bg-white rounded text-slate-700 shadow-2xs cursor-pointer"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-4 text-center font-bold text-slate-900 text-xs">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateCart(item, 1)}
                                            className="w-6 h-6 flex items-center justify-center bg-orange-500 text-white rounded shadow-2xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <ShoppingBag className="w-10 h-10 mb-2 opacity-20" />
                                <p className="font-bold text-xs">Cart is empty</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                        <div className="flex justify-between text-sm font-black text-slate-900 mb-2.5">
                            <span>Total</span>
                            <span className="text-orange-500">
                                {currencySymbol} {cartTotal.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => handleTriggerSubmit(false)}
                                disabled={isSubmitting || cart.length === 0}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmitting ? "Processing..." : "Send to Kitchen (Print KOT)"}</span>
                            </button>
                            <button
                                onClick={() => handleTriggerSubmit(true)}
                                disabled={isSubmitting || cart.length === 0}
                                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                            >
                                ⚡ Direct Settle &amp; Bill
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};