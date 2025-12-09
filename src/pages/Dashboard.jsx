import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Calendar, TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
// import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { supabase } from '../config/supabase';

const COLORS = ['#ff7e47', '#4ade80', '#60a5fa', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [stats, setStats] = useState({
    totalSales: 0,
    billsCount: 0,
    avgBill: 0,
    itemsSold: 0
  });
  const [salesByHour, setSalesByHour] = useState([]);
  const [salesByDay, setSalesByDay] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [leastItems, setLeastItems] = useState([]);
  const [revenueByItem, setRevenueByItem] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [dateRange, customStartDate, customEndDate]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'last7days':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'last30days':
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return null;
        startDate = startOfDay(parseISO(customStartDate));
        endDate = endOfDay(parseISO(customEndDate));
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const dateFilter = getDateFilter();
      if (!dateFilter) return;

      const { data: bills, error } = await supabase
        .from('completed_bills')
        .select('*')
        .gte('completed_at', dateFilter.startDate)
        .lte('completed_at', dateFilter.endDate)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      calculateStats(bills);
      calculateSalesByHour(bills);
      calculateSalesByDay(bills);
      calculateTopItems(bills);
      calculateCategoryBreakdown(bills);
      calculatePeakHours(bills);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bills) => {
    const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
    const billsCount = bills.length;
    const avgBill = billsCount > 0 ? totalSales / billsCount : 0;
    const itemsSold = bills.reduce((sum, bill) => {
      return sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);

    setStats({ totalSales, billsCount, avgBill, itemsSold });
  };

  const calculateSalesByHour = (bills) => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0,
      count: 0
    }));

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      hourlyData[hour].sales += parseFloat(bill.total);
      hourlyData[hour].count += 1;
    });

    setSalesByHour(hourlyData.filter(h => h.sales > 0));
  };

  const calculateSalesByDay = (bills) => {
    const dayMap = {};
    
    bills.forEach(bill => {
      const day = bill.day_of_week;
      if (!dayMap[day]) {
        dayMap[day] = { day, sales: 0, count: 0 };
      }
      dayMap[day].sales += parseFloat(bill.total);
      dayMap[day].count += 1;
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedData = daysOrder
      .map(day => dayMap[day])
      .filter(Boolean);

    setSalesByDay(sortedData);
  };

  const calculateTopItems = (bills) => {
    const itemMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const key = `${item.name} (${item.portion})`;
        if (!itemMap[key]) {
          itemMap[key] = { name: key, quantity: 0, revenue: 0 };
        }
        itemMap[key].quantity += item.qty;
        itemMap[key].revenue += item.price * item.qty;
      });
    });

    const items = Object.values(itemMap);
    const sortedByQty = [...items].sort((a, b) => b.quantity - a.quantity);
    const sortedByRevenue = [...items].sort((a, b) => b.revenue - a.revenue);

    setTopItems(sortedByQty.slice(0, 10));
    setLeastItems(sortedByQty.slice(-10).reverse());
    setRevenueByItem(sortedByRevenue.slice(0, 10));
  };

  const calculateCategoryBreakdown = (bills) => {
    const categoryMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        // You'll need to map items to categories - for now using a simple approach
        const category = getCategoryForItem(item.name);
        if (!categoryMap[category]) {
          categoryMap[category] = { name: category, value: 0 };
        }
        categoryMap[category].value += item.price * item.qty;
      });
    });

    setCategoryBreakdown(Object.values(categoryMap));
  };

  const getCategoryForItem = (itemName) => {
    // Simple category mapping - you can enhance this
    if (itemName.includes('Dabeli') || itemName.includes('Pav')) return 'Dabeli & Pavbhaji';
    if (itemName.includes('Manchuri') || itemName.includes('Veg') || itemName.includes('Crispy')) return 'Manchurian';
    if (itemName.includes('Rice')) return 'Rice';
    if (itemName.includes('Noodles')) return 'Noodles';
    if (itemName.includes('Paneer')) return 'Paneer';
    if (itemName.includes('Soup')) return 'Soup';
    if (itemName.includes('Drink') || itemName.includes('Water')) return 'Drinks';
    if (itemName.includes('Ice-cream')) return 'Ice-cream';
    return 'Other';
  };

  const calculatePeakHours = (bills) => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      orders: 0
    }));

    bills.forEach(bill => {
      hourlyData[bill.hour_of_day].orders += 1;
    });

    const sorted = hourlyData
      .filter(h => h.orders > 0)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    setPeakHours(sorted);
  };

  const exportToPDF = () => {
  const doc = new jsPDF();
  const dateRangeText = dateRange === 'custom' 
    ? `${customStartDate} to ${customEndDate}`
    : dateRange.replace(/([A-Z])/g, ' $1').trim();

  // Title
  doc.setFontSize(20);
  doc.text('Sales Analytics Report', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Period: ${dateRangeText}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 37);

  // Summary Stats
  doc.setFontSize(14);
  doc.text('Summary', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value']],
    body: [
      ['Total Sales', `₹${stats.totalSales.toFixed(2)}`],
      ['Number of Bills', stats.billsCount.toString()],
      ['Average Bill', `₹${stats.avgBill.toFixed(2)}`],
      ['Items Sold', stats.itemsSold.toString()]
    ]
  });

  // Top Selling Items
  let finalY = doc.lastAutoTable.finalY + 10;
  doc.text('Top Selling Items', 14, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Item', 'Quantity', 'Revenue']],
    body: topItems.map(item => [
      item.name,
      item.quantity.toString(),
      `₹${item.revenue.toFixed(2)}`
    ])
  });

  // Peak Hours
  finalY = doc.lastAutoTable.finalY + 10;
  doc.text('Peak Hours', 14, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Time', 'Orders']],
    body: peakHours.map(ph => [ph.hour, ph.orders.toString()])
  });

  // Category Breakdown
  if (categoryBreakdown.length > 0) {
    finalY = doc.lastAutoTable.finalY + 10;
    doc.text('Category Breakdown', 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Category', 'Revenue']],
      body: categoryBreakdown.map(cat => [
        cat.name,
        `₹${cat.value.toFixed(2)}`
      ])
    });
  }

  // Revenue by Item
  if (revenueByItem.length > 0) {
    finalY = doc.lastAutoTable.finalY + 10;
    
    // Check if we need a new page
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.text('Revenue by Item (Top 10)', 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Item', 'Quantity', 'Revenue']],
      body: revenueByItem.map(item => [
        item.name,
        item.quantity.toString(),
        `₹${item.revenue.toFixed(2)}`
      ])
    });
  }

  doc.save(`sales-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

  if (loading && stats.totalSales === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Sales Analytics & Reports</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </>
              )}

              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Download size={20} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<DollarSign />}
            title="Total Sales"
            value={`₹${stats.totalSales.toFixed(2)}`}
            color="bg-green-500"
            delay={0}
          />
          <StatCard
            icon={<ShoppingBag />}
            title="Bills Count"
            value={stats.billsCount}
            color="bg-blue-500"
            delay={0.1}
          />
          <StatCard
            icon={<TrendingUp />}
            title="Average Bill"
            value={`₹${stats.avgBill.toFixed(2)}`}
            color="bg-purple-500"
            delay={0.2}
          />
          <StatCard
            icon={<Users />}
            title="Items Sold"
            value={stats.itemsSold}
            color="bg-orange-500"
            delay={0.3}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales by Hour */}
          <ChartCard title="Sales by Hour">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#ff7e47" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sales by Day */}
          <ChartCard title="Revenue by Day of Week">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category Breakdown */}
          <ChartCard title="Category Breakdown">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value.toFixed(0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak Hours */}
          <ChartCard title="Peak Hours (Most Orders)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Selling Items */}
          <TableCard title="Top Selling Items" items={topItems} type="quantity" />
          
          {/* Revenue by Item */}
          <TableCard title="Revenue by Item" items={revenueByItem} type="revenue" />
          
          {/* Least Selling Items */}
          <TableCard title="Least Selling Items" items={leastItems} type="quantity" />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
const StatCard = ({ icon, title, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <motion.p
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2 }}
          className="text-2xl font-bold text-gray-900"
        >
          {value}
        </motion.p>
      </div>
      <div className={`${color} p-3 rounded-lg text-white`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

// Chart Card Component
const ChartCard = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
    {children}
  </motion.div>
);

// Table Card Component
const TableCard = ({ title, items, type }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
        >
          <div>
            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
          </div>
          <div className="text-right">
            {type === 'revenue' && (
              <p className="font-bold text-orange-600">₹{item.revenue.toFixed(2)}</p>
            )}
            {type === 'quantity' && (
              <p className="font-bold text-blue-600">{item.quantity}x</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);