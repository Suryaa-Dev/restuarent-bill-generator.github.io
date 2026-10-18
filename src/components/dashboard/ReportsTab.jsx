import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Clock, CheckCircle, AlertCircle, IndianRupee, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { BRANCH_OPTIONS } from '../../lib/branchMenu';
import { buildReportData } from '../../lib/reportData';
import { generateReportPdf } from '../../lib/pdfReport';
import { inr, num } from '../../lib/analytics';
import { formatDateKey, formatISTDateTime, toISTParts } from '../../lib/time';
import { StatCard, LoadingBlock } from './shared';

const REPORTS = [
  { id: 'summary', name: 'Sales Summary', icon: '📊', description: 'Totals, sales trend, categories and the top 10 items.', includes: ['KPIs', 'Trend chart', 'Categories', 'Top 10 items'] },
  { id: 'detailed', name: 'Detailed Sales Report', icon: '📋', description: 'Every bill in the period with items, table and type.', includes: ['All bills', 'Items per bill', 'Dine-in / Parcel'] },
  { id: 'items', name: 'Item Performance', icon: '🍽️', description: 'Every item sold: quantity, revenue and share of sales.', includes: ['All items', 'Avg price', 'Share of sales'] },
  { id: 'hourly', name: 'Hourly Breakdown', icon: '⏰', description: 'Bills and sales hour by hour in IST, with the busiest hour.', includes: ['Bills chart', 'Sales chart', 'Hour table'] },
  { id: 'category', name: 'Category Analysis', icon: '📁', description: 'Revenue by category and the best seller in each.', includes: ['Category share', 'Best sellers'] },
  { id: 'parcel', name: 'Parcel Report', icon: '📦', description: 'Dine-in vs parcel bills and the most-ordered parcel items.', includes: ['Dine-in vs Parcel', 'Top parcel items'] },
];

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cells) => cells.map(csvCell).join(',');
const money = (n) => (Number(n) || 0).toFixed(2);

