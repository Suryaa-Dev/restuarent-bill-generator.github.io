// Strings for the Serve Management tab. Usage: ts('key', lang)  (falls back to English)
const STR = {
    en: {
        tabServe: 'Serve',
        pickPrompt: 'Select a dish or a table',
        tableTitle: 'Table',
        pendingDishes: 'Pending dishes',
        close: 'Close',
        token: 'Token',
        sentBlocked: 'This is already sent to the kitchen. To reduce it, cancel or update the token below.',
    },
    mr: {
        tabServe: 'सर्व्ह',
        pickPrompt: 'पदार्थ किंवा टेबल निवडा',
        tableTitle: 'टेबल',
        pendingDishes: 'प्रलंबित पदार्थ',
        close: 'बंद करा',
        token: 'टोकन',
        sentBlocked: 'हे आधीच किचनला पाठवले आहे. कमी करण्यासाठी खालील टोकन रद्द करा किंवा अपडेट करा.',
    },
};

export const ts = (key, lang) => (STR[lang] || STR.en)[key] ?? STR.en[key] ?? key;