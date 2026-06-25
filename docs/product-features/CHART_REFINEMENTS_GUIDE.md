# 📊 **CHART & DATA VISUALIZATION GUIDE**

**Version:** 1.0  
**Date:** October 16, 2025  
**Purpose:** Consistent, accessible, beautiful charts across all analytics

---

## 🎨 **COLOR PALETTE (Color-Blind Safe)**

### **Primary Chart Colors**

```tsx
// From design tokens (OKLCH)
const chartColors = {
  chart1: 'oklch(0.60 0.20 250)', // Blue
  chart2: 'oklch(0.65 0.18 160)', // Green
  chart3: 'oklch(0.70 0.15 60)',  // Amber
  chart4: 'oklch(0.65 0.20 300)', // Purple
  chart5: 'oklch(0.65 0.18 350)', // Pink
}

// Usage in Recharts
<Line dataKey="revenue" stroke="hsl(var(--chart-1))" />
<Line dataKey="expenses" stroke="hsl(var(--chart-2))" />
```

### **Semantic Colors**

```tsx
// Success/Positive Trend
const positive = '#10B981' // green-600

// Warning/Neutral Trend
const warning = '#F59E0B' // yellow-600

// Danger/Negative Trend
const danger = '#EF4444' // red-600
```

### **Color Blind Testing**
✅ Tested with Deuteranopia, Protanopia, Tritanopia
✅ All colors distinguishable in grayscale
✅ Patterns/textures available as fallback

---

## 📐 **CHART STYLING**

### **Grid Lines**

```tsx
<CartesianGrid 
  strokeDasharray="3 3" 
  stroke="oklch(0.95 0 0)" 
  strokeWidth={0.5}
  vertical={false} // Usually hide vertical lines
/>
```

### **Axis Styling**

```tsx
<XAxis
  dataKey="date"
  tick={{ 
    fill: 'oklch(0.556 0 0)',  // gray-600
    fontSize: 12,
    fontWeight: 400 
  }}
  tickLine={{ stroke: 'oklch(0.90 0 0)' }}
  axisLine={{ stroke: 'oklch(0.90 0 0)' }}
/>

<YAxis
  tick={{ 
    fill: 'oklch(0.556 0 0)',
    fontSize: 12,
    fontWeight: 400 
  }}
  tickLine={false}
  axisLine={false}
  tickFormatter={(value) => formatCurrency(value, 'USD', false)}
/>
```

### **Tooltips**

```tsx
<Tooltip
  contentStyle={{
    backgroundColor: 'oklch(0.20 0 0)', // dark
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 6px 12px -2px rgb(0 0 0 / 0.15)',
    padding: '12px',
    fontSize: '13px',
    color: 'oklch(1 0 0)', // white
  }}
  formatter={(value, name) => [formatCurrency(value), name]}
  labelFormatter={(label) => formatDate(label, 'medium')}
/>
```

### **Legends**

```tsx
<Legend
  verticalAlign="top"
  height={36}
  iconType="circle"
  wrapperStyle={{
    paddingBottom: '20px',
    fontSize: '13px',
    fontWeight: 500,
  }}
/>
```

---

## 📊 **CHART TYPES & USAGE**

### **Line Chart (Trends Over Time)**

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis tickFormatter={(v) => formatCompact(v)} />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="revenue" 
      stroke="hsl(var(--chart-1))"
      strokeWidth={2}
      dot={{ r: 3 }}
      activeDot={{ r: 5 }}
    />
  </LineChart>
</ResponsiveContainer>
```

**When to use:**
- Revenue trends
- User growth
- Performance metrics over time

### **Bar Chart (Comparisons)**

```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="category" />
    <YAxis tickFormatter={(v) => formatCurrency(v, 'USD', false)} />
    <Tooltip />
    <Legend />
    <Bar 
      dataKey="value" 
      fill="hsl(var(--chart-1))" 
      radius={[8, 8, 0, 0]} // Rounded top corners
    />
  </BarChart>
</ResponsiveContainer>
```

**When to use:**
- Category comparisons
- Rankings
- Period-over-period comparisons

### **Area Chart (Volume Trends)**

```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Area 
      type="monotone" 
      dataKey="revenue" 
      stroke="hsl(var(--chart-1))"
      fillOpacity={1}
      fill="url(#colorRevenue)"
    />
  </AreaChart>
</ResponsiveContainer>
```

**When to use:**
- Cumulative values
- Volume trends
- Multiple overlapping datasets

### **Pie/Donut Chart (Proportions)**

```tsx
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={data}
      cx="50%"
      cy="50%"
      innerRadius={60} // Donut style
      outerRadius={80}
      fill="hsl(var(--chart-1))"
      paddingAngle={2}
      dataKey="value"
      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
    >
      {data.map((entry, index) => (
        <Cell 
          key={`cell-${index}`} 
          fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
        />
      ))}
    </Pie>
    <Tooltip formatter={(value) => formatCurrency(value)} />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

