"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Users, Flame, Leaf, Utensils } from "lucide-react";

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    image_url?: string;
    is_veg?: boolean;
    is_spicy?: boolean;
    is_popular?: boolean;
    is_available?: boolean;
    large_item?: MenuItem;
}

interface MenuItemCardProps {
    item: MenuItem;
    currencySymbol?: string;
    onAddToCart: (item: MenuItem, selectedSize: "Regular" | "Large", finalPrice: number) => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
    "Fried Rice (Keeri Samba)": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&q=60&auto=format&fit=crop",
    "Fried Rice (Basmathi)": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=60&auto=format&fit=crop",
    "Noodles": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&q=60&auto=format&fit=crop",
    "Chopsuey": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=300&q=60&auto=format&fit=crop",
    "Kottu": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=300&q=60&auto=format&fit=crop",
    "Cheese Kottu": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=300&q=60&auto=format&fit=crop",
    "Idiyappam Kottu": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=300&q=60&auto=format&fit=crop",
    "Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=60&auto=format&fit=crop",
    "Quick & Easy": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&q=60&auto=format&fit=crop",
    "Fresh Salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=60&auto=format&fit=crop",
    "Italian": "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=300&q=60&auto=format&fit=crop",
    "Gamigedara Special": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=60&auto=format&fit=crop",
    "Family Pack": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&q=60&auto=format&fit=crop",
    "Chicken Bytes": "https://images.unsplash.com/photo-1562967914-608f82629710?w=300&q=60&auto=format&fit=crop",
    "Seafood Bytes": "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=300&q=60&auto=format&fit=crop",
};

const DEFAULT_FOOD_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=60&auto=format&fit=crop";

