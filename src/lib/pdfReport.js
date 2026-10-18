import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inr } from './analytics';
import { formatISTTime, formatISTDateTime, toISTParts, formatDateKey } from './time';

// ---------- look & feel (matches the dashboard) ----------
const ORANGE = [255, 126, 71];
const ORANGE_DARK = [234, 88, 12];
const ORANGE_SOFT = [255, 247, 237];
const ORANGE_LINE = [254, 215, 170];
const INK = [31, 41, 55];
const MUTED = [107, 114, 128];
const GRID = [229, 231, 235];
const PURPLE = [147, 51, 234];
const KPI_COLORS = [[34, 197, 94], [59, 130, 246], [168, 85, 247], [249, 115, 22]];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;            // side margin
const CONTENT_W = PAGE_W - M * 2;
const BOTTOM = 280;      // keep clear of the footer

// jsPDF's built-in fonts have no rupee glyph, so PDFs use "Rs." (the on-screen app still uses the rupee sign)
const rs = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const rs2 = (n) => `Rs. ${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');

const setFill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

function firstPageHeader(doc, meta) {
    setFill(doc, ORANGE);
    doc.rect(0, 0, PAGE_W, 40, 'F');
    setFill(doc, ORANGE_DARK);
    doc.rect(0, 40, PAGE_W, 1.6, 'F');

    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.text('Anand Fast Food', M, 17);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(meta.reportName, M, 26);

    doc.setFontSize(9);
    doc.text(`Period: ${meta.periodText}`, M, 34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(meta.branchName, PAGE_W - M, 17, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${num(meta.billCount)} bills`, PAGE_W - M, 24, { align: 'right' });
    doc.text(`Generated ${meta.generatedAt}`, PAGE_W - M, 34, { align: 'right' });
}

