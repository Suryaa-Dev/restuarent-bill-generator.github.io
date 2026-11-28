import { t, translateItemName, translatePortion } from '../../../i18n/translations';
import { branchLabel } from '../../../shared/utils/devicePrefs';
import { mergeLines } from './customize';

/* Prints the receipt of one table (80 mm thermal printer) through the browser's print window.
   - bill:          the table's bill lines
   - parcelFlag:    Normal mode: the table's Parcel switch (whole order is a parcel)
   - kitchenMode:   Kitchen mode prints parcel lines in their own section
   Returns false when there was nothing to print or the pop-up was blocked. */
export function printReceipt({ bill, table: tableToUpdate, branch, lang, kitchenMode, parcelFlag }) {
    const items = mergeLines(bill || []); // customised portions are printed as one row per dish
    if (items.length === 0) return false;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    // Kitchen mode: parcel lines are printed in their own section; the big PARCEL banner is
    // only for an order that is parcel from top to bottom. Normal mode is unchanged.
    const parcelLineCount = kitchenMode ? items.filter(b => b.isParcel).length : 0;
    const mixedOrder = parcelLineCount > 0 && parcelLineCount < items.length;
    const isParcelOrder = kitchenMode
        ? items.length > 0 && parcelLineCount === items.length
        : !!parcelFlag;
    const printItems = kitchenMode
        ? [...items.filter(b => !b.isParcel), ...items.filter(b => b.isParcel)]
        : items;
    const firstParcelIdx = mixedOrder ? printItems.findIndex(b => b.isParcel) : -1;
    const logoUrl = `${window.location.origin}/anand-logo-bw.png`;

    let total = 0;
    let totalQty = 0;

    const billRows = printItems
        .map((b, idx) => {
            const lineTotal = b.price * b.qty;
            total += lineTotal;
            totalQty += b.qty;
            const portion = b.portion ? ` (${translatePortion(b.portion, lang)})` : '';
            const parcelHeader = idx === firstParcelIdx
                ? `<div class="center bold" style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:1.5mm 0;padding:0.5mm 0;">${t('parcel', lang).toUpperCase()}</div>`
                : '';
            return `${parcelHeader}
    <div class="item">
      <div class="name">${idx + 1}. ${translateItemName(b.name, lang)}${portion}</div>
      <div class="line">
        <span></span>
        <span class="num">${b.qty}</span>
        <span class="num">${b.price}</span>
        <span class="num">${lineTotal}</span>
      </div>
    </div>`;
        })
        .join('');

    const printContent = `
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        max-width: 80mm;
        margin: 0;
        padding: 0;
        background: #fff;
      }
      body {
        padding: 2mm 3mm 10mm;
        color: #000;
        font-family: 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        line-height: 1.35;
      }
      .logo {
display: block;
width: 48mm;
margin: 0 auto 2mm;
image-rendering: crisp-edges;
}
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .dash { border-top: 1px dashed #000; margin: 2mm 0; }
      .row { display: flex; justify-content: space-between; align-items: baseline; }
      .line, .head {
        display: grid;
        grid-template-columns: 1fr 9mm 12mm 15mm;
        gap: 1mm;
      }
      .head { font-weight: 700; }
      .num { text-align: right; }
      .item { margin-bottom: 1.5mm; }
      .name { font-weight: 600; word-break: break-word; }
      .grand { font-size: 16px; font-weight: 800; margin-top: 1mm; }
      .small { font-size: 11px; }
    </style>
  </head>
  <body>
    <img class="logo" src="${logoUrl}" alt="Anand" />
    <div class="center bold">${branchLabel(branch, lang)}</div>
    ${isParcelOrder ? `<div class="center bold" style="font-size:15px;border:1px solid #000;margin:1.5mm 0 0;padding:0.5mm 0;">${t('parcel', lang).toUpperCase()}</div>` : ''}

    <div class="dash"></div>
    <div class="row">
      <span>${t('tableLabel', lang)}: <b>${tableToUpdate}</b></span>
      <span>${dateStr} ${timeStr}</span>
    </div>
    <div class="dash"></div>

    <div class="head">
      <span>${lang === 'mr' ? 'तपशील' : 'Item'}</span>
      <span class="num">${lang === 'mr' ? 'नग' : 'Qty'}</span>
      <span class="num">${lang === 'mr' ? 'दर' : 'Rate'}</span>
      <span class="num">${lang === 'mr' ? 'रक्कम' : 'Amt'}</span>
    </div>
    <div class="dash"></div>

    ${billRows}

    <div class="dash"></div>
    <div class="row">
      <span>${lang === 'mr' ? 'एकूण नग' : 'Total Qty'}</span>
      <b>${totalQty}</b>
    </div>
    <div class="row grand">
      <span>${t('total', lang)}</span>
      <span>₹${total}</span>
    </div>
    <div class="dash"></div>

    <div class="center small">
      ${lang === 'mr' ? 'आपल्या भेटीबद्दल धन्यवाद! पुन्हा भेट द्या.' : 'Thank you! Visit again.'}
    </div>
  </body>
</html>
  `;

    const w = window.open('', '_blank', 'width=340,height=600');
    if (!w) {
        alert('Please allow pop-ups to print the bill.');
        return false;
    }
    w.document.write(printContent);
    w.document.close();

    // wait for the logo to load before printing, otherwise it comes out blank
    const img = w.document.querySelector('.logo');
    let printed = false;
    const doPrint = () => {
        if (printed) return;
        printed = true;
        setTimeout(() => {
            w.focus();
            w.print();
            w.close();
        }, 200);
    };
    if (img && !img.complete) {
        img.onload = doPrint;
        img.onerror = doPrint;
        setTimeout(doPrint, 2000); // safety fallback
    } else {
        doPrint();
    }
    return true;
}
