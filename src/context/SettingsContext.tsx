"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface TableConfig {
  id: string;
  name: string;
  capacity: number;
  section: string;
}

export interface RestaurantSettings {
  id?: number | string;
  name: string;
  tagline: string;
  currency: string;
  service_charge_pct: number;
  tax_pct: number;
  table_count: number;
  phone?: string;
  address?: string;
  tables?: TableConfig[];
}

const defaultSettings: RestaurantSettings = {
  id: 1,
  name: "Gravity House",
  tagline: "Smart POS",
  currency: "LKR",
  service_charge_pct: 10,
  tax_pct: 0,
  table_count: 12,
  phone: "+94 77 123 4567",
  address: "123 Main Street, Colombo",
};

const SETTINGS_CACHE_KEY = "pos_cached_restaurant_settings";

interface SettingsContextType {
  settings: RestaurantSettings;
  updateSettings: (newSettings: Partial<RestaurantSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => false,
  refreshSettings: async () => { },
  loading: false,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<RestaurantSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        console.warn("Failed to read settings from cache:", e);
      }
    }
    return defaultSettings;
  });
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const updated: RestaurantSettings = {
          ...defaultSettings,
          ...data,
          id: Number(data.id) || 1,
          name: data.name || defaultSettings.name,
          tagline: data.tagline ?? defaultSettings.tagline,
          currency: data.currency || defaultSettings.currency,
          service_charge_pct: Number.isFinite(Number(data.service_charge_pct)) ? Number(data.service_charge_pct) : 0,
          tax_pct: Number.isFinite(Number(data.tax_pct)) ? Number(data.tax_pct) : 0,
          table_count: Number(data.table_count) || defaultSettings.table_count,
        };

        setSettings(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.warn("Could not fetch settings from Supabase, using cache/defaults:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel("realtime-restaurant-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_settings" },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<RestaurantSettings>): Promise<boolean> => {
    try {
      const targetId = Number(settings.id) || 1;
      const sCharge = Number(newSettings.service_charge_pct ?? settings.service_charge_pct);
      const tax = Number(newSettings.tax_pct ?? settings.tax_pct);

      const dbPayload: any = {
        id: targetId,
        name: newSettings.name ?? settings.name,
        tagline: newSettings.tagline ?? settings.tagline,
        currency: newSettings.currency ?? settings.currency,
        service_charge_pct: Number.isFinite(sCharge) ? sCharge : 0,
        tax_pct: Number.isFinite(tax) ? tax : 0,
        table_count: Number(newSettings.table_count ?? settings.table_count) || 12,
        phone: newSettings.phone ?? settings.phone ?? "",
        address: newSettings.address ?? settings.address ?? "",
        updated_at: new Date().toISOString()
      };

      const mergedLocal = { ...settings, ...dbPayload };
      setSettings(mergedLocal);
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(mergedLocal));
      }

      const { data: existing } = await supabase
        .from("restaurant_settings")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();

      let error;
      if (existing) {
        const res = await supabase
          .from("restaurant_settings")
          .update(dbPayload)
          .eq("id", targetId);
        error = res.error;
      } else {
        const res = await supabase
          .from("restaurant_settings")
          .insert([dbPayload]);
        error = res.error;
      }

      if (error) {
        console.error("Error saving restaurant_settings to DB:", error.message || error);
        return false;
      }

      await fetchSettings();
      return true;
    } catch (err) {
      console.error("Error updating settings:", err);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings: fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
export default SettingsContext;