"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { COUNTRY_COLORS, formatValue, type LatestValue } from "@/lib/wb/types";

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

function themeColors() {
  const dark = isDarkTheme();
  return {
    text: dark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.88)",
    textMuted: dark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)",
    textFaint: dark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.4)",
    axisLine: dark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)",
    splitLine: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)",
    splitLineFaint: dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.05)",
    tooltipBg: dark ? "rgba(15,20,35,0.95)" : "rgba(255,255,255,0.96)",
    tooltipBorder: dark ? "rgba(78,205,196,0.2)" : "rgba(15,23,42,0.1)",
    tooltipText: dark ? "#e0e0e0" : "#1e293b",
  };
}

interface Props {
  data: LatestValue[];
}

function buildOption(data: LatestValue[]): echarts.EChartsOption {
  const c = themeColors();
  const countries = [...new Set(data.map((d) => d.country_code))];

  const seriesData = countries.map((code) => {
    const gdp = data.find((d) => d.country_code === code && d.indicator_code === "NY.GDP.MKTP.CD");
    const pop = data.find((d) => d.country_code === code && d.indicator_code === "SP.POP.TOTL");
    const gdpPc = data.find((d) => d.country_code === code && d.indicator_code === "NY.GDP.PCAP.CD");
    return {
      name: gdp?.country_name ?? code,
      value: [gdpPc?.value ?? 0, pop?.value ?? 0, gdp?.value ?? 0],
      itemStyle: { color: COUNTRY_COLORS[code] ?? "#888" },
    };
  });

  return {
    backgroundColor: "transparent",
    title: {
      text: "Economic Weight: GDP Per Capita vs Population",
      subtext: "Bubble size = Total GDP",
      left: "center",
      textStyle: { color: c.text, fontSize: 18, fontWeight: 600 },
      subtextStyle: { color: c.textFaint, fontSize: 12 },
    },
    tooltip: {
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText, fontSize: 13 },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number[] };
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
          <div>GDP/Capita: ${formatValue(p.value[0], "NY.GDP.PCAP.CD")}</div>
          <div>Population: ${formatValue(p.value[1], "SP.POP.TOTL")}</div>
          <div>Total GDP: ${formatValue(p.value[2], "NY.GDP.MKTP.CD")}</div>`;
      },
    },
    grid: { left: 90, right: 40, top: 80, bottom: 60 },
    xAxis: {
      type: "value",
      name: "GDP Per Capita (US$)",
      nameLocation: "middle",
      nameGap: 35,
      nameTextStyle: { color: c.textFaint, fontSize: 12 },
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: { color: c.textFaint, formatter: (v: number) => formatValue(v, "NY.GDP.PCAP.CD") },
      splitLine: { lineStyle: { color: c.splitLineFaint } },
    },
    yAxis: {
      type: "value",
      name: "Population",
      nameLocation: "middle",
      nameGap: 65,
      nameTextStyle: { color: c.textFaint, fontSize: 12 },
      axisLine: { show: false },
      axisLabel: { color: c.textFaint, formatter: (v: number) => formatValue(v, "SP.POP.TOTL") },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [
      {
        type: "scatter",
        data: seriesData,
        symbolSize: (val: number[]) => Math.max(20, Math.min(80, Math.log10(val[2]) * 6)),
        label: {
          show: true,
          formatter: (p: { name: string }) => p.name,
          position: "top",
          color: c.textMuted,
          fontSize: 12,
        },
        emphasis: { scale: 1.3 },
      },
    ],
  };
}

export default function EconomicBubbleChart({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    chart.setOption(buildOption(data), true);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    const observer = new MutationObserver(() => {
      chart.setOption(buildOption(data), true);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} className="h-[450px] w-full rounded-2xl border border-glass-border bg-glass/50 p-4" />;
}
