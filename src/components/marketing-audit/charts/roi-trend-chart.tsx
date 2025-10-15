/**
 * ROI Trend Chart Component
 * 
 * Phase 3: Visualize ROI trends over time using Chart.js.
 * UX Focus: See ROI improvements, identify successful periods.
 */

'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface ROITrendChartProps {
  data: Array<{
    date: string;
    roi_percent: number;
    revenue: number;
    cost: number;
  }>;
}

export function ROITrendChart({ data }: ROITrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    // Create new chart
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
          {
            label: 'ROI %',
            data: data.map(d => d.roi_percent),
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#8B5CF6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const point = data[index];
                return [
                  `ROI: ${point.roi_percent.toFixed(1)}%`,
                  `Revenue: $${point.revenue.toLocaleString()}`,
                  `Cost: $${point.cost.toLocaleString()}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value}%`,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
        },
      },
    };
    
    chartRef.current = new Chart(ctx, config);
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">
        No ROI data available yet. Run more audits to see trends.
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        ROI Trend
      </h3>
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

