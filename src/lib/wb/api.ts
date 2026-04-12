// World Bank Analytics — Supabase data fetching

import { supabase } from "@/lib/supabase";
import { INDICATOR_LABELS, type DashboardData, type CountrySnapshot, type IndicatorTrend } from "./types";

const DEFAULT_COUNTRIES = ["IND", "USA", "CHN", "GBR"];

export async function fetchDashboardData(countries: string[] = DEFAULT_COUNTRIES): Promise<DashboardData | null> {
  const { data, error } = await supabase.rpc("get_dashboard_data", {
    p_countries: countries,
  });

  if (error) {
    console.error("Failed to fetch dashboard data:", error);
    return null;
  }

  return data as unknown as DashboardData;
}

export async function fetchGdpTrend(countryCode: string): Promise<
  {
    year: number;
    gdp: number;
    gdp_per_capita: number;
    population: number;
    gdp_yoy_pct: number | null;
  }[]
> {
  const { data, error } = await supabase.rpc("get_gdp_trend", {
    p_country: countryCode,
  });

  if (error) {
    console.error("Failed to fetch GDP trend:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    year: row.year,
    gdp: row.gdp ?? 0,
    gdp_per_capita: row.gdp_per_capita ?? 0,
    population: row.population ?? 0,
    gdp_yoy_pct: row.gdp_yoy_pct,
  }));
}

export async function fetchCountrySnapshot(countryCode: string): Promise<CountrySnapshot | null> {
  const { data, error } = await supabase.rpc("get_country_snapshot", {
    p_country: countryCode,
  });

  if (error) {
    console.error("Failed to fetch country snapshot:", error);
    return null;
  }

  const snapshot = data?.[0];
  if (!snapshot) return null;

  return {
    country_name: snapshot.country_name ?? countryCode,
    region: snapshot.region ?? "",
    income_level: snapshot.income_level ?? "",
    latest_gdp: snapshot.latest_gdp ?? 0,
    latest_gdp_per_capita: snapshot.latest_gdp_per_capita ?? 0,
    latest_population: snapshot.latest_population ?? 0,
    gdp_cagr_5yr: snapshot.gdp_cagr_5yr,
    latest_year: snapshot.latest_year ?? 0,
  };
}

export async function fetchCompareCountries(indicator: string, countries: string[] = DEFAULT_COUNTRIES): Promise<IndicatorTrend[]> {
  const { data, error } = await supabase.rpc("compare_countries", {
    p_indicator: indicator,
    p_countries: countries,
  });

  if (error) {
    console.error("Failed to fetch comparison:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    country_code: row.country_code,
    country_name: row.country_name,
    indicator_code: indicator,
    indicator_name: INDICATOR_LABELS[indicator] ?? indicator,
    year: row.year,
    value: row.value,
    prev_value: null,
    yoy_change_pct: row.yoy_change_pct,
  }));
}

export async function fetchLatestValues() {
  const { data, error } = await supabase.rpc("get_latest_values");

  if (error) {
    console.error("Failed to fetch latest values:", error);
    return [];
  }

  return data ?? [];
}

export async function fetchSyncStatus() {
  const { data, error } = await supabase.from("wb_sync_runs").select("*").order("started_at", { ascending: false }).limit(5);

  if (error) {
    console.error("Failed to fetch sync status:", error);
    return [];
  }

  return data ?? [];
}
