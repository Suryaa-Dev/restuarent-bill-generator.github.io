import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, TrendingUp, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['#ff7e47', '#4ade80', '#60a5fa', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function OverviewTab({ bills, loading }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    billsCount: 0,
    avgBill: 0,
    itemsSold: 0,
    comparisons: {
      sales: 0,
      bills: 0,
      avg: 0,
      items: 0
    }
  });
  const [salesByHour, setSalesByHour] = useState([]);
  const [salesByDay, setSalesByDay] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    if (bills.length > 0) {
      calculateStats();
      calculateSalesByHour();
      calculateSalesByDay();
      calculateTopItems();
      calculateCategoryBreakdown();
      calculatePeakHours();
    }
  }, [bills]);

  const calculateStats = () => {
    const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
    const billsCount = bills.length;
    const avgBill = billsCount > 0 ? totalSales / billsCount : 0;
    const itemsSold = bills.reduce((sum, bill) => {
      return sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);

    // Calculate comparisons (vs yesterday for today view)
    // This is simplified - you can make it more sophisticated
    const comparisons = {
      sales: 12, // +12% example
      bills: 5,
      avg: -3,
      items: 8
    };

    setStats({ totalSales, billsCount, avgBill, itemsSold, comparisons });
  };

  const calculateSalesByHour = () => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0
    }));

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      hourlyData[hour].sales += parseFloat(bill.total);
    });

    setSalesByHour(hourlyData.filter(h => h.sales > 0));
  };

  const calculateSalesByDay = () => {
    const dayMap = {};
    
    bills.forEach(bill => {
      const day = bill.day_of_week;
      if (!dayMap[day]) {
        dayMap[day] = { day, sales: 0 };
      }
      dayMap[day].sales += parseFloat(bill.total);
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedData = daysOrder.map(day => dayMap[day]).filter(Boolean);

    setSalesByDay(sortedData);
  };

  const calculateTopItems = () => {
    const itemMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const key = `${item.name} (${item.portion})`;
        if (!itemMap[key]) {
          itemMap[key] = { name: key, quantity: 0 };
        }
        itemMap[key].quantity += item.qty;
      });
    });

    const sorted = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
    setTopItems(sorted.slice(0, 10));
  };

  const calculateCategoryBreakdown = () => {
    const categoryMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
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

  const calculatePeakHours = () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading overview...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<DollarSign />}
          title="Total Sales"
          value={`₹${stats.totalSales.toFixed(2)}`}
          change={stats.comparisons.sales}
          color="bg-green-500"
          delay={0}
        />
        <StatCard
          icon={<ShoppingBag />}
          title="Bills Count"
          value={stats.billsCount}
          change={stats.comparisons.bills}
          color="bg-blue-500"
          delay={0.1}
        />
        <StatCard
          icon={<TrendingUp />}
          title="Average Bill"
          value={`₹${stats.avgBill.toFixed(2)}`}
          change={stats.comparisons.avg}
          color="bg-purple-500"
          delay={0.2}
        />
        <StatCard
          icon={<Users />}
          title="Items Sold"
          value={stats.itemsSold}
          change={stats.comparisons.items}
          color="bg-orange-500"
          delay={0.3}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* <ChartCard title="Sales by Hour">
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
        </ChartCard> */}

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

      {/* Top Items Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Items</h3>
        <div className="space-y-3">
          {topItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                </div>
              </div>
              <span className="font-bold text-orange-600">{item.quantity}x</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Stat Card with Comparison
const StatCard = ({ icon, title, value, change, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`${color} p-3 rounded-lg text-white`}>
        {icon}
      </div>
      {change !== 0 && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <motion.p
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: delay + 0.2 }}
      className="text-2xl font-bold text-gray-900"
    >
      {value}
    </motion.p>
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