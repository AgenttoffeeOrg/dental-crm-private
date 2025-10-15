/**
 * Chart to Image Converter
 * 
 * Phase 4: Convert Chart.js charts to images for PDF inclusion.
 * Architecture: Canvas rendering to PNG/JPEG.
 */

import { Chart } from 'chart.js';

export class ChartToImage {
  /**
   * Convert Chart.js instance to image data URL
   */
  static async chartToDataURL(chart: Chart, format: 'png' | 'jpeg' = 'png'): Promise<string> {
    const canvas = chart.canvas;
    return canvas.toDataURL(`image/${format}`, 0.9);
  }
  
  /**
   * Convert Chart.js instance to Buffer (for server-side)
   */
  static async chartToBuffer(chart: Chart): Promise<Buffer> {
    const dataURL = await this.chartToDataURL(chart);
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }
  
  /**
   * Create score visualization as image
   */
  static async createScoreVisualization(
    score: number,
    width: number = 300,
    height: number = 300
  ): Promise<string> {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Draw circular progress
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * (score / 100));
    
    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Progress circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    
    // Color based on score
    if (score >= 80) ctx.strokeStyle = '#10B981'; // green
    else if (score >= 60) ctx.strokeStyle = '#F59E0B'; // yellow
    else ctx.strokeStyle = '#EF4444'; // red
    
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Score text
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score.toFixed(1), centerX, centerY);
    
    return canvas.toDataURL('image/png');
  }
  
  /**
   * Create trend chart as image
   */
  static async createTrendChart(
    data: Array<{ date: string; score: number }>,
    width: number = 600,
    height: number = 200
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Simple line chart
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const scores = data.map(d => d.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore || 1;
    
    // Draw axes
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw line
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = height - padding - ((point.score - minScore) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#8B5CF6';
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = height - padding - ((point.score - minScore) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    return canvas.toDataURL('image/png');
  }
}

