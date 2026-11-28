import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import AuthGate from './features/auth/components/AuthGate';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { PERMISSIONS as P } from './features/auth/permissions';
import BillingPage from './features/billing/BillingPage';
import DashboardPage from './features/dashboard/DashboardPage';
import OrderHistoryPage from './features/history/OrderHistoryPage';
import KitchenDisplayPage from './features/kds/KitchenDisplayPage';
import { useKdsLaunch } from './features/kds/hooks/useKdsLaunch';

// Every route is guarded: a page opens only for an account with the matching permission.
const ROUTES = [
    { path: '/', anyOf: [P.BILLING_VIEW, P.SERVE_VIEW], element: <BillingPage /> },
    { path: '/kds', anyOf: [P.KDS_VIEW], element: <KitchenDisplayPage /> },
    { path: '/dashboard', anyOf: [P.DASHBOARD_VIEW], element: <DashboardPage /> },
    { path: '/history', anyOf: [P.HISTORY_VIEW], element: <OrderHistoryPage /> },
];

function AppRoutes() {
    // opens the KDS on launch / notification tap when the kitchen phone was last on it
    useKdsLaunch();
    return (
        <Routes>
            {ROUTES.map(r => (
                <Route key={r.path} path={r.path} element={<ProtectedRoute anyOf={r.anyOf} path={r.path}>{r.element}</ProtectedRoute>} />
            ))}
            <Route path="*" element={<ProtectedRoute anyOf={[]} path="*">{null}</ProtectedRoute>} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AuthGate>
                <AppRoutes />
            </AuthGate>
        </AuthProvider>
    );
}
