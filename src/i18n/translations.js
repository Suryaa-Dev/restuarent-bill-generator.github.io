// Simple, dependency-free i18n setup.
// Add more languages later by adding another key to UI_STRINGS / ITEM_NAME_MR / CATEGORY_MR.

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'मराठी' },
];

export const UI_STRINGS = {
    en: {
        appName: 'Anand Fast Food',
        selectTable: 'Select Table',
        tableLabel: 'Table',
        cart: 'Cart',
        all: 'All',
        home: 'Home',
        allTables: 'All Tables',
        total: 'Total',
        clearBill: 'Clear Bill',
        printBill: 'Print Bill',
        noItemsAdded: 'No items added',
        billFor: 'Bill - Table',
        billSelectTable: 'Bill - Select a Table',
        rate: 'Rate',
        each: 'each',
        installApp: '📱 Install Anand Fast Food App',
        installNow: 'Install Now',
        loading: 'Loading...',
        settings: 'Settings',
        language: 'Language',
        updateMenu: 'Update Menu',
        switchBranch: 'Switch Branch',
        currentBranch: 'Current Branch',
        close: 'Close',
        selectBranch: 'Select Branch',
        selectBranchSubtitle: 'Choose which branch this device belongs to. You can change it later from Settings.',
        confirm: 'Confirm',
        addNewItem: 'Add New Item',
        itemName: 'Item Name',
        category: 'Category',
        portion: 'Portion',
        price: 'Price',
        addPortion: 'Add Portion',
        save: 'Save',
        cancel: 'Cancel',
        hide: 'Hide',
        unhide: 'Unhide',
        hidden: 'Hidden',
        deleteItem: 'Delete',
        menuItemsCustomNote: 'Custom items added here are shared with everyone at this branch.',
        priceOverrideNote: 'Editing a price here updates it for this branch only.',
        newItemAdded: 'New item added to the menu.',
        fillAllFields: 'Please fill in item name, category and at least one portion/price.',
        confirmDeleteCustomItem: 'Remove this custom item from the menu?',
        confirmChangeBranch: 'Switch branch? You will see bills and menu for the newly selected branch.',
        savingChanges: 'Saving...',
    },
    mr: {
        appName: 'आनंद फास्ट फूड',
        selectTable: 'टेबल निवडा',
        tableLabel: 'टेबल',
        cart: 'कार्ट',
        all: 'सर्व',
        home: 'होम',
        allTables: 'सर्व टेबल्स',
        total: 'एकूण',
        clearBill: 'बिल क्लिअर करा',
        printBill: 'बिल प्रिंट करा',
        noItemsAdded: 'कोणतीही वस्तू जोडलेली नाही',
        billFor: 'बिल - टेबल',
        billSelectTable: 'बिल - टेबल निवडा',
        rate: 'दर',
        each: 'प्रत्येकी',
        installApp: '📱 आनंद फास्ट फूड अ‍ॅप इंस्टॉल करा',
        installNow: 'आता इंस्टॉल करा',
        loading: 'लोड होत आहे...',
        settings: 'सेटिंग्ज',
        language: 'भाषा',
        updateMenu: 'मेनू अपडेट करा',
        switchBranch: 'शाखा बदला',
        currentBranch: 'सध्याची शाखा',
        close: 'बंद करा',
        selectBranch: 'शाखा निवडा',
        selectBranchSubtitle: 'हे डिव्हाइस कोणत्या शाखेसाठी आहे ते निवडा. नंतर सेटिंग्जमधून बदलता येईल.',
        confirm: 'निश्चित करा',
        addNewItem: 'नवीन वस्तू जोडा',
        itemName: 'वस्तूचे नाव',
        category: 'विभाग',
        portion: 'पोर्शन',
        price: 'किंमत',
        addPortion: 'पोर्शन जोडा',
        save: 'सेव्ह करा',
        cancel: 'रद्द करा',
        hide: 'लपवा',
        unhide: 'दाखवा',
        hidden: 'लपवलेले',
        deleteItem: 'काढून टाका',
        menuItemsCustomNote: 'येथे जोडलेल्या वस्तू या शाखेतील सर्वांना दिसतील.',
        priceOverrideNote: 'येथे किंमत बदलल्यास ती फक्त याच शाखेसाठी लागू होईल.',
        newItemAdded: 'मेनूमध्ये नवीन वस्तू जोडली.',
        fillAllFields: 'कृपया वस्तूचे नाव, विभाग आणि किमान एक पोर्शन/किंमत भरा.',
        confirmDeleteCustomItem: 'ही वस्तू मेनूमधून काढून टाकायची का?',
        confirmChangeBranch: 'शाखा बदलायची का? तुम्हाला नवीन निवडलेल्या शाखेची बिले आणि मेनू दिसेल.',
        savingChanges: 'सेव्ह होत आहे...',
    },
};

