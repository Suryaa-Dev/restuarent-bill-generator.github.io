import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Printer, Trash2, Plus, Minus, Menu } from 'lucide-react';

import menuItems from './data/items';


// Header Component
const Header = ({ onCartClick, cartItemCount }) => (
  <header className="sticky top-0 z-50 bg-orange-500 text-white py-3 px-4 shadow-lg">
    <div className="flex justify-between items-center">
      <h1 className="text-lg md:text-2xl font-bold">Anand Fast Food</h1>
      <button onClick={onCartClick} className="relative md:hidden bg-orange-600 p-2 rounded-full">
        <ShoppingCart size={24} />
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {cartItemCount}
          </span>
        )}
      </button>
    </div>
  </header>
);

// Mobile Table Selector Modal
const TableSelectorModal = ({ tables, selectedTable, onSelectTable, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
    <div className="bg-white w-full md:w-96 md:rounded-t-2xl rounded-t-2xl max-h-[70vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
        <h2 className="text-xl font-bold">Select Table</h2>
        <button onClick={onClose} className="p-1"><X size={24} /></button>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto">
        {tables.map(num => (
          <button
            key={num}
            onClick={() => { onSelectTable(num); onClose(); }}
            className={`p-6 rounded-xl text-lg font-bold transition-all ${
              selectedTable === num
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-800 active:bg-gray-200'
            }`}
          >
            T{num}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Category Pills
const CategoryPills = ({ categories, selectedCategory, onSelectCategory }) => (
  <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 overflow-x-auto flex gap-2 scrollbar-hide">
    <button
      onClick={() => onSelectCategory(null)}
      className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
        selectedCategory === null
          ? 'bg-orange-500 text-white'
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      }`}
    >
      All
    </button>
    {categories.map(cat => (
      <button
        key={cat}
        onClick={() => onSelectCategory(cat)}
        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
          selectedCategory === cat
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 text-gray-700 active:bg-gray-200'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

// Menu Item Card - Optimized for speed
const MenuItem = ({ item, onAddItem, currentQty }) => {
  const defaultOption = item.options[0];
  const hasMultipleOptions = item.options.length > 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-60 md:h-[260px]">
      <div onClick={() => onAddItem(item.name, defaultOption.portion, defaultOption.price)} className="cursor-pointer flex-1 flex flex-col">
        <img src={item.img} alt={item.name} className="w-full h-28 md:h-32 object-cover shrink-0" />
        <div className="p-3 flex flex-col justify-between flex-1">
          <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">{item.name}</h3>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-orange-600 font-bold text-base">₹{defaultOption.price}</span>
            {currentQty > 0 && (
              <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-bold">
                {currentQty}x
              </span>
            )}
          </div>
        </div>
      </div>
      {hasMultipleOptions && (
        <div className="px-3 pb-3 flex gap-2 shrink-0">
          {item.options.slice(1).map((opt, i) => (
            <button
              key={i}
              onClick={() => onAddItem(item.name, opt.portion, opt.price)}
              className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-200 active:bg-orange-100"
            >
              {opt.portion} ₹{opt.price}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Cart/Bill Drawer (Mobile)
const CartDrawer = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white rounded-t-3xl">
        <h2 className="text-xl font-bold">
          {selectedTable ? `Table ${selectedTable}` : 'Cart'}
        </h2>
        <button onClick={onClose} className="p-1"><X size={24} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {currentBill.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
            <p>No items added</p>
          </div>
        ) : (
          currentBill.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-3 border-b">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">{item.portion}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChangeQuantity(idx, item.qty - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold w-8 text-center">{item.qty}</span>
                <button
                  onClick={() => onChangeQuantity(idx, item.qty + 1)}
                  className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center active:bg-orange-600"
                >
                  <Plus size={16} />
                </button>
                <span className="font-bold text-gray-800 w-16 text-right">₹{item.price * item.qty}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t bg-white p-4 space-y-3">
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total</span>
          <span className="text-orange-600">₹{total}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClearBill}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold active:bg-red-600 flex items-center justify-center gap-2"
          >
            <Trash2 size={20} /> Clear
          </button>
          <button
            onClick={onPrintBill}
            className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-semibold active:bg-black flex items-center justify-center gap-2"
          >
            <Printer size={20} /> Print
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Desktop Sidebar Components (reused from before)
const TableSelector = ({ tables, selectedTable, onSelectTable }) => (
  <div className="hidden md:block w-[15%] bg-gray-200 p-3 overflow-y-auto border-r border-gray-400">
    <div className="font-bold mb-3 text-gray-700 text-lg">Tables</div>
    {tables.map(num => (
      <div
        key={num}
        onClick={() => onSelectTable(num)}
        className={`block p-3 mb-2 rounded-lg cursor-pointer text-center font-medium transition-all ${
          selectedTable === num ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 hover:bg-gray-300'
        }`}
      >
        Table {num}
      </div>
    ))}
  </div>
);

const CategorySidebar = ({ categories, selectedCategory, onSelectCategory }) => (
  <div className="hidden md:block w-[30%] bg-gray-100 p-3 border-r border-gray-400 overflow-y-auto">
    <div className="font-bold mb-3 text-gray-600">Categories</div>
    {categories.map(cat => (
      <button
        key={cat}
        onClick={() => onSelectCategory(cat)}
        className={`block w-full p-2 mb-1 rounded-lg text-sm transition-all ${
          selectedCategory === cat ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 hover:bg-gray-400 hover:text-white'
        }`}
      >
        {cat}
      </button>
    ))}
    <button
      onClick={() => onSelectCategory(null)}
      className={`block w-full p-2 mb-1 rounded-lg text-sm transition-all ${
        selectedCategory === null ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 hover:bg-gray-400 hover:text-white'
      }`}
    >
      All Items
    </button>
  </div>
);

const BillSection = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill }) => (
  <div className="hidden md:flex w-[23%] bg-white p-4 flex-col border-l border-gray-400">
    <h3 className="text-center text-xl font-bold text-gray-700 mb-4">
      {selectedTable ? `Bill - Table ${selectedTable}` : 'Bill - Select a Table'}
    </h3>
    <div className="flex-1 overflow-y-auto mb-4">
      {currentBill.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-300">
          <span className="flex-1 text-gray-800">{item.name} ({item.portion})</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              value={item.qty}
              onChange={(e) => onChangeQuantity(idx, e.target.value)}
              className="w-14 px-2 py-1 text-right bg-gray-200 border border-gray-400 rounded text-sm"
            />
            <span className="min-w-[60px] text-right font-bold text-gray-800">₹{item.price * item.qty}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="bg-gray-800 text-white text-xl font-bold p-3 rounded-lg text-center mb-4 shadow-lg">
      Total: ₹{total}
    </div>
    <div className="flex gap-4">
      <button onClick={onPrintBill} className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-black transition-all">
        Print Bill
      </button>
      <button onClick={onClearBill} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-800 transition-all">
        Clear Bill
      </button>
    </div>
  </div>
);

// Main App
export default function RestaurantBillGenerator() {
  const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [bills, setBills] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  useEffect(() => {
    const initialBills = {};
    tables.forEach(num => { initialBills[num] = []; });
    setBills(initialBills);
  }, []);

  const categories = [...new Set(menuItems.map(item => item.category))];
  const filteredMenu = selectedCategory ? menuItems.filter(i => i.category === selectedCategory) : menuItems;

  const addItemToBill = (name, portion, price) => {
    if (!selectedTable) {
      setShowTableModal(true);
      return;
    }
    setBills(prev => {
      const newBills = { ...prev };
      const bill = [...newBills[selectedTable]];
      const existing = bill.find(b => b.name === name && b.portion === portion);
      if (existing) existing.qty++;
      else bill.push({ name, portion, price, qty: 1 });
      newBills[selectedTable] = bill;
      return newBills;
    });
  };

  const changeQuantity = (index, value) => {
    if (!selectedTable) return;
    setBills(prev => {
      const newBills = { ...prev };
      const bill = [...newBills[selectedTable]];
      const qty = parseInt(value);
      if (isNaN(qty) || qty <= 0) bill.splice(index, 1);
      else bill[index].qty = qty;
      newBills[selectedTable] = bill;
      return newBills;
    });
  };

  const clearBill = () => {
    if (!selectedTable) return;
    if (window.confirm(`Clear all items for Table ${selectedTable}?`)) {
      setBills(prev => ({ ...prev, [selectedTable]: [] }));
      setShowCartDrawer(false);
    }
  };

  const printBill = () => {
    if (!selectedTable) return;
    const now = new Date();
    let total = 0;
    const billRows = bills[selectedTable].map(b => {
      const lineTotal = b.price * b.qty;
      total += lineTotal;
      return `<tr><td>${b.name} (${b.portion})</td><td style="text-align:center;">${b.qty}</td><td style="text-align:right;">${b.price.toFixed(2)}</td><td style="text-align:right;">${lineTotal.toFixed(2)}</td></tr>`;
    }).join("");

    const printContent = `<html><head><title>Receipt</title><style>@media print{body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:5px}h2,p{margin:4px 0;text-align:center}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:3px 0}th{text-align:left;border-bottom:1px dotted #000}td{border-bottom:1px dotted #ccc}tfoot td{font-weight:bold;border-top:1px dotted #000;padding-top:6px}.right{text-align:right}.center{text-align:center}}@page{margin:0}</style></head><body><h2>Anand Dabeli</h2><p>Phone: 123-456-7890</p><hr><p><strong>Table:</strong> ${selectedTable} | ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p><table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead><tbody>${billRows}</tbody><tfoot><tr><td colspan="3" class="right">Total:</td><td class="right">${total.toFixed(2)}</td></tr></tfoot></table><hr><p>Thank you!</p></body></html>`;
    
    const w = window.open("", "_blank", "width=320,height=480");
    w.document.write(printContent);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
    setShowCartDrawer(false);
  };

  const currentBill = selectedTable ? bills[selectedTable] || [] : [];
  const total = currentBill.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartItemCount = currentBill.reduce((sum, item) => sum + item.qty, 0);

  const getItemQty = (itemName, portion) => {
    if (!selectedTable) return 0;
    const item = currentBill.find(b => b.name === itemName && b.portion === portion);
    return item ? item.qty : 0;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onCartClick={() => setShowCartDrawer(true)} cartItemCount={cartItemCount} />

      {/* Mobile: Floating Table Button */}
      <div className="md:hidden sticky top-14 z-40 bg-white border-b px-4 py-2">
        <button
          onClick={() => setShowTableModal(true)}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-lg active:bg-orange-600"
        >
          {selectedTable ? `Table ${selectedTable}` : 'Select Table'}
        </button>
      </div>

      {/* Mobile: Category Pills */}
      <div className="md:hidden">
        <CategoryPills categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      </div>

      <main className="flex flex-1 overflow-hidden">
        {/* Desktop Layout */}
        <TableSelector tables={tables} selectedTable={selectedTable} onSelectTable={setSelectedTable} />
        
        <div className="flex w-full md:w-[62%] border-r border-gray-400">
          <CategorySidebar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          
          {/* Menu Grid - Works for both mobile and desktop */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 overflow-y-auto bg-white">
            {filteredMenu.map((item, idx) => (
              <MenuItem 
                key={idx} 
                item={item} 
                onAddItem={addItemToBill}
                currentQty={getItemQty(item.name, item.options[0].portion)}
              />
            ))}
          </div>
        </div>

        <BillSection
          selectedTable={selectedTable}
          currentBill={currentBill}
          total={total}
          onChangeQuantity={changeQuantity}
          onPrintBill={printBill}
          onClearBill={clearBill}
        />
      </main>

      {/* Mobile Modals */}
      {showTableModal && (
        <TableSelectorModal
          tables={tables}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onClose={() => setShowTableModal(false)}
        />
      )}

      {showCartDrawer && (
        <CartDrawer
          selectedTable={selectedTable}
          currentBill={currentBill}
          total={total}
          onChangeQuantity={changeQuantity}
          onPrintBill={printBill}
          onClearBill={clearBill}
          onClose={() => setShowCartDrawer(false)}
        />
      )}
    </div>
  );
}