export default function MenuItemCard({ item, currencySymbol = "LKR", onAddToCart }: MenuItemCardProps) {
    const hasLargeOption = Boolean(item.large_item);
    const [selectedSize, setSelectedSize] = useState<"Regular" | "Large">("Regular");
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Modal එක open වන විට Background Scroll lock කිරීම
    useEffect(() => {
        if (isDetailOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "unset";
        };
    }, [isDetailOpen]);

    const activeItem = selectedSize === "Large" && item.large_item ? item.large_item : item;
    const currentPrice = Number(activeItem.price || 0);

    const displayImage = item.image_url?.trim()
        ? item.image_url
        : (CATEGORY_IMAGES[item.category] || DEFAULT_FOOD_IMG);

    const cleanName = item.name.replace(/\s*\((Regular|Large)\)\s*/gi, "").trim();

    return (
        <>
            <div
                onClick={() => setIsDetailOpen(true)}
                className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col justify-between hover:border-orange-200 transition-all cursor-pointer group [contain:content]"
            >
                <div>
                    <div className="relative h-24 sm:h-28 w-full rounded-xl overflow-hidden mb-2 bg-slate-100">
                        <img
                            src={displayImage}
                            alt={cleanName}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                                e.currentTarget.src = DEFAULT_FOOD_IMG;
                            }}
                        />
                        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-slate-900/80 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            ⏱ 15m
                        </span>

                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex gap-1">
                            {item.is_veg && (
                                <span className="bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded">
                                    VEG
                                </span>
                            )}
                            {item.is_spicy && (
                                <span className="bg-red-600 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded">
                                    SPICY
                                </span>
                            )}
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem]" title={cleanName}>
                        {cleanName}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.description ? item.description.replace(/\(Large portion\)/gi, "").trim() : "Freshly prepared"}
                    </p>
                </div>

                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    {hasLargeOption ? (
                        <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl mb-2 gap-1">
                            <button
                                type="button"
                                onClick={() => setSelectedSize("Regular")}
                                className={`flex-1 text-[11px] sm:text-xs py-0.5 sm:py-1 rounded-lg font-bold transition-colors ${selectedSize === "Regular"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Regular
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedSize("Large")}
                                className={`flex-1 text-[11px] sm:text-xs py-0.5 sm:py-1 rounded-lg font-bold transition-colors ${selectedSize === "Large"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Large
                            </button>
                        </div>
                    ) : (
                        <div className="h-5 sm:h-6 mb-2" />
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                        <div className="flex items-baseline gap-0.5 sm:gap-1 min-w-0">
                            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 shrink-0">
                                {currencySymbol}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
                                {currentPrice.toLocaleString()}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onAddToCart(activeItem, selectedSize, currentPrice)}
                            className="inline-flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] sm:text-xs font-bold leading-none h-7 sm:h-8 px-2.5 sm:px-3 rounded-full transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 stroke-[2.8] shrink-0" />
                            <span className="leading-none pt-[1px]">Add</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Quick View Modal */}
            {isDetailOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setIsDetailOpen(false)}
                >
                    <div
                        className="bg-white w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[88vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ touchAction: 'pan-y' }}
                    >
                        {/* Image Banner */}
                        <div className="relative h-44 sm:h-48 w-full bg-slate-100 shrink-0">
                            <img
                                src={displayImage}
                                alt={cleanName}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-3 left-3 flex gap-1.5">
                                <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    ⏱ 15m
                                </span>
                                {item.is_veg && (
                                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Leaf className="w-2.5 h-2.5" /> Veg
                                    </span>
                                )}
                                {item.is_spicy && (
                                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Flame className="w-2.5 h-2.5" /> Spicy
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 no-scrollbar">
                            <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                                    {item.category}
                                </span>
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 leading-snug">
                                    {cleanName}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {item.description ? item.description.replace(/\(Large portion\)/gi, "").trim() : "Freshly prepared with authentic Sri Lankan ingredients."}
                                </p>
                            </div>

                            {/* Portion & Includes Info */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                        <Users className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Portion</p>
                                        <p className="text-[11px] font-bold text-slate-800">
                                            {selectedSize === "Large" ? "Serves 2-3" : "Serves 1-2"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Utensils className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Includes</p>
                                        <p className="text-[11px] font-bold text-slate-800">Gravy / Sauce</p>
                                    </div>
                                </div>
                            </div>

                            {/* Portion Selection */}
                            {hasLargeOption && (
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Choose Size
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSize("Regular")}
                                            className={`p-2 rounded-xl border text-left font-bold transition-all cursor-pointer ${selectedSize === "Regular"
                                                ? "border-orange-500 bg-orange-50/50 text-orange-600 ring-1 ring-orange-500"
                                                : "border-slate-200 bg-white text-slate-700"
                                                }`}
                                        >
                                            <p className="text-xs">Regular</p>
                                            <p className="text-xs font-black mt-0.5">{currencySymbol} {Number(item.price).toLocaleString()}</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSize("Large")}
                                            className={`p-2 rounded-xl border text-left font-bold transition-all cursor-pointer ${selectedSize === "Large"
                                                ? "border-orange-500 bg-orange-50/50 text-orange-600 ring-1 ring-orange-500"
                                                : "border-slate-200 bg-white text-slate-700"
                                                }`}
                                        >
                                            <p className="text-xs">Large</p>
                                            <p className="text-xs font-black mt-0.5">{currencySymbol} {Number(item.large_item?.price).toLocaleString()}</p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modern Full-Width Add Button with High-Contrast Price Badge */}
                        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100">
                            <button
                                onClick={() => {
                                    onAddToCart(activeItem, selectedSize, currentPrice);
                                    setIsDetailOpen(false);
                                }}
                                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex items-center gap-2 text-sm sm:text-base font-bold">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                        <Plus className="w-4 h-4 stroke-[3]" />
                                    </div>
                                    <span>Add to Order</span>
                                </div>

                                {/* කැපී පෙනෙන High-Contrast Price Badge එක */}
                                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-sm">
                                    {currencySymbol} {currentPrice.toLocaleString()}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}