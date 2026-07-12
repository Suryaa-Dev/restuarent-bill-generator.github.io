import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../config/supabase';
import { BRANCH_OPTIONS, getSavedBranch } from '../lib/branchMenu';

// Import tab components
import OverviewTab from '../components/dashboard/OverviewTab';
import TimeAnalyticsTab from '../components/dashboard/TimeAnalyticsTab';
import MenuIntelligenceTab from '../components/dashboard/MenuIntelligenceTab';
import CustomerInsightsTab from '../components/dashboard/CustomerInsightsTab';
import PredictionsTab from '../components/dashboard/PredictionsTab';
import ReportsTab from '../components/dashboard/ReportsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'time', label: 'Time Analytics', icon: '⏰' },
  { id: 'menu', label: 'Menu Intelligence', icon: '🍽️' },
  { id: 'customers', label: 'Customer Insights', icon: '👥' },
  { id: 'predictions', label: 'AI Predictions', icon: '🔮' },
  { id: 'reports', label: 'Reports', icon: '📄' }
];

// Quick side-by-side branch comparison, shown only when "All Branches" is selected.
// Every other tab already works off the combined `bills` list, so this is the one
// place branch-level totals get broken back out.
function BranchComparisonBar({ bills }) {
  const byBranch = {};
  bills.forEach(bill => {
    const key = bill.branch || 'unknown';
    if (!byBranch[key]) byBranch[key] = { revenue: 0, orders: 0 };
    byBranch[key].revenue += parseFloat(bill.total) || 0;
    byBranch[key].orders += 1;
  });

  const rows = BRANCH_OPTIONS
    .map(b => ({ id: b.id, label: b.label.en, ...(byBranch[b.id] || { revenue: 0, orders: 0 }) }))
    // include any branch id present in the data that isn't in BRANCH_OPTIONS (renamed/removed branch, etc.)
    .concat(
      Object.keys(byBranch)
        .filter(key => !BRANCH_OPTIONS.some(b => b.id === key))
        .map(key => ({ id: key, label: key, ...byBranch[key] }))
    );

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-3">Branch Comparison</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map(row => (
          <div key={row.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">{row.label}</p>
              <p className="text-xs text-gray-500">{row.orders} orders</p>
            </div>
            <p className="text-xl font-bold text-orange-600">₹{row.revenue.toFixed(0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // Default to whichever branch this device is set to (from the main app),
  // falling back to the first configured branch. 'all' combines both branches.
  const [selectedBranch, setSelectedBranch] = useState(getSavedBranch() || BRANCH_OPTIONS[0]?.id || 'all');

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
      setLastRefresh(new Date());
    }, 300000);

    return () => clearInterval(interval);
  }, [dateRange, customStartDate, customEndDate, selectedBranch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dateFilter = getDateFilter();
      if (!dateFilter) return;

      let query = supabase
        .from('completed_bills')
        .select('*')
        .gte('completed_at', dateFilter.startDate)
        .lte('completed_at', dateFilter.endDate)
        .order('completed_at', { ascending: false });

      if (selectedBranch !== 'all') {
        query = query.eq('branch', selectedBranch);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        endDate = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'last7days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'last30days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return null;
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    return { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    };
  };

  const renderTabContent = () => {
    const props = { bills, dateRange, loading };

    switch (activeTab) {
      case 'overview':
        return <OverviewTab {...props} />;
      case 'time':
        return <TimeAnalyticsTab {...props} />;
      case 'menu':
        return <MenuIntelligenceTab {...props} />;
      case 'customers':
        return <CustomerInsightsTab {...props} />;
      case 'predictions':
        return <PredictionsTab {...props} />;
      case 'reports':
        return <ReportsTab {...props} />;
      default:
        return <OverviewTab {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Back button and title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Last updated: {format(lastRefresh, 'HH:mm:ss')}
                </p>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Selector */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              >
                {BRANCH_OPTIONS.map(b => (
                  <option key={b.id} value={b.id}>{b.label.en}</option>
                ))}
                <option value="all">All Branches (Combined)</option>
              </select>

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

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Branch comparison, only shown when combining both branches */}
      {selectedBranch === 'all' && !loading && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <BranchComparisonBar bills={bills} />
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
