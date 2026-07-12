import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

export default function TimeAnalyticsTab({ bills, loading }) {
  const [salesVelocity, setSalesVelocity] = useState([]);
  const [monthOverMonth, setMonthOverMonth] = useState([]);
  const [weekOverWeek, setWeekOverWeek] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [hourlyVelocity, setHourlyVelocity] = useState([]);

  useEffect(() => {
    if (bills.length > 0) {
      calculateSalesVelocity();
      calculateMonthOverMonth();
      calculateWeekOverWeek();
      calculateHeatmapData();
      calculateBusySlots();
      calculateHourlyVelocity();
    }
  }, [bills]);

  const calculateSalesVelocity = () => {
    // Orders per hour during different time periods
    const rushHours = [12, 13, 19, 20, 21]; // Lunch and dinner
    const normalHours = [10, 11, 14, 15, 16, 17, 18];
    
    const velocityData = [];
    
    [...rushHours, ...normalHours].forEach(hour => {
      const hourBills = bills.filter(b => b.hour_of_day === hour);
      const ordersPerMinute = hourBills.length > 0 ? (hourBills.length / 60).toFixed(2) : 0;
      
      velocityData.push({
        hour: `${hour}:00`,
        ordersPerHour: hourBills.length,
        ordersPerMinute: parseFloat(ordersPerMinute),
        type: rushHours.includes(hour) ? 'Rush' : 'Normal'
      });
    });

    setSalesVelocity(velocityData.sort((a, b) => parseInt(a.hour) - parseInt(b.hour)));
  };

  const calculateMonthOverMonth = () => {
    // Group bills by month
    const monthMap = {};
    
    bills.forEach(bill => {
      const month = format(new Date(bill.completed_at), 'MMM yyyy');
      if (!monthMap[month]) {
        monthMap[month] = { month, sales: 0, orders: 0 };
      }
      monthMap[month].sales += parseFloat(bill.total);
      monthMap[month].orders += 1;
    });

    const data = Object.values(monthMap).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );

    setMonthOverMonth(data);
  };

  const calculateWeekOverWeek = () => {
    // Group by week
    const weekMap = {};
    
    bills.forEach(bill => {
      const date = new Date(bill.completed_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekLabel = format(weekStart, 'MMM dd');
      
      if (!weekMap[weekLabel]) {
        weekMap[weekLabel] = { week: weekLabel, sales: 0, orders: 0 };
      }
      weekMap[weekLabel].sales += parseFloat(bill.total);
      weekMap[weekLabel].orders += 1;
    });

    const data = Object.values(weekMap);
    setWeekOverWeek(data);
  };

  const calculateHeatmapData = () => {
    // Create heatmap data for last 90 days
    const dateMap = {};
    
    bills.forEach(bill => {
      const date = format(new Date(bill.completed_at), 'yyyy-MM-dd');
      if (!dateMap[date]) {
        dateMap[date] = 0;
      }
      dateMap[date] += parseFloat(bill.total);
    });

    const heatData = Object.entries(dateMap).map(([date, count]) => ({
      date,
      count: Math.round(count)
    }));

    setHeatmapData(heatData);
  };

  const calculateBusySlots = () => {
    // Hour x Day matrix
    const matrix = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    bills.forEach(bill => {
      const day = bill.day_of_week;
      const hour = bill.hour_of_day;
      const key = `${day}-${hour}`;
      
      if (!matrix[key]) {
        matrix[key] = { day, hour, orders: 0 };
      }
      matrix[key].orders += 1;
    });

    const data = Object.values(matrix);
    setBusySlots(data);
  };

  const calculateHourlyVelocity = () => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      orders: 0,
      revenue: 0
    }));

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += parseFloat(bill.total);
    });

    setHourlyVelocity(hourlyData.filter(h => h.orders > 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading time analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sales Velocity */}
      <ChartCard title="⚡ Sales Velocity (Orders per Hour)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesVelocity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ordersPerHour" fill="#ff7e47" name="Orders/Hour" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Peak Velocity</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.max(...salesVelocity.map(s => s.ordersPerHour))} orders/hr
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Average Velocity</p>
            <p className="text-2xl font-bold text-blue-600">
              {(salesVelocity.reduce((sum, s) => sum + s.ordersPerHour, 0) / salesVelocity.length).toFixed(1)} orders/hr
            </p>
          </div>
        </div>
      </ChartCard>

      {/* Month over Month */}
      <ChartCard title="📈 Month-over-Month Growth">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthOverMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="sales" stroke="#4ade80" fill="#4ade8050" name="Sales (₹)" />
            <Area type="monotone" dataKey="orders" stroke="#60a5fa" fill="#60a5fa50" name="Orders" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Week over Week */}
      <ChartCard title="📊 Week-over-Week Comparison">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weekOverWeek}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#ff7e47" strokeWidth={2} name="Sales (₹)" />
            <Line type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} name="Orders" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Hourly Revenue & Orders */}
      <ChartCard title="⏰ Hourly Performance">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyVelocity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#4ade80" name="Revenue (₹)" />
            <Bar yAxisId="right" dataKey="orders" fill="#f59e0b" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Heat Map Calendar */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔥 Sales Heat Map (Last 90 Days)</h3>
        <div className="overflow-x-auto">
          <CalendarHeatmap
            startDate={subDays(new Date(), 90)}
            endDate={new Date()}
            values={heatmapData}
            classForValue={(value) => {
              if (!value || value.count === 0) return 'color-empty';
              if (value.count < 1000) return 'color-scale-1';
              if (value.count < 3000) return 'color-scale-2';
              if (value.count < 5000) return 'color-scale-3';
              return 'color-scale-4';
            }}
            tooltipDataAttrs={(value) => {
              return {
                'data-tip': value.date
                  ? `${format(new Date(value.date), 'MMM dd, yyyy')}: ₹${value.count}`
                  : 'No data'
              };
            }}
          />
        </div>
        <style jsx>{`
          .color-empty { fill: #ebedf0; }
          .color-scale-1 { fill: #c6e48b; }
          .color-scale-2 { fill: #7bc96f; }
          .color-scale-3 { fill: #239a3b; }
          .color-scale-4 { fill: #196127; }
        `}</style>
      </div>

      {/* Best Performing Times */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox
          title="🌅 Best Morning Hour"
          value={getBestHour(hourlyVelocity, [6, 7, 8, 9, 10, 11])}
          color="bg-yellow-500"
        />
        <StatBox
          title="☀️ Best Afternoon Hour"
          value={getBestHour(hourlyVelocity, [12, 13, 14, 15, 16, 17])}
          color="bg-orange-500"
        />
        <StatBox
          title="🌙 Best Evening Hour"
          value={getBestHour(hourlyVelocity, [18, 19, 20, 21, 22])}
          color="bg-purple-500"
        />
      </div>
    </div>
  );
}

const getBestHour = (data, hours) => {
  const filtered = data.filter(d => {
    const hour = parseInt(d.hour);
    return hours.includes(hour);
  });
  
  if (filtered.length === 0) return 'N/A';
  
  const best = filtered.reduce((max, curr) => 
    curr.revenue > max.revenue ? curr : max
  );
  
  return `${best.hour} (₹${best.revenue.toFixed(0)})`;
};

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

const StatBox = ({ title, value, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl mb-3`}>
      ⏰
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-xl font-bold text-gray-900">{value}</p>
  </motion.div>
);