**When to use:**
- Market share
- Budget allocation
- Category distribution
- **Limit to 5-7 categories max**

---

## 🎯 **BEST PRACTICES**

### **1. Consistent Heights**

```tsx
// Dashboard charts: 300px
<ResponsiveContainer width="100%" height={300}>

// Detail page charts: 400px
<ResponsiveContainer width="100%" height={400}>

// Small widget charts: 200px
<ResponsiveContainer width="100%" height={200}>
```

### **2. Number Formatting**

```tsx
// Always format Y-axis
<YAxis tickFormatter={(value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}} />

// Format tooltip values
<Tooltip formatter={(value) => formatCurrency(value)} />
```

### **3. Date Formatting**

```tsx
// X-axis dates
<XAxis 
  dataKey="date"
  tickFormatter={(date) => format(new Date(date), 'MMM d')}
/>

// Tooltip dates
<Tooltip 
  labelFormatter={(date) => format(new Date(date), 'MMMM d, yyyy')}
/>
```

### **4. Responsive Behavior**

```tsx
// Hide legend on mobile
<Legend 
  wrapperStyle={{ 
    display: window.innerWidth < 768 ? 'none' : 'block' 
  }} 
/>

// Reduce padding on mobile
<LineChart 
  margin={{ 
    top: 5, 
    right: window.innerWidth < 768 ? 5 : 20, 
    left: window.innerWidth < 768 ? 0 : 20, 
    bottom: 5 
  }}
>
```

### **5. Loading States**

```tsx
{loading ? (
  <div className="flex items-center justify-center h-[300px]">
    <LoadingState size="md" message="Loading chart data..." />
  </div>
) : (
  <ResponsiveContainer width="100%" height={300}>
    {/* Chart */}
  </ResponsiveContainer>
)}
```

### **6. Empty States**

```tsx
{data.length === 0 ? (
  <div className="flex items-center justify-center h-[300px] border border-dashed border-gray-300 rounded-lg">
    <div className="text-center">
      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">No data available</p>
      <p className="text-xs text-gray-500 mt-1">
        Data will appear here once available
      </p>
    </div>
  </div>
) : (
  <ResponsiveContainer width="100%" height={300}>
    {/* Chart */}
  </ResponsiveContainer>
)}
```

---

## 📱 **MOBILE OPTIMIZATION**

### **Simplify on Small Screens**

```tsx
const isMobile = window.innerWidth < 768

<LineChart
  data={data}
  margin={{
    top: 5,
    right: isMobile ? 5 : 20,
    left: isMobile ? -20 : 0, // Pull left on mobile
    bottom: 5,
  }}
>
  <XAxis 
    tick={{ fontSize: isMobile ? 10 : 12 }}
    interval={isMobile ? 'preserveStartEnd' : 0}
  />
  <YAxis 
    tick={{ fontSize: isMobile ? 10 : 12 }}
    width={isMobile ? 40 : 60}
  />
  {!isMobile && <Legend />}
</LineChart>
```

---

## ♿ **ACCESSIBILITY**

### **1. Provide Alternative Data Table**

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="chart">Chart View</TabsTrigger>
    <TabsTrigger value="table">Table View</TabsTrigger>
  </TabsList>
  <TabsContent value="chart">
    <ResponsiveContainer width="100%" height={300}>
      {/* Chart */}
    </ResponsiveContainer>
  </TabsContent>
  <TabsContent value="table">
    <Table>
      {/* Data table */}
    </Table>
  </TabsContent>
</Tabs>
```

### **2. Add ARIA Labels**

```tsx
<div role="img" aria-label="Line chart showing revenue trend from January to December 2025">
  <ResponsiveContainer width="100%" height={300}>
    {/* Chart */}
  </ResponsiveContainer>
</div>
```

### **3. Keyboard Navigation**

```tsx
// Make chart interactive elements keyboard accessible
<Bar 
  dataKey="value"
  onClick={(data, index) => handleClick(data, index)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(data, index)
    }
  }}
  tabIndex={0}
/>
```

---

## ✅ **CHART CHECKLIST**

- [ ] Colors from design system (`--chart-1` through `--chart-5`)
- [ ] Grid lines subtle (0.5px, dashed)
- [ ] Axis labels 12px, gray-600
- [ ] Tooltips dark background, 8px radius, proper shadow
- [ ] Numbers formatted (currency, compact notation)
- [ ] Dates formatted consistently
- [ ] Loading state shown
- [ ] Empty state handled
- [ ] Mobile responsive
- [ ] Alternative table view available
- [ ] ARIA labels present
- [ ] Legend clear and concise

---

**All charts in the CRM now follow these standards for consistency, accessibility, and professionalism.** ✅

