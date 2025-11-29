const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let menuItems = [
    {
        name: "Dabeli",
        category: "Dabeli & Pavbhaji",
        img: "imgs/Dabeli.jpeg",
        options: [
            { portion: "Single", price: 25 },
            { portion: "Double", price: 50 }
        ]
    },
    {
        name: "Pavbhaji",
        category: "Dabeli & Pavbhaji",
        img: "imgs/Pavbhaji.jpeg",
        options: [
            { portion: "Plate", price: 70 },
        ]
    },
    {
        name: "Extra Pav",
        category: "Dabeli & Pavbhaji",
        img: "imgs/expav.jpg",
        options: [
            { portion: "Jodi", price: 20 },
            { portion: "Single", price: 10 }
        ]
    },
    {
        name: "Only Bhaji",
        category: "Dabeli & Pavbhaji",
        img: "imgs/bhaji.jpeg",
        options: [
            { portion: "Plate", price: 60 },
        ]
    },
    {
        name: "Masala Pav",
        category: "Dabeli & Pavbhaji",
        img: "imgs/masala-pav.jpg",
        options: [
            { portion: "Plate", price: 80 },
        ]
    },
    {
        name: "Manchurian",
        category: "Manchurian",
        img: "imgs/Manch.jpeg",
        options: [
            { portion: "Half", price: 60 },
            { portion: "Full", price: 120 }
        ]
    },
    {
        name: "Crispy Veg",
        category: "Manchurian",
        img: "imgs/Manch.jpeg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },
    {
        name: "Tadka Manchuri",
        category: "Manchurian",
        img: "imgs/TManch.jpg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },
    {
        name: "Veg 65/Chilli",
        category: "Manchurian",
        img: "imgs/vegchilli.jpeg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },
    {
        name: "Gravy Manchuri",
        category: "Manchurian",
        img: "imgs/GManch.jpeg",
        options: [
            { portion: "Half", price: 80 },
            { portion: "Full", price: 160 }
        ]
    },
    {
        name: "Sukka Manchuri",
        category: "Manchurian",
        img: "imgs/SManch.jpg",
        options: [
            { portion: "Half", price: 50 },
            { portion: "Full", price: 100 }
        ]
    },
    {
        name: "Rice",
        category: "Rice",
        img: "imgs/Rice.jpeg",
        options: [
            { portion: "Half", price: 60 },
            { portion: "Full", price: 120 }
        ]
    },
    {
        name: "Triple Rice",
        category: "Rice",
        img: "imgs/TRice.jpeg",
        options: [
            { portion: "Half", price: 100 },
            { portion: "Full", price: 200 }
        ]
    },
    {
        name: "Singapur Rice",
        category: "Rice",
        img: "imgs/SRice.jpeg",
        options: [
            { portion: "Half", price: 80 },
            { portion: "Full", price: 160 }
        ]
    },
    {
        name: "Hongkong Rice",
        category: "Rice",
        img: "imgs/Rice.jpeg",
        options: [
            { portion: "Half", price: 80 },
            { portion: "Full", price: 160 }
        ]
    },
    {
        name: "Combination",
        category: "Rice",
        img: "imgs/combination.jpg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },
    {
        name: "Noodles",
        category: "Noodles",
        img: "imgs/Noodles.jpeg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },
    {
        name: "Triple Noodles",
        category: "Noodles",
        img: "imgs/TNoodles.jpeg",
        options: [
            { portion: "Half", price: 100 },
            { portion: "Full", price: 200 }
        ]
    },

    {
        name: "Combination",
        category: "Noodles",
        img: "imgs/combination.jpg",
        options: [
            { portion: "Half", price: 70 },
            { portion: "Full", price: 140 }
        ]
    },

    {
        name: "Singapur Noodles",
        category: "Noodles",
        img: "imgs/SNoodles.jpeg",
        options: [
            { portion: "Half", price: 80 },
            { portion: "Full", price: 160 }
        ]
    },
    {
        name: "Hongkong Noodles",
        category: "Noodles",
        img: "imgs/Noodles.jpeg",
        options: [
            { portion: "Half", price: 80 },
            { portion: "Full", price: 160 }
        ]
    },

    {
        name: "Paneer Manchuri",
        category: "Paneer",
        img: "imgs/PManch.jpeg",
        options: [
            { portion: "Half", price: 90 },
            { portion: "Full", price: 180 }
        ]
    },
    {
        name: "Paneer Chilli",
        category: "Paneer",
        img: "imgs/PChilli.jpeg",
        options: [
            { portion: "Half", price: 100 },
            { portion: "Full", price: 200 }
        ]
    },
    {
        name: "Paneer 65",
        category: "Paneer",
        img: "imgs/P65.jpeg",
        options: [
            { portion: "Half", price: 100 },
            { portion: "Full", price: 200 }
        ]
    },
    {
        name: "Paneer Tadka",
        category: "Paneer",
        img: "imgs/PManch.jpeg",
        options: [
            { portion: "Half", price: 100 },
            { portion: "Full", price: 200 }
        ]
    },
    {
        name: "Paneer Rice",
        category: "Rice",
        img: "imgs/Rice.jpeg",
        options: [
            { portion: "Half", price: 90 },
            { portion: "Full", price: 180 }
        ]
    },
    {
        name: "Paneer Noodles",
        category: "Noodles",
        img: "imgs/Noodles.jpeg",
        options: [
            { portion: "Half", price: 90 },
            { portion: "Full", price: 180 }
        ]
    },
    {
        name: "Paneer Triple",
        category: "Paneer",
        img: "imgs/TRice.jpeg",
        options: [
            { portion: "Half", price: 140 },
            { portion: "Full", price: 280 }
        ]
    },
    {
        name: "Paneer Singapur Rice",
        category: "Paneer",
        img: "imgs/SRice.jpeg",
        options: [
            { portion: "Half", price: 140 },
            { portion: "Full", price: 280 }
        ]
    },
    {
        name: "Paneer Singapur Noodles",
        category: "Paneer",
        img: "imgs/SNoodles.jpeg",
        options: [
            { portion: "Half", price: 140 },
            { portion: "Full", price: 280 }
        ]
    },

    {
        name: "Soup",
        category: "Soup",
        img: "imgs/soup.jpeg",
        options: [
            { portion: "Half", price: 50 },
            { portion: "Full", price: 100 }
        ]
    },
    {
        name: "Tomato Soup",
        category: "Soup",
        img: "imgs/Tsoup.jpeg",
        options: [
            { portion: "Full", price: 100 }
        ]
    },
    {
        name: "Chinese Bhel",
        category: "Soup",
        img: "imgs/ChineseBhel.jpeg",
        options: [
            { portion: "Full", price: 120 }
        ]
    },
    {
        name: "French Fries",
        category: "Soup",
        img: "imgs/frenchfries.jpeg",
        options: [
            { portion: "Full", price: 100 }
        ]
    },
    {
        name: "Water Bottle",
        category: "Cold Drinks",
        img: "imgs/bottle.jpg",
        options: [
            { portion: "500ML", price: 10 },
            { portion: "1LTR", price: 20 }
        ]
    },
    {
        name: "Cold Drinks",
        category: "Cold Drinks",
        img: "imgs/Colddrinks.jpeg",
        options: [
            { portion: "10Rs", price: 10 },
        ]
    },
    {
        name: "Cold Drinks(20RS)",
        category: "Cold Drinks",
        img: "imgs/Colddrinks.jpeg",
        options: [
            { portion: "20Rs", price: 20 },
        ]
    },
    {
        name: "Cold Drinks",
        category: "Cold Drinks",
        img: "imgs/Colddrinks.jpeg",
        options: [
            { portion: "45Rs", price: 45 },
        ]
    },

    {
        name: "Ice-cream",
        category: "Ice-cream",
        img: "imgs/amul.jpeg",
        options: [
            { portion: "10", price: 10 },
            { portion: "1", price: 15 },
            { portion: "2", price: 20 },
            { portion: "3", price: 25 },
        ]
    },
    {
        name: "Ice-cream",
        category: "Ice-cream",
        img: "imgs/amul.jpeg",
        options: [
            { portion: "30", price: 30 },
            { portion: "5", price: 35 },
            { portion: "6", price: 40 },
            { portion: "7", price: 45 }
        ]
    }

];


let bills = JSON.parse(localStorage.getItem("bills")) || {};
let selectedTable = null;
let selectedCategory = null;

/* Build table buttons */
const tableButtonsContainer = document.getElementById("tableButtons");
tables.forEach(num => {
    if (!bills[num]) bills[num] = [];
    const btn = document.createElement("div");
    btn.className = "table-btn";
    btn.textContent = "Table " + num;
    btn.onclick = () => selectTable(num, btn);
    tableButtonsContainer.appendChild(btn);
});

/* Render categories */
function renderCategories() {
    const categories = [...new Set(menuItems.map(item => item.category))];
    const catList = document.getElementById("categoryList");
    catList.innerHTML = "<strong>Categories</strong>";
    categories.forEach(cat => {
        const cBtn = document.createElement("button");
        cBtn.className = "category-btn";
        cBtn.textContent = cat;
        cBtn.onclick = () => {
            selectedCategory = cat;
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            cBtn.classList.add("active");
            renderMenu();
        };
        catList.appendChild(cBtn);
    });
}

/* Render menu items with Half default click, Full button option */
function renderMenu() {
    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = "";
    let filtered = menuItems;
    if (selectedCategory) {
        filtered = menuItems.filter(i => i.category === selectedCategory);
    }
    filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "menu-item";

        // Default option is the first
        let defaultOption = item.options[0];
        div.onclick = () => addItemToBill(item.name, defaultOption.portion, defaultOption.price);

        // Show ALL buttons except the default (which is triggered by card click)
        div.innerHTML = `
        <img src="${item.img}">
        <div class="item-info">${item.name}</div>
        <div class="portions">
            ${item.options
                .filter(opt => opt !== defaultOption) // show buttons for all except default
                .map(opt =>
                    `<button onclick="event.stopPropagation(); addItemToBill('${item.name}','${opt.portion}',${opt.price})">
                        ${opt.portion} ₹${opt.price}
                    </button>`
                ).join('')}
        </div>
    `;
        menuContainer.appendChild(div);
    });

}
renderCategories();
renderMenu();

/* Table selection */
function selectTable(num, btn) {
    selectedTable = num;
    document.querySelectorAll(".table-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("billTitle").textContent = `Bill - Table ${num}`;
    renderBill();
}

/* Add item */
function addItemToBill(name, portion, price) {
    if (!selectedTable) {
        alert("Please select a table first!");
        return;
    }
    const bill = bills[selectedTable];
    const existing = bill.find(b => b.name === name && b.portion === portion);
    if (existing) {
        existing.qty++;
    } else {
        bill.push({ name, portion, price, qty: 1 });
    }
    saveBills();
    renderBill();
}

/* Change quantity */
function changeQuantity(index, value) {
    const bill = bills[selectedTable];
    let qty = parseInt(value);
    if (isNaN(qty) || qty <= 0) {
        bill.splice(index, 1);
    } else {
        bill[index].qty = qty;
    }
    saveBills();
    renderBill();
}

/* Render bill */
function renderBill() {
    const billList = document.getElementById("billItems");
    billList.innerHTML = "";
    if (!selectedTable) return;
    let total = 0;
    bills[selectedTable].forEach((b, idx) => {
        total += b.price * b.qty;
        billList.innerHTML += `
        <div class="bill-item">
            <span class="bill-name">${b.name} (${b.portion})</span>
            <div class="bill-right">
                <input type="number" min="0" value="${b.qty}" onchange="changeQuantity(${idx}, this.value)">
                <span class="bill-amt">₹${b.price * b.qty}</span>
            </div>
        </div>`;
    });
    document.getElementById("billTotal").textContent = `Total: ₹${total}`;
}

/* Print bill */
// function printBill() {
//     if (!selectedTable) {
//         alert("Select a table first!");
//         return;
//     }
//     let printContent = `<h2>Restaurant Bill</h2><p><strong>Table:</strong> ${selectedTable}</p><hr>`;
//     let total = 0;
//     bills[selectedTable].forEach(b => {
//         total += b.price * b.qty;
//         printContent += `<p>${b.name} (${b.portion}) x ${b.qty} - ₹${b.price * b.qty}</p>`;
//     });
//     printContent += `<hr><h3>Total: ₹${total}</h3>`;
//     const newWin = window.open("", "", "width=400,height=600");
//     newWin.document.write(printContent);
//     newWin.print();
//     newWin.close();
// }


function printBill() {
    if (!selectedTable) {
        alert("Select a table first!");
        return;
    }
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    let total = 0;
    // Append portion to item name and remove separate portion column
    let billRows = bills[selectedTable].map(b => {
        const lineTotal = b.price * b.qty;
        total += lineTotal;
        return `
            <tr>
                <td>${b.name} (${b.portion})</td>
                <td style="text-align:center;">${b.qty}</td>
                <td style="text-align:right;">${b.price.toFixed(2)}</td>
                <td style="text-align:right;">${lineTotal.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    const printContent = `
        <html>
        <head>
            <title>Receipt - Table ${selectedTable}</title>
            <style>
                @media print {
                    body {
                        font-family: monospace;
                        font-size: 12px;
                        margin: 0;
                        padding: 5px;
                        width: 80mm;
                    }
                    h2, h4, p {
                        margin: 4px 0;
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        padding: 3px 0;
                    }
                    th {
                        text-align: left;
                        border-bottom: 1px dotted #000;
                    }
                    td {
                        border-bottom: 1px dotted #ccc;
                    }
                    tfoot td {
                        font-weight: bold;
                        border-top: 1px dotted #000;
                        padding-top: 6px;
                    }
                    .right {
                        text-align: right;
                    }
                    .center {
                        text-align: center;
                    }
                }
                @page { margin: 0; }
            </style>
        </head>
        <body>
            <h2>Your Restaurant Name</h2>
            <p>Address line 1, City</p>
            <p>Phone: 123-456-7890</p>
            <hr>
            <p><strong>Table:</strong> ${selectedTable} <span class="right"><strong>Date:</strong> ${formattedDate}</span></p>
            <p class="right"><strong>Time:</strong> ${formattedTime}</p>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="center">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${billRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="right">Grand Total:</td>
                        <td class="right">${total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            <hr>
            <p style="text-align:center;">Thank you! Please visit again.</p>
        </body>
        </html>
    `;

    // Open a new window with the print content and trigger print
    const printWindow = window.open("", "_blank", "width=320,height=480");
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Delay print call slightly to ensure content is loaded
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 300);
}




/* Clear bill */
function clearBill() {
    if (!selectedTable) {
        alert("Select a table first!");
        return;
    }
    if (confirm(`Clear all items for Table ${selectedTable}?`)) {
        bills[selectedTable] = [];
        saveBills();
        renderBill();
    }
}

/* Save bills */
function saveBills() {
    localStorage.setItem("bills", JSON.stringify(bills));
}
