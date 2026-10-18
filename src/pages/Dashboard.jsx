import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../config/supabase';
import { BRANCH_OPTIONS, getSavedBranch } from '../lib/branchMenu';
import { fetchAllRows } from '../lib/fetchAll';
import { fetchMenuItems, buildCategoryLookup } from '../lib/menu';
import { resolveRange, previousRange, formatISTTime, formatDateKey } from '../lib/time';
import { enrichBills, inr, num } from '../lib/analytics';

import OverviewTab from '../components/dashboard/OverviewTab';
import TimeAnalyticsTab from '../components/dashboard/TimeAnalyticsTab';
import MenuIntelligenceTab from '../components/dashboard/MenuIntelligenceTab';
import CustomerInsightsTab from '../components/dashboard/CustomerInsightsTab';
import ParcelTab from '../components/dashboard/ParcelTab';
import ReportsTab from '../components/dashboard/ReportsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'time', label: 'Time Analytics', icon: '⏰' },
  { id: 'menu', label: 'Menu Intelligence', icon: '🍽️' },
  { id: 'parcel', label: 'Parcel Analysis', icon: '📦' },
  { id: 'customers', label: 'Customer Insights', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📄' },
];

const COLUMNS = 'id, branch, table_number, total, items, completed_at, is_parcel';

// Quick side-by-side branch comparison, shown only when "All Branches" is selected.
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
              <p className="text-xs text-gray-500">{num(row.orders)} orders</p>
            </div>
            <p className="text-xl font-bold text-orange-600">{inr(row.revenue)}</p>
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
  const [rawBills, setRawBills] = useState([]);
  const [rawPrevBills, setRawPrevBills] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // Default to this device's branch (set in the main app); 'all' combines both branches.
  const [selectedBranch, setSelectedBranch] = useState(getSavedBranch() || BRANCH_OPTIONS[0]?.id || 'all');

  const range = useMemo(
    () => resolveRange(dateRange, customStartDate, customEndDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange, customStartDate, customEndDate, lastRefresh]
  );
  const prevRange = useMemo(() => previousRange(range), [range]);
  const customIncomplete = dateRange === 'custom' && !range;

  const requestId = useRef(0);

  // Pulls EVERY bill in [start, endExclusive) — paginated, so 1k / 5k / 20k bills all load.
  const fetchBillsBetween = useCallback((r) => fetchAllRows(() => {
    let q = supabase
      .from('completed_bills')
      .select(COLUMNS, { count: 'exact' })
      .gte('completed_at', r.start)
      .lt('completed_at', r.endExclusive)
      .order('completed_at', { ascending: false })
      .order('id', { ascending: true }); // tie-breaker so pages never overlap
    if (selectedBranch !== 'all') q = q.eq('branch', selectedBranch);
    return q;
  }), [selectedBranch]);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    const r = resolveRange(dateRange, customStartDate, customEndDate);
    if (!r) {
      setRawBills([]);
      setRawPrevBills([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    try {
      if (!silent) setLoading(true);
      setError('');
      const [current, previous] = await Promise.all([
        fetchBillsBetween(r),
        fetchBillsBetween(previousRange(r)),
      ]);
      if (id !== requestId.current) return; // a newer request superseded this one
      setRawBills(current);
      setRawPrevBills(previous);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      if (id === requestId.current) setError('Could not load data. Check your connection and try Refresh.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, fetchBillsBetween]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData({ silent: true }), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetchMenuItems().then(({ items }) => setMenuItems(items));
  }, []);

  const categoryLookup = useMemo(() => buildCategoryLookup(menuItems), [menuItems]);
  const bills = useMemo(() => enrichBills(rawBills, categoryLookup), [rawBills, categoryLookup]);
  const prevBills = useMemo(() => enrichBills(rawPrevBills, categoryLookup), [rawPrevBills, categoryLookup]);

  const renderTabContent = () => {
    const props = { bills, prevBills, range, prevRange, dateRange, loading, menuItems, branch: selectedBranch };
    switch (activeTab) {
      case 'time': return <TimeAnalyticsTab {...props} />;
      case 'menu': return <MenuIntelligenceTab {...props} />;
      case 'parcel': return <ParcelTab {...props} />;
      case 'customers': return <CustomerInsightsTab {...props} />;
      case 'reports': return <ReportsTab {...props} />;
      default: return <OverviewTab {...props} />;
    }
  };

  const showEmpty = !loading && !error && !customIncomplete && bills.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-500">
                  {range && <>{formatDateKey(range.startKey)}{range.days > 1 && <> – {formatDateKey(range.endKey)}</>} · {num(bills.length)} bills · </>}
                  Updated {formatISTTime(lastRefresh)} IST
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                    max={customEndDate || undefined}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate || undefined}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </>
              )}

              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                  activeTab === tab.id ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedBranch === 'all' && !loading && bills.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <BranchComparisonBar bills={bills} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {customIncomplete ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
            Pick a start and an end date to see that period.
          </div>
        ) : showEmpty && activeTab !== 'reports' ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-lg font-semibold text-gray-700">No completed bills in this period</p>
            <p className="text-sm text-gray-500 mt-1">Try a different date range or branch.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}