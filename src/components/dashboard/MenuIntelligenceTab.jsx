import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

export default function MenuIntelligenceTab({ bills, loading }) {
  const [pairings, setPairings] = useState([]);
  const [seasonalTrends, setSeasonalTrends] = useState([]);
  const [itemPerformance, setItemPerformance] = useState([]);
  const [comboSuggestions, setComboSuggestions] = useState([]);

  useEffect(() => {
    if (bills.length > 0) {
      calculateItemPairings();
      calculateSeasonalTrends();
      calculateItemPerformance();
      generateComboSuggestions();
    }
  }, [bills]);

  const calculateItemPairings = () => {
    // Find items ordered together
    const pairMap = {};

    bills.forEach(bill => {
      const items = bill.items.map(i => i.name);
      
      // Check all pairs
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const pair = [items[i], items[j]].sort().join(' + ');
          pairMap[pair] = (pairMap[pair] || 0) + 1;
        }
      }
    });

    const pairData = Object.entries(pairMap)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setPairings(pairData);
  };

  const calculateSeasonalTrends = () => {
    // Group by month
    const monthlyItems = {};

    bills.forEach(bill => {
      const month = new Date(bill.completed_at).toLocaleDateString('en-US', { month: 'short' });
      
      bill.items.forEach(item => {
        const key = `${month}-${item.name}`;
        if (!monthlyItems[key]) {
          monthlyItems[key] = { month, item: item.name, quantity: 0 };
        }
        monthlyItems[key].quantity += item.qty;
      });
    });

    // Get top 5 items overall
    const itemTotals = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        itemTotals[item.name] = (itemTotals[item.name] || 0) + item.qty;
      });
    });

    const topItems = Object.entries(itemTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    // Filter data for top items
    const trendData = Object.values(monthlyItems)
      .filter(d => topItems.includes(d.item));

    setSeasonalTrends(trendData);
  };

  const calculateItemPerformance = () => {
    const itemMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const key = item.name;
        if (!itemMap[key]) {
          itemMap[key] = {
            name: key,
            quantity: 0,
            revenue: 0,
            frequency: 0
          };
        }
        itemMap[key].quantity += item.qty;
        itemMap[key].revenue += item.price * item.qty;
        itemMap[key].frequency += 1;
      });
    });

    const performance = Object.values(itemMap)
      .map(item => ({
        ...item,
        avgOrderSize: (item.quantity / item.frequency).toFixed(1)
      }))
      .sort((a, b) => b.revenue - a.revenue);

    setItemPerformance(performance);
  };

  const generateComboSuggestions = () => {
    // Based on pairings, suggest combos
    const suggestions = pairings.slice(0, 5).map((pairing, index) => {
      const [item1, item2] = pairing.pair.split(' + ');
      
      // Calculate potential discount
      const discount = 10 + (index * 2); // 10%, 12%, 14%, etc.
      
      return {
        combo: `${item1} + ${item2}`,
        frequency: pairing.count,
        suggestedDiscount: `${discount}%`,
        potential: `High`
      };
    });

    setComboSuggestions(suggestions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading menu intelligence...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Item Pairings */}
      <ChartCard title="🤝 Most Ordered Item Combinations">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pairings} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="pair" type="category" width={200} />
            <Tooltip />
            <Bar dataKey="count" fill="#ff7e47" name="Times Ordered Together" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Combo Suggestions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Suggested Combo Deals</h3>
        <div className="space-y-3">
          {comboSuggestions.map((combo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex justify-between items-center p-4 bg-linear-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200"
            >
              <div className="flex-1">
                <p className="font-bold text-gray-900">{combo.combo}</p>
                <p className="text-sm text-gray-600">Ordered together {combo.frequency} times</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-600">{combo.suggestedDiscount} Off</p>
                <p className="text-xs text-gray-500">{combo.potential} Potential</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Seasonal Trends */}
      <ChartCard title="📅 Seasonal Item Trends">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={seasonalTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {[...new Set(seasonalTrends.map(d => d.item))].map((item, index) => (
              <Line
                key={item}
                type="monotone"
                dataKey="quantity"
                data={seasonalTrends.filter(d => d.item === item)}
                name={item}
                stroke={`hsl(${index * 60}, 70%, 50%)`}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Item Performance Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Complete Item Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty Sold</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg/Order</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {itemPerformance.slice(0, 15).map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    ₹{item.revenue.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.avgOrderSize}</td>
                  <td className="py-3 px-4 text-right text-blue-600">{item.frequency}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          icon="🔥"
          title="Hottest Item"
          value={itemPerformance[0]?.name || 'N/A'}
          subtitle={`${itemPerformance[0]?.quantity || 0} sold`}
          color="bg-red-500"
        />
        <InsightCard
          icon="💰"
          title="Revenue Champion"
          value={itemPerformance[0]?.name || 'N/A'}
          subtitle={`₹${itemPerformance[0]?.revenue.toFixed(0) || 0}`}
          color="bg-green-500"
        />
        <InsightCard
          icon="🤝"
          title="Best Pairing"
          value={pairings[0]?.pair.split(' + ')[0] || 'N/A'}
          subtitle={`with ${pairings[0]?.pair.split(' + ')[1] || 'N/A'}`}
          color="bg-blue-500"
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

const InsightCard = ({ icon, title, value, subtitle, color }) => (
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
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </motion.div>
);