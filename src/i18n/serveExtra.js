// Strings for the Serve Management tab. Usage: ts('key', lang)  (falls back to English)
const STR = {
    en: {
        tabServe: 'Serve',
        pickPrompt: 'Select a category or a table',
        tableTitle: 'Table',
        pendingDishes: 'Pending dishes',
        close: 'Close',
        token: 'Token',
    },
    mr: {
        tabServe: 'सर्व्ह',
        pickPrompt: 'कॅटेगरी किंवा टेबल निवडा',
        tableTitle: 'टेबल',
        pendingDishes: 'प्रलंबित पदार्थ',
        close: 'बंद करा',
        token: 'टोकन',
    },
};

export const ts = (key, lang) => (STR[lang] || STR.en)[key] ?? STR.en[key] ?? key;
