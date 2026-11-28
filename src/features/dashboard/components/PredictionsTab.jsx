import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Calendar, Package } from 'lucide-react';

export default function PredictionsTab({ bills, loading }) {
  const [tomorrowForecast, setTomorrowForecast] = useState(null);
  const [weeklyForecast, setWeeklyForecast] = useState([]);
  const [stockRecommendations, setStockRecommendations] = useState([]);
  const [demandPatterns, setDemandPatterns] = useState([]);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (bills.length > 0) {
      predictTomorrowSales();
      predictWeeklySales();
      generateStockRecommendations();
      analyzeDemandPatterns();
    }
  }, [bills]);

  const predictTomorrowSales = () => {
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const sameDayBills = bills.filter(b => b.day_of_week === todayName);

    if (sameDayBills.length === 0) {
      setTomorrowForecast({ sales: 0, orders: 0, confidence: 0 });
      return;
    }

    const avgSales = sameDayBills.reduce((sum, b) => sum + parseFloat(b.total), 0) / sameDayBills.length;
    const avgOrders = sameDayBills.length;

    const predictedSales = avgSales * 1.05;
    const predictedOrders = Math.round(avgOrders * 1.05);

    const confidenceLevel = Math.min(95, sameDayBills.length * 10);

    setTomorrowForecast({
      sales: predictedSales,
      orders: predictedOrders,
      confidence: confidenceLevel
    });

    setConfidence(confidenceLevel);
  };

  const predictWeeklySales = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const forecast = [];

    days.forEach(day => {
      const dayBills = bills.filter(b => b.day_of_week === day);

      if (dayBills.length > 0) {
        const avgSales = dayBills.reduce((sum, b) => sum + parseFloat(b.total), 0) / dayBills.length;
        const predictedSales = avgSales * 1.05;

        forecast.push({
          day,
          predicted: Math.round(predictedSales),
          historical: Math.round(avgSales)
        });
      } else {
        forecast.push({ day, predicted: 0, historical: 0 });
      }
    });

    setWeeklyForecast(forecast);
  };

  const generateStockRecommendations = () => {
    const itemMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, totalQty: 0, frequency: 0 };
        }
        itemMap[item.name].totalQty += item.qty;
        itemMap[item.name].frequency += 1;
      });
    });

    const recommendations = Object.values(itemMap)
      .map(item => ({
        name: item.name,
        avgDaily: (item.totalQty / bills.length * 1.2).toFixed(0),
        priority: item.frequency > bills.length * 0.3 ? 'High'
                : item.frequency > bills.length * 0.15 ? 'Medium'
                : 'Low'
      }))
      .sort((a, b) => b.avgDaily - a.avgDaily)
      .slice(0, 15);

    setStockRecommendations(recommendations);
  };

  const analyzeDemandPatterns = () => {
    const hourlyDemand = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      avgOrders: 0,
      count: 0
    }));

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      hourlyDemand[hour].avgOrders += 1;
      hourlyDemand[hour].count += 1;
    });

    const patterns = hourlyDemand
      .filter(h => h.avgOrders > 0)
      .map(h => ({
        hour: h.hour,
        demand: h.avgOrders,
        intensity: h.avgOrders > 5 ? 'High' : h.avgOrders > 2 ? 'Medium' : 'Low'
      }));

    setDemandPatterns(patterns);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Analyzing patterns...</div>
      </div>
    );
  }

  if (bills.length < 5) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle size={64} className="text-gray-400 mb-4" />
        <p className="text-xl text-gray-600 mb-2">Not Enough Data</p>
        <p className="text-sm text-gray-500">Need at least 5 completed bills to generate predictions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      {/* Tomorrow Forecast */}
      <div className="bg-linear-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={32} />
          <h2 className="text-2xl font-bold">Tomorrow's Forecast</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-purple-100 mb-1">Predicted Sales</p>
            <p className="text-4xl font-bold">₹{tomorrowForecast?.sales.toFixed(0)}</p>
          </div>

          <div>
            <p className="text-purple-100 mb-1">Expected Orders</p>
            <p className="text-4xl font-bold">{tomorrowForecast?.orders}</p>
          </div>

          <div>
            <p className="text-purple-100 mb-1">Confidence</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white bg-opacity-20 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <p className="text-2xl font-bold">{confidence}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Forecast */}
      <ChartCard title="📅 7-Day Sales Forecast">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyForecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="historical" fill="#60a5fa" name="Historical Avg" />
            <Bar dataKey="predicted" fill="#4ade80" name="Predicted" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stock Recommendations */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Package size={24} className="text-orange-500" />
          <h3 className="text-lg font-bold">📦 Stock Preparation Guide</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Recommended quantities for tomorrow based on historical demand
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Item</th>
                <th className="text-center py-3 px-4 font-semibold">Recommended Qty</th>
                <th className="text-center py-3 px-4 font-semibold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {stockRecommendations.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600 text-lg">
                    {item.avgDaily}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.priority === 'High' ? 'bg-red-100 text-red-600' :
                      item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Demand Pattern */}
      <ChartCard title="⏰ Hourly Demand Pattern">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={demandPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="demand" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          icon="🔥"
          title="Rush Hour Prep"
          message="Peak demand expected at 12-1 PM and 8-9 PM"
          color="bg-red-50 border-red-200"
        />

        <InsightCard
          icon="📈"
          title="Growth Trend"
          message="5% increase predicted compared to last week"
          color="bg-green-50 border-green-200"
        />

        <InsightCard
          icon="💡"
          title="Pro Tip"
          message={`${stockRecommendations[0]?.name || 'Top items'} will be in high demand`}
          color="bg-blue-50 border-blue-200"
        />
      </div>

    </div>
  );
}

/* -----------------------------------
   SHARED COMPONENTS
------------------------------------*/

const ChartCard = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
  >
    <h3 className="text-lg font-bold mb-4">{title}</h3>
    {children}
  </motion.div>
);

const InsightCard = ({ icon, title, message, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className={`rounded-xl shadow-sm p-6 border-2 ${color}`}
  >
    <div className="text-3xl mb-3">{icon}</div>
    <p className="font-bold text-gray-900 mb-1">{title}</p>
    <p className="text-sm text-gray-600">{message}</p>
  </motion.div>
);