// Category names are proper nouns already used in the current menu.
export const CATEGORY_MR = {
    'Dabeli & Pavbhaji': 'दाबेली आणि पावभाजी',
    'Manchurian': 'मंचुरियन',
    'Rice': 'राईस',
    'Noodles': 'नूडल्स',
    'Paneer': 'पनीर',
    'Soup': 'सूप',
    'Cold Drinks': 'कोल्ड ड्रिंक्स',
    'Ice-cream': 'आईस्क्रीम',
};

// Best-effort Marathi (Devanagari) names for existing menu items.
// Any item not listed here (e.g. a newly added custom item) simply falls back to its English name.
export const ITEM_NAME_MR = {
    'Dabeli': 'दाबेली',
    'Pavbhaji': 'पावभाजी',
    'Extra Pav': 'एक्स्ट्रा पाव',
    'Only Bhaji': 'फक्त भाजी',
    'Special Pavbhaji': 'स्पेशल पावभाजी',
    'Kolhapuri Pavbhaji': 'कोल्हापुरी पावभाजी',
    'Masala Pav': 'मसाला पाव',
    'Fakt Pav': 'फक्त पाव',
    'Manchurian': 'मंचुरियन',
    'Crispy Veg': 'क्रिस्पी व्हेज',
    'Tadka Manchuri': 'तडका मंचुरी',
    'Veg 65/Chilli': 'व्हेज ६५ / चिली',
    'Gravy Manchuri': 'ग्रेव्ही मंचुरी',
    'Sukka Manchuri': 'सुक्का मंचुरी',
    'Rice': 'राईस',
    'Triple Rice': 'ट्रिपल राईस',
    'Singapur Rice': 'सिंगापूर राईस',
    'Hongkong Rice': 'हाँगकाँग राईस',
    'Combination': 'कॉम्बिनेशन',
    'Noodles': 'नूडल्स',
    'Triple Noodles': 'ट्रिपल नूडल्स',
    'Singapur Noodles': 'सिंगापूर नूडल्स',
    'Hongkong Noodles': 'हाँगकाँग नूडल्स',
    'Paneer Manchuri': 'पनीर मंचुरी',
    'Paneer Chilli': 'पनीर चिली',
    'Paneer 65': 'पनीर ६५',
    'Paneer Tadka': 'पनीर तडका',
    'Paneer Rice': 'पनीर राईस',
    'Paneer Noodles': 'पनीर नूडल्स',
    'Paneer Triple': 'पनीर ट्रिपल',
    'Paneer Singapur': 'पनीर सिंगापूर',
    'Paneer Hongkong': 'पनीर हाँगकाँग',
    'Paneer Singapur Triple': 'पनीर सिंगापूर ट्रिपल',
    'Soup': 'सूप',
    'French Fries': 'फ्रेंच फ्राईज',
    'Paneer Soup': 'पनीर सूप',
    'Tomato Soup': 'टोमॅटो सूप',
    'Chinese Bhel': 'चायनीज भेळ',
    'Jain Charges': 'जैन चार्जेस',
    'Ex Fried Noodles': 'एक्स्ट्रा फ्राईड नूडल्स',
    'Water Bottle': 'पाण्याची बाटली',
    'Cold Drinks': 'कोल्ड ड्रिंक्स',
    'Ice-cream': 'आईस्क्रीम',
};

export const PORTION_MR = {
    'Single': 'सिंगल',
    'Double': 'डबल',
    'Full': 'फुल',
    'Half': 'हाफ',
    'Plate': 'प्लेट',
    'Extra': 'एक्स्ट्रा',
    'Jodi': 'जोडी',
    'pav': 'पाव',
};

export function t(key, lang) {
    const dict = UI_STRINGS[lang] || UI_STRINGS.en;
    return dict[key] ?? UI_STRINGS.en[key] ?? key;
}

export function translateCategory(cat, lang) {
    if (lang !== 'mr') return cat;
    return CATEGORY_MR[cat] || cat;
}

export function translateItemName(name, lang) {
    if (lang !== 'mr') return name;
    return ITEM_NAME_MR[name] || name;
}

export function translatePortion(portion, lang) {
    if (lang !== 'mr') return portion;
    return PORTION_MR[portion] || portion;
}
