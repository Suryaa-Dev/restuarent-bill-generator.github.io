import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Search, Calendar, IndianRupee, RefreshCw, ShoppingBag } from 'lucide-react';
import { supabase } from '../config/supabase';
import { getSavedBranch, branchLabel, getSavedLanguage } from '../lib/branchMenu';
import { translateItemName, translatePortion } from '../i18n/translations';
import { fetchAllRows } from '../lib/fetchAll';
import { resolveRange, formatISTDateLabel, formatISTTime } from '../lib/time';

const PAGE_SIZE = 100; // rows rendered at a time (everything is still fetched, just shown in chunks)
const formatDateLabel = formatISTDateLabel;
const formatTimeLabel = formatISTTime;

export default function OrderHistory() {
    const navigate = useNavigate();
    const branch = getSavedBranch();
    const lang = getSavedLanguage();

    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState(null);

    const [dateRange, setDateRange] = useState('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all | parcel | dinein
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchBills();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, customStartDate, customEndDate]);

    const fetchBills = async () => {
        try {
            setLoading(true);
            setVisibleCount(PAGE_SIZE);
            const range = resolveRange(dateRange, customStartDate, customEndDate);
            if (dateRange === 'custom' && !range) { setBills([]); return; } // waiting for both dates

            // paginated, so "All Time" / long ranges are never cut off at Supabase's 1000-row cap
            const rows = await fetchAllRows(() => {
                let query = supabase
                    .from('completed_bills')
                    .select('*', { count: 'exact' })
                    .eq('branch', branch)
                    .order('completed_at', { ascending: false }) // LIFO: most recently completed first
                    .order('id', { ascending: true });
                if (range) query = query.gte('completed_at', range.start).lt('completed_at', range.endExclusive);
                return query;
            });
            setBills(rows);
        } catch (err) {
            console.error('Error loading order history:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            if (minAmount !== '' && bill.total < parseFloat(minAmount)) return false;
            if (maxAmount !== '' && bill.total > parseFloat(maxAmount)) return false;
            if (tableFilter !== '' && String(bill.table_number) !== tableFilter.trim()) return false;
            if (typeFilter === 'parcel' && !bill.is_parcel) return false;
            if (typeFilter === 'dinein' && bill.is_parcel) return false;
            return true;
        });
    }, [bills, minAmount, maxAmount, tableFilter, typeFilter]);

    const activeFilterCount =
        (dateRange !== 'today' ? 1 : 0) +
        (minAmount !== '' ? 1 : 0) +
        (maxAmount !== '' ? 1 : 0) +
        (tableFilter !== '' ? 1 : 0) +
        (typeFilter !== 'all' ? 1 : 0);

    const clearFilters = () => {
        setDateRange('today');
        setCustomStartDate('');
        setCustomEndDate('');
        setMinAmount('');
        setMaxAmount('');
        setTableFilter('');
        setTypeFilter('all');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-orange-500 text-white px-4 py-3 shadow-lg">
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-1 -ml-1">
                            <ArrowLeft size={22} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold leading-tight">Order History</h1>
                            <p className="text-xs text-orange-100">{branchLabel(branch, lang)}</p>
                        </div>
                    </div>
                    <button onClick={fetchBills} className="p-2 bg-orange-600 rounded-full">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4">
                {/* Quick date pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'last7days', label: 'Last 7 Days' },
                        { id: 'last30days', label: 'Last 30 Days' },
                        { id: 'all', label: 'All Time' },
                    ].map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => setDateRange(preset.id)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold ${dateRange === preset.id
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowFilters(s => !s)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold flex items-center gap-1 border ${activeFilterCount > 0 || showFilters
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : 'bg-white text-gray-600 border-gray-200'
                            }`}
                    >
                        <Search size={14} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Expandable filter panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Custom Date Range
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => { setCustomStartDate(e.target.value); setDateRange('custom'); }}
                                    className="flex-1 border rounded-lg px-2 py-2 text-sm"
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => { setCustomEndDate(e.target.value); setDateRange('custom'); }}
                                    className="flex-1 border rounded-lg px-2 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                <IndianRupee size={12} /> Amount Range
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Min ₹"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Max ₹"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Order Type</label>
                            <div className="flex gap-2">
                                {[['all', 'All'], ['dinein', 'Dine-in'], ['parcel', 'Parcel']].map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() => setTypeFilter(id)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${typeFilter === id
                                            ? (id === 'parcel' ? 'bg-purple-600 text-white border-purple-600' : 'bg-orange-500 text-white border-orange-500')
                                            : 'bg-white text-gray-600 border-gray-200'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Table Number</label>
                            <input
                                type="number"
                                placeholder="e.g. 5"
                                value={tableFilter}
                                onChange={(e) => setTableFilter(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="text-sm font-semibold text-orange-600">
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Results */}
                {loading ? (
                    <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <p className="font-medium">No bills found</p>
                        <p className="text-sm mt-1">Try a different date range or filter.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 px-1">
                            {filteredBills.length} bill{filteredBills.length === 1 ? '' : 's'} · ₹{filteredBills.reduce((s, b) => s + (parseFloat(b.total) || 0), 0).toLocaleString('en-IN')}
                        </p>
                        {filteredBills.slice(0, visibleCount).map(bill => (
                            <button
                                key={bill.id}
                                onClick={() => setSelectedBill(bill)}
                                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between text-left active:bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm">
                                        T{bill.table_number}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            {formatDateLabel(bill.completed_at)} · {formatTimeLabel(bill.completed_at)}
                                        </p>
                                        <p className="text-xs text-gray-400 flex items-center gap-2">
                                            <span>{(bill.items || []).length} item{(bill.items || []).length === 1 ? '' : 's'}</span>
                                            {bill.is_parcel && (
                                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 font-semibold rounded-full px-2 py-0.5">
                                                    <ShoppingBag size={10} /> Parcel
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-orange-600">₹{bill.total}</p>
                            </button>
                        ))}

                        {filteredBills.length > visibleCount && (
                            <button
                                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                className="w-full py-3 rounded-xl bg-white border border-gray-200 text-orange-600 font-semibold"
                            >
                                Show more ({filteredBills.length - visibleCount} remaining)
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selectedBill && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
                    <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    Table {selectedBill.table_number}
                                    {selectedBill.is_parcel && (
                                        <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold rounded-full px-2 py-0.5">
                                            <ShoppingBag size={11} /> Parcel
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {formatDateLabel(selectedBill.completed_at)} · {formatTimeLabel(selectedBill.completed_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedBill(null)}><X size={22} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {(selectedBill.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <div>
                                        <p className="font-medium text-sm">
                                            <span className="text-gray-400 mr-1">{idx + 1}.</span>
                                            {translateItemName(item.name, lang)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {translatePortion(item.portion, lang)} · ₹{item.price} each · x{item.qty}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-gray-800">₹{item.price * item.qty}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t p-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-orange-600">₹{selectedBill.total}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}