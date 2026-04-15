"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { COUNTRY_COLORS, formatValue, type IndicatorTrend } from "@/lib/wb/types";

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

function themeColors() {
  const dark = isDarkTheme();
  return {
    text: dark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.88)",
    textMuted: dark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)",
    textDim: dark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.5)",
    textFaint: dark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.4)",
    axisLine: dark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)",
    splitLine: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)",
    tooltipBg: dark ? "rgba(15,20,35,0.95)" : "rgba(255,255,255,0.96)",
    tooltipBorder: dark ? "rgba(78,205,196,0.2)" : "rgba(15,23,42,0.1)",
    tooltipText: dark ? "#e0e0e0" : "#1e293b",
  };
}

interface Props {
  data: IndicatorTrend[];
  title: string;
  indicatorCode: string;
}

function buildOption(data: IndicatorTrend[], title: string, indicatorCode: string): echarts.EChartsOption {
  const c = themeColors();
  const countries = [...new Set(data.map((d) => d.country_code))];
  const years = [...new Set(data.map((d) => d.year))].sort();

  const series = countries.map((code) => {
    const countryData = data.filter((d) => d.country_code === code);
    const name = countryData[0]?.country_name ?? code;
    return {
      name,
      type: "line" as const,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 3, color: COUNTRY_COLORS[code] ?? "#888" },
      itemStyle: { color: COUNTRY_COLORS[code] ?? "#888" },
      emphasis: { lineStyle: { width: 4 }, scale: 1.4 },
      data: years.map((y) => {
        const point = countryData.find((d) => d.year === y);
        return point?.value ?? null;
      }),
    };
  });

  return {
    backgroundColor: "transparent",
    title: {
      text: title,
      left: "center",
      textStyle: { color: c.text, fontSize: 18, fontWeight: 600, fontFamily: "inherit" },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText, fontSize: 13 },
      formatter: (params: unknown) => {
        const arr = params as { seriesName: string; value: number; color: string; axisValue: string }[];
        if (!Array.isArray(arr)) return "";
        let html = `<div style="font-weight:600;margin-bottom:6px">${arr[0].axisValue}</div>`;
        arr.forEach((p) => {
          if (p.value != null) {
            html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
              <span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span>
              <span>${p.seriesName}:</span>
              <span style="font-weight:600">${formatValue(p.value, indicatorCode)}</span>
            </div>`;
          }
        });
        return html;
      },
    },
    legend: { bottom: 40, textStyle: { color: c.textMuted, fontSize: 12 }, icon: "circle" },
    grid: { left: 80, right: 30, top: 60, bottom: 90 },
    xAxis: {
      type: "category",
      data: years.map(String),
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: { color: c.textDim, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.textFaint, fontSize: 11, formatter: (val: number) => formatValue(val, indicatorCode) },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    series,
  };
}

export default function GDPComparisonChart({ data, title, indicatorCode }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    chart.setOption(buildOption(data, title, indicatorCode), true);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    const observer = new MutationObserver(() => {
      chart.setOption(buildOption(data, title, indicatorCode), true);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data, title, indicatorCode]);

  return <div ref={chartRef} className="h-[420px] w-full rounded-2xl border border-glass-border bg-glass/50 p-4" />;
}