function continuationHeader(doc, meta) {
    setFill(doc, ORANGE);
    doc.rect(0, 0, PAGE_W, 9, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Anand Fast Food  |  ${meta.reportName}`, M, 6);
    doc.setFont('helvetica', 'normal');
    doc.text(meta.periodText, PAGE_W - M, 6, { align: 'right' });
}

// start a new page if `needed` mm don't fit; returns the y to continue at
function ensure(doc, meta, y, needed) {
    if (y + needed <= BOTTOM) return y;
    doc.addPage();
    continuationHeader(doc, meta);
    return 18;
}

function sectionTitle(doc, meta, y, text, sub) {
    y = ensure(doc, meta, y, 14);
    setFill(doc, ORANGE);
    doc.roundedRect(M, y - 4.5, 1.8, 6.5, 0.9, 0.9, 'F');
    setText(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(text, M + 4.5, y);
    if (sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setText(doc, MUTED);
        doc.text(sub, M + 4.5, y + 4.6);
        return y + 9;
    }
    return y + 5;
}

function kpiCards(doc, y, cards) {
    const gap = 4;
    const w = (CONTENT_W - gap * (cards.length - 1)) / cards.length;
    cards.forEach((c, i) => {
        const x = M + i * (w + gap);
        setFill(doc, ORANGE_SOFT);
        setDraw(doc, ORANGE_LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, w, 24, 2.5, 2.5, 'FD');
        setFill(doc, KPI_COLORS[i % KPI_COLORS.length]);
        doc.roundedRect(x, y, w, 2.2, 1, 1, 'F');
        setText(doc, MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(c.label.toUpperCase(), x + 3.5, y + 8);
        setText(doc, INK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(c.value.length > 11 ? 11.5 : 14);
        doc.text(c.value, x + 3.5, y + 16);
        if (c.sub) {
            setText(doc, MUTED);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(c.sub, x + 3.5, y + 21);
        }
    });
    return y + 24 + 8;
}

// vertical bars: data = [{ label, value }]
function barChart(doc, meta, y, { data, color = ORANGE, valueFmt = num, height = 52 }) {
    y = ensure(doc, meta, y, height + 16);
    const left = M + 14;
    const w = CONTENT_W - 14;
    const top = y;
    const base = y + height;
    const max = Math.max(...data.map(d => d.value), 1);

    // grid + y labels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setDraw(doc, GRID);
    doc.setLineWidth(0.2);
    for (let g = 0; g <= 4; g++) {
        const gy = base - (height * g) / 4;
        doc.line(left, gy, left + w, gy);
        setText(doc, MUTED);
        doc.text(valueFmt((max * g) / 4).replace('Rs. ', ''), left - 2, gy + 1.2, { align: 'right' });
    }

    const slot = w / data.length;
    const bw = Math.min(slot * 0.68, 14);
    const every = Math.ceil(data.length / 24);
    data.forEach((d, i) => {
        const bh = (d.value / max) * height;
        const bx = left + i * slot + (slot - bw) / 2;
        setFill(doc, d.color || color);
        if (bh > 0.4) doc.roundedRect(bx, base - bh, bw, bh, 0.8, 0.8, 'F');
        if (data.length <= 14 && d.value > 0) {
            setText(doc, INK);
            doc.setFontSize(6.5);
            doc.text(valueFmt(d.value).replace('Rs. ', ''), bx + bw / 2, base - bh - 1.2, { align: 'center' });
        }
        if (i % every === 0) {
            setText(doc, MUTED);
            doc.setFontSize(6.5);
            doc.text(String(d.label), bx + bw / 2, base + 4, { align: 'center' });
        }
    });
    setDraw(doc, MUTED);
    doc.line(left, base, left + w, base);
    return base + 10;
}

// horizontal bars with the label on the left and "value  share" on the right
function hBars(doc, meta, y, rows, color = ORANGE) {
    const labelW = 46;
    const valueW = 40;
    const barX = M + labelW;
    const barW = CONTENT_W - labelW - valueW;
    const max = Math.max(...rows.map(r => r.value), 1);
    rows.forEach(r => {
        y = ensure(doc, meta, y, 8);
        setText(doc, INK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const label = doc.splitTextToSize(String(r.label), labelW - 3)[0];
        doc.text(label, M, y + 3.6);
        setFill(doc, ORANGE_SOFT);
        doc.roundedRect(barX, y, barW, 5, 1.2, 1.2, 'F');
        setFill(doc, r.color || color);
        const w = Math.max((r.value / max) * barW, r.value > 0 ? 1.5 : 0);
        if (w > 0) doc.roundedRect(barX, y, w, 5, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(r.text, M + CONTENT_W, y + 3.6, { align: 'right' });
        y += 8;
    });
    return y + 2;
}

function table(doc, meta, y, { head, body, columnStyles = {}, foot, fontSize = 8.5 }) {
    y = ensure(doc, meta, y, 20);
    autoTable(doc, {
        startY: y,
        head: [head],
        body,
        foot: foot ? [foot] : undefined,
        showFoot: 'lastPage',
        theme: 'plain',
        margin: { left: M, right: M, top: 16, bottom: 18 },
        styles: { font: 'helvetica', fontSize, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: INK, lineColor: GRID, lineWidth: 0 },
        headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: fontSize - 0.5 },
        footStyles: { fillColor: ORANGE_SOFT, textColor: INK, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 251, 247] },
        columnStyles,
        // headers/footers should line up with the (right-aligned) numbers under them
        didParseCell: (d) => {
            const align = columnStyles[d.column.index]?.halign;
            if (align && d.section !== 'body') d.cell.styles.halign = align;
        },
        didDrawPage: (d) => { if (d.pageNumber > 1) continuationHeader(doc, meta); },
        didDrawCell: (d) => {
            // thin separator under each body row
            if (d.section === 'body') {
                setDraw(doc, [243, 244, 246]);
                doc.setLineWidth(0.15);
                doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
            }
        },
    });
    return doc.lastAutoTable.finalY + 8;
}

const right = { halign: 'right' };

// ---------- report bodies ----------

function overviewBlocks(doc, meta, y, data, { chart = true, categoriesBlock = true } = {}) {
    const { stats, split } = data;
    y = kpiCards(doc, y, [
        { label: 'Total Sales', value: rs(stats.sales) },
        { label: 'Bills', value: num(stats.orders), sub: `${num(split.parcel.orders)} parcel / ${num(split.dineIn.orders)} dine-in` },
        { label: 'Average Bill', value: rs(stats.avg) },
        { label: 'Items Sold', value: num(stats.items) },
    ]);

    if (chart) {
        if (data.daily.length > 1) {
            y = sectionTitle(doc, meta, y, 'Sales by day', 'Rs. per day (IST)');
            y = barChart(doc, meta, y, { data: data.daily.map(d => ({ label: d.label, value: Math.round(d.sales) })), color: ORANGE, valueFmt: (v) => rs(v) });
        } else if (data.hourly.length) {
            y = sectionTitle(doc, meta, y, 'Sales by hour', 'Rs. per hour (IST)');
            y = barChart(doc, meta, y, { data: data.hourly.map(h => ({ label: h.label, value: Math.round(h.sales) })), color: ORANGE, valueFmt: (v) => rs(v) });
        }
    }
    if (categoriesBlock && data.categories.length) {
        y = sectionTitle(doc, meta, y, 'Sales by category', 'Share of revenue');
        y = hBars(doc, meta, y, data.categories.map(c => ({ label: c.name, value: c.revenue, text: `${rs(c.revenue)}  ${c.share.toFixed(0)}%` })));
    }
    return y;
}

function buildSummary(doc, meta, data) {
    let y = overviewBlocks(doc, meta, 52, data);
    y = sectionTitle(doc, meta, y, 'Top 10 items', 'By revenue');
    table(doc, meta, y, {
        head: ['#', 'Item', 'Category', 'Qty', 'Revenue', '% of sales'],
        body: data.items.slice(0, 10).map((r, i) => [i + 1, r.name, r.category, num(r.quantity), rs(r.revenue), `${r.share.toFixed(1)}%`]),
        columnStyles: { 0: { cellWidth: 9 }, 3: right, 4: right, 5: right },
    });
}

function buildDetailed(doc, meta, data) {
    let y = overviewBlocks(doc, meta, 52, data, { chart: false, categoriesBlock: false });
    y = sectionTitle(doc, meta, y, `All transactions (${num(data.transactions.length)})`, 'Oldest first, times in IST');
    table(doc, meta, y, {
        head: ['Date', 'Time', 'Table', 'Type', 'Items', 'Total'],
        body: data.transactions.map(b => {
            const p = toISTParts(b.completed_at);
            const itemsText = b.items.map(i => `${i.name}${i.portion ? ` (${i.portion})` : ''} x${i.qty}`).join(', ');
            return [formatDateKey(p.dateKey, false), formatISTTime(b.completed_at), `T${b.table_number}`, b.is_parcel ? 'Parcel' : 'Dine-in', itemsText, rs2(b.total)];
        }),
        columnStyles: { 0: { cellWidth: 17 }, 1: { cellWidth: 19 }, 2: { cellWidth: 12 }, 3: { cellWidth: 16 }, 5: { ...right, cellWidth: 26 } },
        fontSize: 7.5,
        foot: ['', '', '', '', 'Grand total', rs2(data.stats.sales)],
    });
}

function buildItems(doc, meta, data) {
    let y = kpiCards(doc, 52, [
        { label: 'Distinct items sold', value: num(data.items.length) },
        { label: 'Items sold (qty)', value: num(data.stats.items) },
        { label: 'Total Sales', value: rs(data.stats.sales) },
        { label: 'Top item', value: (data.items[0]?.name || '-').slice(0, 16), sub: data.items[0] ? rs(data.items[0].revenue) : '' },
    ]);
    if (data.items.length) {
        y = sectionTitle(doc, meta, y, 'Top 10 by revenue');
        y = hBars(doc, meta, y, data.items.slice(0, 10).map(r => ({ label: r.name, value: r.revenue, text: `${rs(r.revenue)}  ${r.share.toFixed(0)}%` })));
    }
    y = sectionTitle(doc, meta, y, `All items (${num(data.items.length)})`, 'Sorted by revenue');
    table(doc, meta, y, {
        head: ['#', 'Item', 'Category', 'Qty', 'Revenue', 'Avg price', 'In bills', '% sales'],
        body: data.items.map((r, i) => [i + 1, r.name, r.category, num(r.quantity), rs(r.revenue), rs(r.avgPrice), num(r.bills), `${r.share.toFixed(1)}%`]),
        columnStyles: { 0: { cellWidth: 9 }, 3: right, 4: right, 5: right, 6: right, 7: right },
        fontSize: 8,
    });
}

function buildHourly(doc, meta, data) {
    let y = overviewBlocks(doc, meta, 52, { ...data, daily: [] }, { chart: false, categoriesBlock: false });
    if (data.hourly.length) {
        const peak = [...data.hourly].sort((a, b) => b.orders - a.orders)[0];
        y = sectionTitle(doc, meta, y, 'Bills by hour', `Busiest hour: ${peak.label} (${peak.orders} bills)`);
        y = barChart(doc, meta, y, {
            data: data.hourly.map(h => ({ label: h.label, value: h.orders, color: h.hour === peak.hour ? ORANGE_DARK : ORANGE })),
            valueFmt: num,
        });
        y = sectionTitle(doc, meta, y, 'Sales by hour', 'Rs. per hour (IST)');
        y = barChart(doc, meta, y, { data: data.hourly.map(h => ({ label: h.label, value: Math.round(h.sales) })), color: [34, 197, 94], valueFmt: (v) => rs(v) });
    }
    y = sectionTitle(doc, meta, y, 'Hour-by-hour detail');
    table(doc, meta, y, {
        head: ['Hour', 'Bills', 'Sales', 'Avg bill', '% of sales'],
        body: data.hourly.map(h => [h.label, num(h.orders), rs(h.sales), rs(h.avg), `${h.share.toFixed(1)}%`]),
        columnStyles: { 1: right, 2: right, 3: right, 4: right },
        foot: ['Total', num(data.stats.orders), rs(data.stats.sales), rs(data.stats.avg), '100%'],
    });
}

function buildCategory(doc, meta, data) {
    let y = overviewBlocks(doc, meta, 52, data, { chart: false, categoriesBlock: false });
    if (data.categories.length) {
        y = sectionTitle(doc, meta, y, 'Revenue by category', 'Share of revenue');
        y = hBars(doc, meta, y, data.categories.map(c => ({ label: c.name, value: c.revenue, text: `${rs(c.revenue)}  ${c.share.toFixed(0)}%` })));
    }
    y = sectionTitle(doc, meta, y, 'Category detail');
    y = table(doc, meta, y, {
        head: ['Category', 'Items sold', 'Revenue', '% of sales', 'Avg per item'],
        body: data.categories.map(c => [c.name, num(c.quantity), rs(c.revenue), `${c.share.toFixed(1)}%`, rs(c.quantity ? c.revenue / c.quantity : 0)]),
        columnStyles: { 1: right, 2: right, 3: right, 4: right },
    });
    // best seller inside each category
    const best = data.categories.map(c => {
        const top = data.items.filter(i => i.category === c.name).sort((a, b) => b.quantity - a.quantity)[0];
        return top ? [c.name, top.name, num(top.quantity), rs(top.revenue)] : null;
    }).filter(Boolean);
    if (best.length) {
        y = sectionTitle(doc, meta, y, 'Best seller in each category', 'By quantity');
        table(doc, meta, y, { head: ['Category', 'Item', 'Qty', 'Revenue'], body: best, columnStyles: { 2: right, 3: right } });
    }
}

function buildParcel(doc, meta, data) {
    const { split, stats } = data;
    const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : '0%');
    let y = kpiCards(doc, 52, [
        { label: 'Parcel bills', value: num(split.parcel.orders), sub: `${pct(split.parcel.orders, stats.orders)} of all bills` },
        { label: 'Parcel sales', value: rs(split.parcel.sales), sub: `${pct(split.parcel.sales, stats.sales)} of all sales` },
        { label: 'Avg parcel bill', value: rs(split.parcel.avg) },
        { label: 'Avg dine-in bill', value: rs(split.dineIn.avg) },
    ]);
    y = sectionTitle(doc, meta, y, 'Dine-in vs Parcel');
    y = table(doc, meta, y, {
        head: ['', 'Dine-in', 'Parcel'],
        body: [
            ['Bills', num(split.dineIn.orders), num(split.parcel.orders)],
            ['Sales', rs(split.dineIn.sales), rs(split.parcel.sales)],
            ['Average bill', rs(split.dineIn.avg), rs(split.parcel.avg)],
            ['Items per bill', (split.dineIn.orders ? split.dineIn.items / split.dineIn.orders : 0).toFixed(1), (split.parcel.orders ? split.parcel.items / split.parcel.orders : 0).toFixed(1)],
        ],
        columnStyles: { 1: right, 2: right },
    });
    if (data.parcelItems.length) {
        y = sectionTitle(doc, meta, y, 'Top parcel items', 'By quantity sold as parcel');
        y = hBars(doc, meta, y, data.parcelItems.slice(0, 10).map(r => ({ label: r.name, value: r.parcelQty, text: `${num(r.parcelQty)} sold  ${rs(r.revenue)}`, color: PURPLE })));
        y = sectionTitle(doc, meta, y, 'All parcel items');
        table(doc, meta, y, {
            head: ['Item', 'Category', 'Parcel qty', 'Total qty', 'Parcel share'],
            body: data.parcelItems.map(r => [r.name, r.category, num(r.parcelQty), num(r.quantity), `${((r.parcelQty / r.quantity) * 100).toFixed(0)}%`]),
            columnStyles: { 2: right, 3: right, 4: right },
        });
    } else {
        setText(doc, MUTED);
        doc.setFontSize(9);
        doc.text('No parcel orders were recorded in this period.', M, y);
    }
}

const BUILDERS = { summary: buildSummary, detailed: buildDetailed, items: buildItems, hourly: buildHourly, category: buildCategory, parcel: buildParcel };

export function generateReportPdf(type, data, { reportName, branchName, periodText }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const meta = {
        reportName,
        branchName,
        periodText,
        billCount: data.stats.orders,
        generatedAt: `${formatISTDateTime(new Date())} IST`,
    };

    firstPageHeader(doc, meta);
    (BUILDERS[type] || buildSummary)(doc, meta, data);

    // footer on every page
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        setDraw(doc, GRID);
        doc.setLineWidth(0.2);
        doc.line(M, PAGE_H - 13, PAGE_W - M, PAGE_H - 13);
        setText(doc, MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Anand Fast Food  |  ${reportName}  |  ${meta.branchName}`, M, PAGE_H - 8);
        doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });
    }
    return doc;
}