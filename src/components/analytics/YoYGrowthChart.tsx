"use client";

import { useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts";
import { COUNTRY_COLORS, type IndicatorTrend } from "@/lib/wb/types";

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
}

export default function YoYGrowthChart({ data, title }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const buildChart = useCallback(() => {
    if (!chartRef.current || !data.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    }

    const c = themeColors();
    const countries = [...new Set(data.map((d) => d.country_code))];
    const years = [...new Set(data.map((d) => d.year))].sort();

    const series = countries.map((code) => {
      const countryData = data.filter((d) => d.country_code === code);
      const name = countryData[0]?.country_name ?? code;
      return {
        name,
        type: "bar" as const,
        barGap: "10%",
        itemStyle: {
          color: COUNTRY_COLORS[code] ?? "#888",
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: { itemStyle: { opacity: 1 } },
        data: years.map((y) => {
          const point = countryData.find((d) => d.year === y);
          return point?.yoy_change_pct ?? null;
        }),
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      title: {
        text: title,
        left: "center",
        textStyle: { color: c.text, fontSize: 18, fontWeight: 600 },
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
              const sign = p.value >= 0 ? "+" : "";
              const color = p.value >= 0 ? "#4ECDC4" : "#E63946";
              html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
                <span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span>
                <span>${p.seriesName}:</span>
                <span style="font-weight:600;color:${color}">${sign}${p.value.toFixed(2)}%</span>
              </div>`;
            }
          });
          return html;
        },
      },
      legend: {
        bottom: 10,
        textStyle: { color: c.textMuted, fontSize: 12 },
        icon: "circle",
      },
      grid: { left: 60, right: 30, top: 60, bottom: 60 },
      xAxis: {
        type: "category",
        data: years.map(String),
        axisLine: { lineStyle: { color: c.axisLine } },
        axisLabel: { color: c.textDim, fontSize: 11, rotate: 45 },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: c.splitLine } },
        axisLabel: {
          color: c.textFaint,
          fontSize: 11,
          formatter: (v: number) => `${v}%`,
        },
      },
      series,
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, title]);

  useEffect(() => {
    buildChart();
  }, [buildChart]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") {
          buildChart();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [buildChart]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return <div ref={chartRef} className="h-[420px] w-full rounded-2xl border border-glass-border bg-glass/50 p-4" />;
}
