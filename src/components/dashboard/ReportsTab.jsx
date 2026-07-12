import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Mail, FileText, Calendar, Clock, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function ReportsTab({ bills, dateRange, loading }) {
  const [selectedReport, setSelectedReport] = useState('summary');
  const [emailSettings, setEmailSettings] = useState({
    email: '',
    frequency: 'daily',
    time: '09:00',
    enabled: false
  });
  const [exportStatus, setExportStatus] = useState(null);

  const reportTypes = [
    {
      id: 'summary',
      name: 'Daily Summary',
      description: 'Overview of daily sales, orders, and top items',
      icon: '📊'
    },
    {
      id: 'detailed',
      name: 'Detailed Sales Report',
      description: 'Complete breakdown with all transactions',
      icon: '📋'
    },
    {
      id: 'items',
      name: 'Item Performance',
      description: 'Analysis of all menu items',
      icon: '🍽️'
    },
    {
      id: 'hourly',
      name: 'Hourly Breakdown',
      description: 'Sales distribution by hour',
      icon: '⏰'
    },
    {
      id: 'category',
      name: 'Category Analysis',
      description: 'Performance by food categories',
      icon: '📁'
    }
  ];

  const calculateStats = () => {
    const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
    const billsCount = bills.length;
    const avgBill = billsCount > 0 ? totalSales / billsCount : 0;
    const itemsSold = bills.reduce((sum, bill) => {
      return sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);

    return { totalSales, billsCount, avgBill, itemsSold };
  };

  const getTopItems = () => {
    const itemMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const key = `${item.name} (${item.portion})`;
        if (!itemMap[key]) {
          itemMap[key] = { name: key, quantity: 0, revenue: 0 };
        }
        itemMap[key].quantity += item.qty;
        itemMap[key].revenue += item.price * item.qty;
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const getHourlySales = () => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sales: 0,
      orders: 0
    }));

    bills.forEach(bill => {
      const hour = bill.hour_of_day;
      hourlyData[hour].sales += parseFloat(bill.total);
      hourlyData[hour].orders += 1;
    });

    return hourlyData.filter(h => h.orders > 0);
  };

  const getCategoryBreakdown = () => {
    const categoryMap = {};

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const category = getCategoryForItem(item.name);
        if (!categoryMap[category]) {
          categoryMap[category] = { name: category, revenue: 0, quantity: 0 };
        }
        categoryMap[category].revenue += item.price * item.qty;
        categoryMap[category].quantity += item.qty;
      });
    });

    return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
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

  const exportToPDF = (reportType) => {
    setExportStatus('generating');
    
    try {
      const doc = new jsPDF();
      const stats = calculateStats();
      const dateRangeText = dateRange.replace(/([A-Z])/g, ' $1').trim();

      // Header
      doc.setFontSize(24);
      doc.text('Anand Dabeli', 14, 20);
      
      doc.setFontSize(16);
      doc.text(`${reportTypes.find(r => r.id === reportType)?.name || 'Sales Report'}`, 14, 30);
      
      doc.setFontSize(10);
      doc.text(`Period: ${dateRangeText}`, 14, 38);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 44);
      
      doc.line(14, 48, 196, 48);

      let yPos = 56;

      // Summary Stats
      doc.setFontSize(14);
      doc.text('Summary Statistics', 14, yPos);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Sales', `₹${stats.totalSales.toFixed(2)}`],
          ['Number of Bills', stats.billsCount.toString()],
          ['Average Bill Value', `₹${stats.avgBill.toFixed(2)}`],
          ['Total Items Sold', stats.itemsSold.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [255, 126, 71] }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Report-specific content
      if (reportType === 'summary' || reportType === 'detailed') {
        doc.setFontSize(14);
        doc.text('Top Selling Items', 14, yPos);
        yPos += 4;

        const topItems = getTopItems();
        autoTable(doc, {
          startY: yPos,
          head: [['Item', 'Quantity', 'Revenue']],
          body: topItems.map(item => [
            item.name,
            item.quantity.toString(),
            `₹${item.revenue.toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [255, 126, 71] }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      if (reportType === 'items') {
        doc.setFontSize(14);
        doc.text('Complete Item Performance', 14, yPos);
        yPos += 4;

        const allItems = getTopItems();
        autoTable(doc, {
          startY: yPos,
          head: [['Item', 'Quantity Sold', 'Revenue', 'Avg Price']],
          body: allItems.map(item => [
            item.name,
            item.quantity.toString(),
            `₹${item.revenue.toFixed(2)}`,
            `₹${(item.revenue / item.quantity).toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [255, 126, 71] }
        });
      }

      if (reportType === 'hourly') {
        doc.setFontSize(14);
        doc.text('Hourly Sales Breakdown', 14, yPos);
        yPos += 4;

        const hourlySales = getHourlySales();
        autoTable(doc, {
          startY: yPos,
          head: [['Hour', 'Orders', 'Sales']],
          body: hourlySales.map(h => [
            h.hour,
            h.orders.toString(),
            `₹${h.sales.toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [255, 126, 71] }
        });
      }

      if (reportType === 'category') {
        doc.setFontSize(14);
        doc.text('Category Performance', 14, yPos);
        yPos += 4;

        const categories = getCategoryBreakdown();
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Items Sold', 'Revenue']],
          body: categories.map(cat => [
            cat.name,
            cat.quantity.toString(),
            `₹${cat.revenue.toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [255, 126, 71] }
        });
      }

      if (reportType === 'detailed') {
        // Add new page for detailed transactions
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.text('Transaction Details', 14, yPos);
        yPos += 4;

        const transactions = bills.slice(0, 50).map(bill => [
          format(new Date(bill.completed_at), 'dd/MM HH:mm'),
          `Table ${bill.table_number}`,
          bill.items.map(i => `${i.name} x${i.qty}`).join(', ').substring(0, 50) + '...',
          `₹${parseFloat(bill.total).toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Date/Time', 'Table', 'Items', 'Total']],
          body: transactions,
          theme: 'grid',
          headStyles: { fillColor: [255, 126, 71] },
          styles: { fontSize: 8 }
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by Restaurant Analytics Dashboard`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Save
      const fileName = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(fileName);

      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const exportToCSV = (reportType) => {
    setExportStatus('generating');

    try {
      let csvContent = '';
      const stats = calculateStats();

      // Header
      csvContent += 'Anand Dabeli - Sales Report\n';
      csvContent += `Report Type: ${reportTypes.find(r => r.id === reportType)?.name}\n`;
      csvContent += `Period: ${dateRange}\n`;
      csvContent += `Generated: ${format(new Date(), 'PPpp')}\n\n`;

      // Summary
      csvContent += 'Summary Statistics\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Sales,₹${stats.totalSales.toFixed(2)}\n`;
      csvContent += `Number of Bills,${stats.billsCount}\n`;
      csvContent += `Average Bill,₹${stats.avgBill.toFixed(2)}\n`;
      csvContent += `Items Sold,${stats.itemsSold}\n\n`;

      // Report-specific data
      if (reportType === 'items' || reportType === 'summary') {
        csvContent += 'Top Items\n';
        csvContent += 'Item,Quantity,Revenue\n';
        const topItems = getTopItems();
        topItems.forEach(item => {
          csvContent += `"${item.name}",${item.quantity},₹${item.revenue.toFixed(2)}\n`;
        });
      }

      if (reportType === 'hourly') {
        csvContent += '\nHourly Breakdown\n';
        csvContent += 'Hour,Orders,Sales\n';
        const hourlySales = getHourlySales();
        hourlySales.forEach(h => {
          csvContent += `${h.hour},${h.orders},₹${h.sales.toFixed(2)}\n`;
        });
      }

      if (reportType === 'category') {
        csvContent += '\nCategory Performance\n';
        csvContent += 'Category,Quantity,Revenue\n';
        const categories = getCategoryBreakdown();
        categories.forEach(cat => {
          csvContent += `${cat.name},${cat.quantity},₹${cat.revenue.toFixed(2)}\n`;
        });
      }

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Error generating CSV:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const scheduleEmail = () => {
    // This is a placeholder - in production, you'd call your backend API
    alert(`Email scheduled!\n\nFrequency: ${emailSettings.frequency}\nTime: ${emailSettings.time}\nEmail: ${emailSettings.email}\n\nNote: This is a demo. In production, this would integrate with your email service.`);
    setEmailSettings({ ...emailSettings, enabled: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Status Banner */}
      {exportStatus && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            exportStatus === 'generating' ? 'bg-blue-50 text-blue-700' :
            exportStatus === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}
        >
          {exportStatus === 'generating' && <Clock className="animate-spin" size={20} />}
          {exportStatus === 'success' && <CheckCircle size={20} />}
          {exportStatus === 'error' && <FileText size={20} />}
          <span className="font-medium">
            {exportStatus === 'generating' && 'Generating report...'}
            {exportStatus === 'success' && 'Report exported successfully!'}
            {exportStatus === 'error' && 'Error generating report. Please try again.'}
          </span>
        </motion.div>
      )}

      {/* Quick Export Section */}
      <div className="bg-linear-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">📊 Quick Export</h2>
        <p className="mb-6">Generate and download reports instantly</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => exportToPDF('summary')}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Export Summary (PDF)
          </button>
          <button
            onClick={() => exportToCSV('summary')}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Export Summary (CSV)
          </button>
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedReport === report.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="text-3xl mb-2">{report.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1">{report.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{report.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToPDF(report.id);
                  }}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white rounded text-xs font-semibold hover:bg-orange-600 transition-colors"
                >
                  PDF
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToCSV(report.id);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600 transition-colors"
                >
                  CSV
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Email Scheduling */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Mail size={24} className="text-blue-500" />
          <h3 className="text-lg font-bold text-gray-900">📧 Schedule Email Reports</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={emailSettings.email}
              onChange={(e) => setEmailSettings({ ...emailSettings, email: e.target.value })}
              placeholder="owner@restaurant.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              value={emailSettings.frequency}
              onChange={(e) => setEmailSettings({ ...emailSettings, frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={emailSettings.time}
              onChange={(e) => setEmailSettings({ ...emailSettings, time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={scheduleEmail}
              disabled={!emailSettings.email}
              className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {emailSettings.enabled ? 'Update Schedule' : 'Schedule Reports'}
            </button>
          </div>
        </div>

        {emailSettings.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={20} />
              <span className="font-medium">
                Reports scheduled {emailSettings.frequency} at {emailSettings.time} to {emailSettings.email}
              </span>
            </div>
          </motion.div>
        )}
      </div>
      
    </div>
  );
}