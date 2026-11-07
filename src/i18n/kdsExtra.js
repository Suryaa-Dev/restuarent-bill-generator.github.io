// Extra UI strings for the notification / KDS-serve / edit-served-token features.
// Kept in its own file so the big translations.js does not need to change.
// Usage: tx('key', lang)  — falls back to English, then to the key itself.

const STR = {
    en: {
        // notification events
        evNew: 'New order',
        evUpdate: 'Order updated',
        evRenew: 'Renew order',
        evCancel: 'Cancelled',
        parcel: 'Parcel',
        evMany: 'order updates',

        // notification settings
        notifTitle: 'Order notifications',
        notifDesc: 'Get an alert for every new token, even when you are using another app.',
        notifEnable: 'Enable notifications',
        notifDisable: 'Turn off notifications',
        notifTest: 'Send test notification',
        notifTestBody: 'Notifications are working on this device.',
        notifOn: 'ON',
        notifOff: 'OFF',
        notifBlocked: 'Notifications are blocked for this site. Allow them in the browser / site settings, then come back here.',
        notifUnsupported: 'This browser does not support notifications.',
        notifInstallIos: 'On iPhone / iPad: tap Share → "Add to Home Screen", open the app from the Home Screen, then enable notifications.',
        notifPushOn: 'Background alerts are active — you are alerted even when the app is closed.',
        notifPushOff: 'Alerts appear while the app is still running in the background. For alerts when the app is fully closed, background push must be set up.',
        notifBannerTitle: 'Never miss a new order',
        notifBannerDesc: 'Turn on notifications to be alerted even while you are in another app.',
        notifLater: 'Later',
        notifWorking: 'Please wait…',

        // kitchen serving on behalf of the waiter
        servedToast: 'Marked as served',

        // edit a fully-served token (customer complaint)
        editServed: 'Edit',
        editServedTitle: 'Edit served token',
        editServedHint: 'Customer complained? Cancel the dish, or send it back to the kitchen to be renewed.',
        actCancel: 'Cancel',
        actRenew: 'Renew',
        actCancelLong: 'Cancel dish (removed from bill)',
        actRenewLong: 'Send back to kitchen',
        qtyAffected: 'How many?',
        itemRenewed: 'RENEWED',
        editSummaryCancel: 'cancelled',
        editSummaryRenew: 'renewed',
        editPickOne: 'Choose Cancel or Renew on at least one item.',
        editCancelBillNote: 'Cancelled dishes are also removed from the bill.',
    },
    mr: {
        evNew: 'नवीन ऑर्डर',
        evUpdate: 'ऑर्डर बदलली',
        evRenew: 'ऑर्डर पुन्हा बनवा',
        evCancel: 'रद्द',
        parcel: 'पार्सल',
        evMany: 'ऑर्डर बदल',

        notifTitle: 'ऑर्डर सूचना',
        notifDesc: 'दुसरे अ‍ॅप वापरत असतानाही प्रत्येक नवीन टोकनची सूचना मिळवा.',
        notifEnable: 'सूचना सुरू करा',
        notifDisable: 'सूचना बंद करा',
        notifTest: 'चाचणी सूचना पाठवा',
        notifTestBody: 'या डिव्हाइसवर सूचना व्यवस्थित चालू आहेत.',
        notifOn: 'सुरू',
        notifOff: 'बंद',
        notifBlocked: 'या साइटसाठी सूचना ब्लॉक आहेत. ब्राउझर / साइट सेटिंग्जमध्ये परवानगी द्या आणि परत या.',
        notifUnsupported: 'हा ब्राउझर सूचनांना सपोर्ट करत नाही.',
        notifInstallIos: 'iPhone / iPad वर: Share → "Add to Home Screen" करा, Home Screen वरून अ‍ॅप उघडा, मग सूचना सुरू करा.',
        notifPushOn: 'बॅकग्राउंड सूचना सुरू आहेत — अ‍ॅप बंद असतानाही सूचना मिळेल.',
        notifPushOff: 'अ‍ॅप बॅकग्राउंडमध्ये चालू असेपर्यंत सूचना येतील. अ‍ॅप पूर्ण बंद असतानाही सूचनेसाठी बॅकग्राउंड पुश सेट करावे लागेल.',
        notifBannerTitle: 'नवीन ऑर्डर चुकवू नका',
        notifBannerDesc: 'दुसऱ्या अ‍ॅपमध्ये असतानाही सूचना मिळण्यासाठी सूचना सुरू करा.',
        notifLater: 'नंतर',
        notifWorking: 'थांबा…',

        servedToast: 'सर्व्ह म्हणून नोंदवले',

        editServed: 'बदला',
        editServedTitle: 'सर्व्ह झालेले टोकन बदला',
        editServedHint: 'ग्राहकाची तक्रार आहे का? पदार्थ रद्द करा किंवा पुन्हा बनवण्यासाठी किचनला परत पाठवा.',
        actCancel: 'रद्द',
        actRenew: 'पुन्हा',
        actCancelLong: 'पदार्थ रद्द (बिलमधून काढला जाईल)',
        actRenewLong: 'किचनला परत पाठवा',
        qtyAffected: 'किती?',
        itemRenewed: 'पुन्हा बनवत आहे',
        editSummaryCancel: 'रद्द',
        editSummaryRenew: 'पुन्हा',
        editPickOne: 'किमान एका पदार्थावर रद्द किंवा पुन्हा निवडा.',
        editCancelBillNote: 'रद्द केलेले पदार्थ बिलमधूनही काढले जातात.',
    },
};

export function tx(key, lang) {
    return (STR[lang] || STR.en)[key] ?? STR.en[key] ?? key;
}