export default function ReportsTab({ bills, range, dateRange, branch, loading }) {
  const [exportStatus, setExportStatus] = useState(null);
  const data = useMemo(() => buildReportData(bills, range), [bills, range]);
  const hasData = bills.length > 0;

  const branchName = branch === 'all' || !branch
    ? 'All Branches'
    : BRANCH_OPTIONS.find(b => b.id === branch)?.label.en || branch;

  const periodText = !range
    ? 'Custom range'
    : range.days === 1
      ? formatDateKey(range.startKey)
      : `${formatDateKey(range.startKey)} to ${formatDateKey(range.endKey)} (${range.days} days)`;

  const flash = (status) => {
    setExportStatus(status);
    if (status !== 'generating') setTimeout(() => setExportStatus(null), 3000);
  };

  const exportToPDF = (type) => {
    if (!hasData) return;
    flash('generating');
    // let the "generating" banner paint before the (synchronous) PDF work starts
    setTimeout(() => {
      try {
        const report = REPORTS.find(r => r.id === type);
        const doc = generateReportPdf(type, data, { reportName: report.name, branchName, periodText });
        const stamp = toISTParts(new Date());
        doc.save(`${type}-report-${range?.startKey || stamp.dateKey}${range && range.days > 1 ? `_to_${range.endKey}` : ''}.pdf`);
        flash('success');
      } catch (err) {
        console.error('Error generating PDF:', err);
        flash('error');
      }
    }, 50);
  };

  const exportToCSV = (type) => {
    if (!hasData) return;
    flash('generating');
    try {
      const report = REPORTS.find(r => r.id === type);
      const { stats, split } = data;
      const rows = [
        ['Anand Fast Food - ' + report.name],
        ['Branch', branchName],
        ['Period', periodText],
        ['Generated (IST)', formatISTDateTime(new Date())],
        [],
        ['Summary'],
        ['Total Sales (INR)', money(stats.sales)],
        ['Bills', stats.orders],
        ['Average Bill (INR)', money(stats.avg)],
        ['Items Sold', stats.items],
        ['Parcel Bills', split.parcel.orders],
        ['Dine-in Bills', split.dineIn.orders],
        [],
      ];

      if (type === 'summary') {
        rows.push(['Top 10 Items'], ['Item', 'Category', 'Quantity', 'Revenue (INR)', '% of Sales']);
        data.items.slice(0, 10).forEach(r => rows.push([r.name, r.category, r.quantity, money(r.revenue), r.share.toFixed(1)]));
        rows.push([], ['Categories'], ['Category', 'Quantity', 'Revenue (INR)', '% of Sales']);
        data.categories.forEach(c => rows.push([c.name, c.quantity, money(c.revenue), c.share.toFixed(1)]));
        if (data.daily.length > 1) {
          rows.push([], ['Daily'], ['Date', 'Bills', 'Sales (INR)']);
          data.daily.forEach(d => rows.push([d.key, d.orders, money(d.sales)]));
        }
      }
      if (type === 'detailed') {
        rows.push(['Transactions'], ['Date (IST)', 'Time (IST)', 'Branch', 'Table', 'Type', 'Items', 'Total (INR)']);
        data.transactions.forEach(b => {
          const p = toISTParts(b.completed_at);
          rows.push([
            p.dateKey,
            `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`,
            b.branch,
            b.table_number,
            b.is_parcel ? 'Parcel' : 'Dine-in',
            b.items.map(i => `${i.name}${i.portion ? ` (${i.portion})` : ''} x${i.qty}`).join('; '),
            money(b.total),
          ]);
        });
      }
      if (type === 'items') {
        rows.push(['All Items'], ['Item', 'Category', 'Quantity', 'Revenue (INR)', 'Avg Price (INR)', 'In Bills', '% of Sales']);
        data.items.forEach(r => rows.push([r.name, r.category, r.quantity, money(r.revenue), money(r.avgPrice), r.bills, r.share.toFixed(1)]));
      }
      if (type === 'hourly') {
        rows.push(['Hourly Breakdown (IST)'], ['Hour', 'Bills', 'Sales (INR)', 'Avg Bill (INR)', '% of Sales']);
        data.hourly.forEach(h => rows.push([h.label, h.orders, money(h.sales), money(h.avg), h.share.toFixed(1)]));
      }
      if (type === 'category') {
        rows.push(['Category Analysis'], ['Category', 'Quantity', 'Revenue (INR)', '% of Sales']);
        data.categories.forEach(c => rows.push([c.name, c.quantity, money(c.revenue), c.share.toFixed(1)]));
      }
      if (type === 'parcel') {
        rows.push(['Parcel Items'], ['Item', 'Category', 'Parcel Qty', 'Total Qty']);
        data.parcelItems.forEach(r => rows.push([r.name, r.category, r.parcelQty, r.quantity]));
      }

      // BOM so Excel opens it as UTF-8; no currency symbol so cells stay real numbers
      const blob = new Blob(['\uFEFF' + rows.map(csvRow).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report-${range?.startKey || toISTParts(new Date()).dateKey}${range && range.days > 1 ? `_to_${range.endKey}` : ''}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      flash('success');
    } catch (err) {
      console.error('Error generating CSV:', err);
      flash('error');
    }
  };

  if (loading) return <LoadingBlock label="Loading reports..." />;

  return (
    <div className="space-y-6">
      {exportStatus && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${exportStatus === 'generating' ? 'bg-blue-50 text-blue-700' : exportStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {exportStatus === 'generating' && <Clock className="animate-spin" size={20} />}
          {exportStatus === 'success' && <CheckCircle size={20} />}
          {exportStatus === 'error' && <AlertCircle size={20} />}
          <span className="font-medium">
            {exportStatus === 'generating' && 'Generating report...'}
            {exportStatus === 'success' && 'Report exported successfully!'}
            {exportStatus === 'error' && 'Error generating report. Please try again.'}
          </span>
        </motion.div>
      )}

      {/* Hero / quick export */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold">Reports &amp; Exports</h2>
        <p className="text-orange-50 mt-1">{branchName} · {periodText}</p>
        <p className="text-orange-100 text-sm">{num(bills.length)} bills in this period</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <button
            onClick={() => exportToPDF('summary')}
            disabled={!hasData}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={20} /> Summary (PDF)
          </button>
          <button
            onClick={() => exportToCSV('summary')}
            disabled={!hasData}
            className="bg-white/15 border border-white/40 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={20} /> Summary (CSV / Excel)
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg font-semibold text-gray-800">Nothing to export for this period</p>
          <p className="text-sm text-gray-500 mt-1">Pick a date range or branch that has completed bills.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<IndianRupee />} title="Total Sales" value={inr(data.stats.sales)} color="bg-green-500" />
            <StatCard icon={<ShoppingBag />} title="Bills" value={num(data.stats.orders)} color="bg-blue-500" delay={0.05} />
            <StatCard icon={<TrendingUp />} title="Average Bill" value={inr(data.stats.avg)} color="bg-purple-500" delay={0.1} />
            <StatCard icon={<Package />} title="Items Sold" value={num(data.stats.items)} color="bg-orange-500" delay={0.15} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Report templates</h3>
            <p className="text-sm text-gray-500 mb-4">Each report covers exactly the branch and dates selected above. PDFs are formatted for A4.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTS.map((report, idx) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="text-3xl mb-2">{report.icon}</div>
                  <h4 className="font-bold text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 mb-3 flex-1">{report.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {report.includes.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportToPDF(report.id)} className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors">PDF</button>
                    <button onClick={() => exportToCSV(report.id)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">CSV</button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}