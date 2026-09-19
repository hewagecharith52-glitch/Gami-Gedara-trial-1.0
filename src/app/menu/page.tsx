"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MenuItemCard, { MenuItem as CardMenuItem } from "@/components/MenuItemCard";

import {
  Search, ShoppingBag, Plus, Minus, Clock,
  CheckCircle, UtensilsCrossed, X, Star, AlertCircle, ChefHat,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_new?: boolean;
  notes?: string;
  cartItemId: string;
};

function MenuContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const urlTableNumber = searchParams.get("table");
  const urlMode = searchParams.get("mode");

  const [tableNumber, setTableNumber] = useState("");
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [noQrDetected, setNoQrDetected] = useState(false);

  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();

  // Dynamic restaurant tables loaded directly from Supabase DB with cache
  const [dbTables, setDbTables] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("pos_cached_restaurant_tables");
        if (cached) return JSON.parse(cached);
      } catch (e) {
        console.warn("Failed to read cached tables in Menu:", e);
      }
    }
    return [];
  });

  // Staff or in-house tablet bypass
  const isBypassMode = Boolean(isAuthenticated || urlMode === "tablet");

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cookingNotes, setCookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [waiterName, setWaiterName] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uiToast, setUiToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [dbMenu, setDbMenu] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch tables directly from restaurant_tables and subscribe to changes
  useEffect(() => {
    if (!mounted) return;

    const fetchTables = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurant_tables")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          const sorted = [...data].sort((a, b) => {
            const numA = parseInt(a.table_no, 10);
            const numB = parseInt(b.table_no, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a.table_no).localeCompare(String(b.table_no));
          });

          const formatted = sorted.map((t: any) => ({
            id: String(t.table_no),
            name: `Table ${String(t.table_no).padStart(2, "0")}`,
            capacity: Number(t.capacity || 4),
            section: t.floor_area || "Tables"
          }));

          setDbTables(formatted);
          if (typeof window !== "undefined") {
            localStorage.setItem("pos_cached_restaurant_tables", JSON.stringify(formatted));
          }
        }
      } catch (err) {
        console.warn("Error fetching tables in MenuPage:", err);
      }
    };

    fetchTables();

    const channel = supabase
      .channel("menu_restaurant_tables_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables" },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted]);

  const availableTables = useMemo(() => {
    if (dbTables.length > 0) {
      return dbTables;
    }
    if (settings?.tables && settings.tables.length > 0) {
      return settings.tables;
    }
    return Array.from({ length: settings?.table_count || 12 }, (_, i) => ({
      id: String(i + 1),
      name: `Table ${String(i + 1).padStart(2, "0")}`
    }));
  }, [dbTables, settings]);

  // Set Table Number (Lock & 40-minute limitations completely removed)
  useEffect(() => {
    if (!mounted) return;

    if (isBypassMode) {
      const activeTable = urlTableNumber || localStorage.getItem("active_table") || "1";
      setTableNumber(activeTable);
      return;
    }

    const activeTable = urlTableNumber || localStorage.getItem("active_table");

    if (!activeTable) {
      setNoQrDetected(true);
      return;
    }

    setTableNumber(activeTable);
    localStorage.setItem("active_table", activeTable);

    // Clean any old leftover locks
    if (typeof window !== "undefined") {
      localStorage.removeItem(`pos_table_lock_${activeTable}`);
      localStorage.removeItem(`pos_table_session_${activeTable}`);
    }
  }, [mounted, urlTableNumber, isBypassMode]);

  // Fetch Active Menu Items
  useEffect(() => {
    if (!mounted) return;
    let isMounted = true;

    const fetchMenu = async () => {
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("category")
          .order("name");

        if (isMounted && data) {
          setDbMenu(data);
        }
      } catch (err) {
        if (isMounted) setDbMenu([]);
      }
    };

    fetchMenu();

    const channel = supabase
      .channel("public:menu_items:live_menu")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        fetchMenu();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [mounted]);

  const isAnyModalOpen = Boolean(
    isCartOpen || isReviewModalOpen || isTableSelectorOpen ||
    (!isBypassMode && noQrDetected)
  );

  useEffect(() => {
    if (!mounted) return;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mounted, isAnyModalOpen]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setUiToast({ text, type });
    setTimeout(() => setUiToast(null), 4000);
  };

  const groupedMenu = useMemo(() => {
    const map = new Map<string, CardMenuItem>();

    dbMenu.forEach((item) => {
      const isRegular = item.name.includes("(Regular)");
      const isLarge = item.name.includes("(Large)");

      if (isRegular || isLarge) {
        const baseName = item.name.replace(/\s*\((Regular|Large)\)\s*/gi, "").trim();
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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(groupedMenu.map((item) => item.category).filter(Boolean)));
    return ["All", ...cats];
  }, [groupedMenu]);

  // Search Logic: ONLY filter by Dish Name
  const filteredMenu = useMemo(() => {
    let filtered = groupedMenu;
    if (activeCategory !== "All") {
      filtered = filtered.filter((item) => item.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [groupedMenu, activeCategory, searchQuery]);

  const handleAddCardToCart = (item: CardMenuItem, selectedSize: "Regular" | "Large", finalPrice: number) => {
    let cartItemName = item.name;
    if (item.large_item) {
      cartItemName = `${item.name.replace(/\s*\((Regular|Large)\)\s*/gi, "").trim()} (${selectedSize})`;
    }

    const cartItemId = `${item.id}-${selectedSize}`;

    setCart((prev) => {
      const existing = prev.find((i) => i.name === cartItemName);
      if (existing) {
        return prev.map((i) => (i.name === cartItemName ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: cartItemName, price: finalPrice, quantity: 1, cartItemId, notes: "" }];
    });

    showToast(`Added ${cartItemName} to cart`, "success");
  };

  const updateCartById = (name: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter((i) => i.name !== name);
        return prev.map((i) => (i.name === name ? { ...i, quantity: newQty } : i));
      }
      return prev;
    });
  };

  const updateItemNote = (name: string, note: string) => {
    setCart((prev) =>
      prev.map((item) => (item.name === name ? { ...item, notes: note } : item))
    );
  };

  const taxPct = Number(settings?.tax_pct ?? 0);
  const serviceChargePct = Number(settings?.service_charge_pct ?? 10);
  const currencySymbol = settings?.currency || "LKR";

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const cartTax = (cartTotal * taxPct) / 100;
  const cartServiceCharge = (cartTotal * serviceChargePct) / 100;
  const cartGrandTotal = cartTotal + cartTax + cartServiceCharge;
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const ticket = Math.floor(1000 + Math.random() * 9000).toString();
    setTicketNumber(ticket);

    // ⚠️ KITCHEN FILTER: All QR-submitted items MUST have kot_printed: false
    // so they are hidden from the Kitchen Display until the Cashier accepts them.
    // kot_printed: undefined would evaluate as `undefined !== false` → true → bypasses filter!
    const cleanedCartItems = cart.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity),
      notes: (item.notes || "").trim(),
      kot_printed: false,
      is_new: true,
      prepared: false,
      added_at: new Date().toISOString()
    }));

    try {
      const { data: activeOrders, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("table_no", tableNumber)
        .in("status", ["pending", "Pending", "preparing", "Preparing", "ready", "Ready"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (activeOrders && activeOrders.length > 0) {
        const activeOrder = activeOrders[0];
        const existingItems = (activeOrder.items || []).map((item: any) => ({ ...item, prepared: item.prepared ?? false }));
        // Add-on items: inherit kot_printed: false from cleanedCartItems
        // (already set above, but be explicit for clarity)
        const newItems = cleanedCartItems.map((item) => ({
          ...item,
          is_new: true,
          prepared: false,
          kot_printed: false,
          added_at: new Date().toISOString()
        }));
        //  add-on items   (kitchen screen   )
        const mergedItems = [...newItems, ...existingItems];

        const mergedSubtotal = mergedItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
        const discount = Number(activeOrder.discount || 0);
        const discounted = Math.max(0, mergedSubtotal - discount);
        const sCharge = (discounted * serviceChargePct) / 100;
        const tax = (discounted * taxPct) / 100;
        const newTotalAmount = discounted + sCharge + tax;

        const combinedNotes = cookingNotes
          ? `${activeOrder.notes ? activeOrder.notes + " | " : ""}${cookingNotes}`
          : activeOrder.notes;

        // ⚠️ CRITICAL FIX: If the order is already "Preparing" (visible on kitchen screen),
        // NEVER downgrade it back to "pending" — the kitchen filters ONLY on "Preparing".
        // Preserve the existing status; only fall back to "pending" for brand-new orders.
        const preservedStatus =
          ["preparing", "Preparing"].includes(activeOrder.status)
            ? "Preparing"
            : "pending";

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            items: mergedItems,
            total_amount: Number(newTotalAmount),
            notes: combinedNotes,
            status: preservedStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", activeOrder.id);

        if (updateError) {
          showToast(`Failed to update order: ${updateError.message}`, "error");
          return;
        }
        setPlacedOrderId(activeOrder.id);
      } else {
        // Brand-new order: items also start with kot_printed: false
        // (customer orders always wait for Cashier to accept before going to Kitchen)
        const payload = {
          table_no: tableNumber || "1",
          order_type: "dine-in",
          items: cleanedCartItems,   // already has kot_printed: false from above
          total_amount: Number(cartGrandTotal),
          payment_method: "Pending",
          status: "pending",
          notes: cookingNotes || ""
        };

        const { data, error: insertError } = await supabase
          .from("orders")
          .insert([payload])
          .select();

        if (insertError) {
          showToast(`Failed to place order: ${insertError.message}`, "error");
          return;
        }

        if (data && data[0]) {
          setPlacedOrderId(data[0].id);
        }
      }

      setOrderSuccess(true);
      setCart([]);
      setIsCartOpen(false);
      setCookingNotes("");

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#f97316", "#fb923c", "#ffffff", "#10b981"],
      });
    } catch (error: any) {
      console.error("Error placing order:", error);
      showToast("Failed to place order. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);

    try {
      const payload = {
        table_no: String(tableNumber || "1"),
        food_rating: Number(foodRating),
        service_rating: Number(serviceRating),
        waiter_name: waiterName.trim() || "Staff",
        customer_name: reviewerName.trim() || "Guest",
        comment: reviewComment.trim() || null
      };

      const { error } = await supabase.from("customer_reviews").insert([payload]);

      if (error) {
        showToast("Failed to submit review: " + error.message, "error");
      } else {
        setIsReviewModalOpen(false);
        setReviewComment("");
        setWaiterName("");
        setReviewerName("");
        showToast("Thank you! Your feedback has been received.", "success");
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 }
        });
      }
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderReviewModal = () => {
    if (!isReviewModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-sm p-4 sm:p-5 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar">
          <button
            onClick={() => setIsReviewModalOpen(false)}
            className="absolute top-3.5 right-3.5 w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center mb-2.5">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-1 text-amber-600">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Rate Experience</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Table {tableNumber ? tableNumber.padStart(2, '0') : ''} • Help us serve you better!</p>
          </div>

          <form onSubmit={handleReviewSubmit} className="space-y-2.5">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">🍲 Food Quality</span>
                <span className="text-[10px] font-bold text-amber-600">{foodRating}/5</span>
              </div>
              <div className="flex gap-1.5 justify-center py-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setFoodRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= foodRating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">🤵 Waiter & Service</span>
                <span className="text-[10px] font-bold text-amber-600">{serviceRating}/5</span>
              </div>
              <div className="flex gap-1.5 justify-center py-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setServiceRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= serviceRating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Waiter Name</label>
                <input
                  type="text"
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  placeholder="e.g. Kamal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Kasun"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Comments</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmittingReview ? "Submitting..." : "Submit Review ⭐"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg animate-pulse mb-3">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-500 tracking-wide">Loading Menu...</p>
      </div>
    );
  }

  if (!isBypassMode && noQrDetected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Table QR Required</h2>
        <p className="text-sm font-semibold text-slate-600 max-w-sm mb-6">
          Please scan the QR code placed on your dining table to browse our live menu and order food.
        </p>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {isAuthenticated ? (
          <Navbar />
        ) : (
          <header className="fixed top-0 w-full z-40 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-slate-900 font-bold text-sm sm:text-base leading-tight truncate">
                  {settings?.name || "Smart POS"}
                </h1>
                <p className="text-[8px] sm:text-[10px] text-orange-500 font-bold uppercase tracking-wider">Smart QR Menu</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold whitespace-nowrap">
                🍽️ <span className="hidden xs:inline">Table </span>{tableNumber.padStart(2, "0")}
              </div>
            </div>
          </header>
        )}
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center mt-12">
          <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight mb-2 text-slate-900">Order Placed!</h2>
          <div className="flex items-center gap-2 text-slate-500 mb-10">
            <span className="text-sm font-medium">Ticket No.</span>
            <span className="text-orange-500 font-mono tracking-wider font-bold text-lg">#{ticketNumber}</span>
          </div>

          <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 mb-8 text-left shadow-md shadow-slate-200/50">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Kitchen Preparing...</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Your order is being crafted</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Est. Serving Time</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">12 - 18 minutes</p>
              </div>
            </div>
          </div>

          {placedOrderId && (
            <Link
              href={`/order/${placedOrderId}`}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold tracking-wide transition-colors shadow-lg active:scale-95 mb-3 flex justify-center items-center gap-2"
            >
              <Clock className="w-5 h-5" /> Track Your Order Live
            </Link>
          )}

          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold tracking-wide transition-colors shadow-lg active:scale-95 mb-3 flex justify-center items-center gap-2 cursor-pointer"
          >
            <Star className="w-5 h-5 fill-white" /> Rate Food & Waiter
          </button>

          <button
            onClick={() => {
              setOrderSuccess(false);
              setPlacedOrderId(null);
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold tracking-wide transition-colors shadow-lg active:scale-95 cursor-pointer"
          >
            Order More
          </button>
        </div>

        {renderReviewModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-16 pb-32 font-sans selection:bg-orange-500/30">
      {isAuthenticated ? (
        <Navbar rightActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTableSelectorOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg border border-slate-200 text-slate-700 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              🍽️ Table {tableNumber.padStart(2, "0")}
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        } />
      ) : (
        <header className="fixed top-0 w-full z-40 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-slate-900 font-bold text-sm sm:text-base leading-tight truncate">
                {settings?.name || "Smart POS"}
              </h1>
              <p className="text-[8px] sm:text-[10px] text-orange-500 font-bold uppercase tracking-wider">
                {isBypassMode ? "Staff / Tablet Mode" : "Smart QR Menu"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isBypassMode ? (
              <button
                onClick={() => setIsTableSelectorOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg border border-slate-200 text-slate-700 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                🍽️ Table {tableNumber.padStart(2, "0")}
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold whitespace-nowrap">
                🍽️ Table {tableNumber.padStart(2, "0")}
              </div>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Toast */}
      {uiToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm animate-in fade-in slide-from-top-2 duration-300">
          {uiToast.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          {uiToast.text}
        </div>
      )}

      {/* Seamless Sticky Search & Category Bar */}
      <div className="sticky top-16 z-30 bg-slate-50 border-b border-slate-200/90 shadow-2xs pt-3 sm:pt-4">
        <div className="px-3 sm:px-6 max-w-7xl mx-auto pb-3">
          <div className="relative group">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search dishes by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none placeholder:text-slate-400 font-bold shadow-2xs"
            />
          </div>
        </div>

        {!searchQuery && (
          <div className="flex overflow-x-auto px-3 sm:px-6 max-w-7xl mx-auto pb-3 gap-1.5 sm:gap-2 no-scrollbar scroll-smooth">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-2xs shrink-0 cursor-pointer ${activeCategory === cat
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20 scale-[1.02]"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Food Items Grid */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-2 py-4 sm:py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 overflow-x-hidden">
        {filteredMenu.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            currencySymbol={currencySymbol}
            onAddToCart={handleAddCardToCart}
          />
        ))}

        {filteredMenu.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm col-span-full">
            <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-xl text-slate-700">No items found</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">Try searching by a different dish name.</p>
          </div>
        )}
      </main>

      {/* Floating Review Button */}
      <button
        onClick={() => setIsReviewModalOpen(true)}
        className="fixed bottom-28 left-4 sm:bottom-6 sm:left-6 z-40 bg-white text-slate-800 border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl flex items-center gap-2 sm:gap-2.5 transition-all hover:scale-105 active:scale-95 group font-bold text-xs sm:text-sm cursor-pointer"
      >
        <div className="w-7 h-7 rounded-xl bg-amber-400 text-white flex items-center justify-center shadow-sm shrink-0">
          <Star className="w-4 h-4 fill-white text-white" />
        </div>
        <span className="sm:hidden">Rate</span>
        <span className="hidden sm:inline">Rate Food & Service</span>
      </button>

      {/* Floating Checkout (Desktop) */}
      {cartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-tr from-orange-600 to-orange-400 text-white rounded-[2rem] shadow-[0_10px_30px_rgba(249,115,22,0.4)] items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95 border-2 border-white/20 cursor-pointer"
        >
          <ShoppingBag className="w-7 h-7" />
          <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-xs w-7 h-7 flex items-center justify-center rounded-full font-bold shadow-md border-2 border-white animate-bounce">
            {cartCount}
          </span>
        </button>
      )}

      {/* Floating Mobile Cart Bar */}
      {cartCount > 0 && (
        <div className="md:hidden fixed bottom-2 left-3 right-3 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shadow-white/20">
                {cartCount}
              </div>
              <span className="font-bold text-sm">View Cart</span>
            </div>
            <span className="font-bold text-sm">{currencySymbol} {cartGrandTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ${isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsCartOpen(false)} />
        <div
          className={`absolute bottom-0 left-0 w-full bg-slate-50 rounded-t-[2.5rem] shadow-[0_-10px_50px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-out flex flex-col max-h-[90vh] ${isCartOpen ? "translate-y-0" : "translate-y-full"
            }`}
        >
          <div className="p-6 pb-4 flex justify-between items-center bg-white rounded-t-[2.5rem] border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">Your Cart</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {cart.map((item) => (
              <div key={item.name} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-slate-900 text-base leading-tight">{item.name}</h4>
                    <p className="text-orange-500 font-bold text-sm mt-1">
                      {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-200 shrink-0">
                    <button
                      onClick={() => updateCartById(item.name, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-700 shadow-sm border border-slate-100 active:scale-90 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateCartById(item.name, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg shadow-sm active:scale-90 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Per-Item Custom Note Input */}
                <div className="pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Special note for this item (e.g. Less spicy, no onion)..."
                    value={item.notes || ""}
                    onChange={(e) => updateItemNote(item.name, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all font-medium shadow-inner"
                  />
                </div>
              </div>
            ))}

            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Overall Cooking Notes (For the whole order)</label>
              <textarea
                value={cookingNotes}
                onChange={(e) => setCookingNotes(e.target.value)}
                placeholder="e.g., Serve all food together..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm"
                rows={2}
              />
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 pb-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 font-bold">Total Amount</span>
              <span className="text-3xl font-bold text-slate-900">
                <span className="text-slate-400 text-xl mr-1">{currencySymbol}</span>
                {cartGrandTotal.toLocaleString()}
              </span>
            </div>
            <button
              onClick={placeOrder}
              disabled={isSubmitting}
              className="w-full py-5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-bold rounded-2xl text-xl tracking-wide transition-all shadow-[0_10px_20px_rgba(249,115,22,0.3)] disabled:opacity-70 active:scale-[0.98] flex justify-center cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        </div>
      </div>

      {renderReviewModal()}

      {/* Tablet / Staff Table Switcher Modal */}
      {isTableSelectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsTableSelectorOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex justify-between items-baseline mb-1 pr-8">
              <h3 className="text-xl font-bold text-slate-900">Select Table</h3>
              <span className="text-xs font-bold text-slate-400">
                {availableTables.length} Tables Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Tap on table to switch.</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[360px] overflow-y-auto p-1 no-scrollbar">
              {availableTables.map((table: any) => {
                const isActive = String(tableNumber) === String(table.id);
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      setTableNumber(String(table.id));
                      localStorage.setItem("active_table", String(table.id));

                      const newUrl = new URL(window.location.href);
                      newUrl.searchParams.set("table", String(table.id));
                      window.history.pushState({}, "", newUrl);

                      setIsTableSelectorOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 border-orange-500 ring-2 ring-orange-500"
                      : "bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border-slate-200 text-slate-800"
                      }`}
                  >
                    <span className="text-2xl mb-1 drop-shadow-sm">🍽️</span>
                    <span className="text-[10px] sm:text-xs font-bold truncate w-full text-center">
                      {table.name || `Table ${String(table.id).padStart(2, "0")}`}
                    </span>
                    {table.capacity && (
                      <span className={`text-[8px] font-bold mt-0.5 ${isActive ? "text-orange-100" : "text-slate-400"}`}>
                        {table.capacity} Seats
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold">Loading Menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}