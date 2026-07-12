import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#ff7e47', '#4ade80', '#60a5fa', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function CustomerInsightsTab({ bills, loading }) {
  const [avgItemsPerBill, setAvgItemsPerBill] = useState(0);
  const [orderSizeDistribution, setOrderSizeDistribution] = useState([]);
  const [peakDays, setPeakDays] = useState([]);
  const [categoryByTime, setCategoryByTime] = useState([]);
  const [billValueRanges, setBillValueRanges] = useState([]);
  const [repeatPatterns, setRepeatPatterns] = useState([]);

  useEffect(() => {
    if (bills.length > 0) {
      calculateAvgItemsPerBill();
      calculateOrderSizeDistribution();
      calculatePeakDays();
      calculateCategoryByTime();
      calculateBillValueRanges();
      calculateRepeatPatterns();
    }
  }, [bills]);

  const calculateAvgItemsPerBill = () => {
    const totalItems = bills.reduce((sum, bill) => {
      return sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);
    
    const avg = bills.length > 0 ? (totalItems / bills.length).toFixed(1) : 0;
    setAvgItemsPerBill(avg);
  };

  const calculateOrderSizeDistribution = () => {
    const ranges = [
      { range: '1-2 items', min: 1, max: 2, count: 0 },
      { range: '3-4 items', min: 3, max: 4, count: 0 },
      { range: '5-6 items', min: 5, max: 6, count: 0 },
      { range: '7-8 items', min: 7, max: 8, count: 0 },
      { range: '9+ items', min: 9, max: 999, count: 0 }
    ];

    bills.forEach(bill => {
      const totalItems = bill.items.reduce((sum, item) => sum + item.qty, 0);
      const range = ranges.find(r => totalItems >= r.min && totalItems <= r.max);
      if (range) range.count++;
    });

    setOrderSizeDistribution(ranges);
  };

  const calculatePeakDays = () => {
  const dayMap = {};
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  bills.forEach(bill => {
    const day = bill.day_of_week;
    if (!dayMap[day]) {
      dayMap[day] = { day, orders: 0, revenue: 0 };
    }
    dayMap[day].orders += 1;
    dayMap[day].revenue += parseFloat(bill.total);
  });

  // Sort by revenue first (primary), then by orders (secondary)
  const data = Object.values(dayMap).sort((a, b) => {
    // First compare by revenue
    if (b.revenue !== a.revenue) {
      return b.revenue - a.revenue;
    }
    // If revenue is equal, compare by orders
    return b.orders - a.orders;
  });
  
  setPeakDays(data);
};

  const calculateCategoryByTime = () => {
    const timeSlots = {
      'Morning (6-11)': { time: 'Morning', hours: [6, 7, 8, 9, 10, 11] },
      'Lunch (12-15)': { time: 'Lunch', hours: [12, 13, 14, 15] },
      'Evening (16-19)': { time: 'Evening', hours: [16, 17, 18, 19] },
      'Dinner (20-23)': { time: 'Dinner', hours: [20, 21, 22, 23] }
    };

    const categoryData = {};

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      let timeSlot = null;

      for (const [key, slot] of Object.entries(timeSlots)) {
        if (slot.hours.includes(hour)) {
          timeSlot = slot.time;
          break;
        }
      }

      if (!timeSlot) return;

      bill.items.forEach(item => {
        const category = getCategoryForItem(item.name);
        const key = `${timeSlot}-${category}`;
        
        if (!categoryData[key]) {
          categoryData[key] = { time: timeSlot, category, quantity: 0 };
        }
        categoryData[key].quantity += item.qty;
      });
    });

    const data = Object.values(categoryData);
    setCategoryByTime(data);
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

  const calculateBillValueRanges = () => {
    const ranges = [
      { range: '₹0-100', min: 0, max: 100, count: 0 },
      { range: '₹101-200', min: 101, max: 200, count: 0 },
      { range: '₹201-300', min: 201, max: 300, count: 0 },
      { range: '₹301-500', min: 301, max: 500, count: 0 },
      { range: '₹501+', min: 501, max: 999999, count: 0 }
    ];

    bills.forEach(bill => {
      const total = parseFloat(bill.total);
      const range = ranges.find(r => total >= r.min && total <= r.max);
      if (range) range.count++;
    });

    setBillValueRanges(ranges);
  };

  const calculateRepeatPatterns = () => {
    const dayMap = {};

    bills.forEach(bill => {
      const day = bill.day_of_week;
      if (!dayMap[day]) {
        dayMap[day] = { day, bills: 0, avgBill: 0, totalRevenue: 0 };
      }
      dayMap[day].bills += 1;
      dayMap[day].totalRevenue += parseFloat(bill.total);
    });

    Object.values(dayMap).forEach(day => {
      day.avgBill = day.bills > 0 ? (day.totalRevenue / day.bills).toFixed(0) : 0;
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const data = daysOrder.map(d => dayMap[d]).filter(Boolean);
    
    setRepeatPatterns(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading customer insights...</div>
      </div>
    );
  }

  // Prepare radar chart data
  const categories = [...new Set(categoryByTime.map(d => d.category))];
  const radarData = categories.map(cat => {
    const morning = categoryByTime.find(d => d.time === 'Morning' && d.category === cat)?.quantity || 0;
    const lunch = categoryByTime.find(d => d.time === 'Lunch' && d.category === cat)?.quantity || 0;
    const evening = categoryByTime.find(d => d.time === 'Evening' && d.category === cat)?.quantity || 0;
    const dinner = categoryByTime.find(d => d.time === 'Dinner' && d.category === cat)?.quantity || 0;
    
    return {
      category: cat,
      Morning: morning,
      Lunch: lunch,
      Evening: evening,
      Dinner: dinner
    };
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon="📦"
          title="Avg Items/Bill"
          value={avgItemsPerBill}
          color="bg-blue-500"
        />
        <MetricCard
          icon="💰"
          title="Avg Bill Value"
          value={`₹${bills.length > 0 ? (bills.reduce((sum, b) => sum + parseFloat(b.total), 0) / bills.length).toFixed(0) : 0}`}
          color="bg-green-500"
        />
        <MetricCard
          icon="🎯"
          title="Most Popular Day"
          value={peakDays[0]?.day || 'N/A'}
          color="bg-orange-500"
        />
        <MetricCard
          icon="📈"
          title="Total Orders"
          value={bills.length}
          color="bg-purple-500"
        />
      </div>

      {/* Order Size Distribution */}
      <ChartCard title="📊 Order Size Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={orderSizeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#ff7e47" name="Number of Orders" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bill Value Ranges */}
      <ChartCard title="💵 Bill Value Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={billValueRanges}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.range}: ${entry.count}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {billValueRanges.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Peak Days Pattern */}
      <ChartCard title="📅 Weekly Order Pattern">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={repeatPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="bills" fill="#4ade80" name="Orders" />
            <Bar yAxisId="right" dataKey="avgBill" fill="#60a5fa" name="Avg Bill (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Category Preference by Time - Radar Chart */}
      <ChartCard title="⏰ Category Preference by Time of Day">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis />
            <Radar name="Morning" dataKey="Morning" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.6} />
            <Radar name="Lunch" dataKey="Lunch" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            <Radar name="Evening" dataKey="Evening" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
            <Radar name="Dinner" dataKey="Dinner" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Peak Days Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Day-wise Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Bill</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Rank</th>
              </tr>
            </thead>
            <tbody>
              {peakDays.map((day, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    index === 0 ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{day.day}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{day.orders}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    ₹{day.revenue.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600">
                    ₹{(day.revenue / day.orders).toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Behavior Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          title="Small Orders"
          subtitle="1-2 items"
          value={`${orderSizeDistribution[0]?.count || 0} orders`}
          percentage={`${((orderSizeDistribution[0]?.count || 0) / bills.length * 100).toFixed(0)}%`}
          color="bg-blue-100 text-blue-600"
        />
        <InsightCard
          title="Medium Orders"
          subtitle="3-6 items"
          value={`${(orderSizeDistribution[1]?.count || 0) + (orderSizeDistribution[2]?.count || 0)} orders`}
          percentage={`${(((orderSizeDistribution[1]?.count || 0) + (orderSizeDistribution[2]?.count || 0)) / bills.length * 100).toFixed(0)}%`}
          color="bg-green-100 text-green-600"
        />
        <InsightCard
          title="Large Orders"
          subtitle="7+ items"
          value={`${(orderSizeDistribution[3]?.count || 0) + (orderSizeDistribution[4]?.count || 0)} orders`}
          percentage={`${(((orderSizeDistribution[3]?.count || 0) + (orderSizeDistribution[4]?.count || 0)) / bills.length * 100).toFixed(0)}%`}
          color="bg-orange-100 text-orange-600"
        />
      </div>
    </div>
  );
}

const ChartCard = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
    {children}
  </motion.div>
);

const MetricCard = ({ icon, title, value, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl mb-3`}>
      {icon}
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </motion.div>
);

const InsightCard = ({ title, subtitle, value, percentage, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
    <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {percentage}
    </div>
  </motion.div>
);