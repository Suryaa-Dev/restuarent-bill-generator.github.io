import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';

export const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`bg-white rounded-xl shadow-sm p-6 border border-gray-200 ${className}`}
  >
    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </motion.div>
);

export const LoadingBlock = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-xl text-gray-600">{label}</div>
  </div>
);

// `change` is a percentage, or null when there is no previous data to compare with.
export const StatCard = ({ icon, title, value, change, compareLabel, color, delay = 0, invert = false }) => {
  const hasChange = change !== null && change !== undefined && isFinite(change);
  const rounded = hasChange ? Math.round(change * 10) / 10 : 0;
  const good = invert ? rounded < 0 : rounded > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>
        {hasChange && rounded !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${good ? 'text-green-600' : 'text-red-600'}`}>
            {rounded > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            {Math.abs(rounded)}%
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {compareLabel && (
        <p className="text-xs text-gray-400 mt-1">
          {hasChange ? `vs ${compareLabel}` : `no data for ${compareLabel}`}
        </p>
      )}
    </motion.div>
  );
};

export const InsightCard = ({ icon, title, value, subtitle, color = 'bg-orange-500' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="bg-white rounded-xl shadow-sm p-5 border border-gray-200"
  >
    <div className={`${color} w-11 h-11 rounded-lg flex items-center justify-center text-white text-xl mb-3`}>{icon}</div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-xl font-bold text-gray-900 break-words">{value}</p>
    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
  </motion.div>
);

export const compactMoney = (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `₹${v}`);
