import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { landingPath } from '../permissions';
import NoAccessPage from './NoAccessPage';

// Renders the page only when the account has at least one of `anyOf`; otherwise sends the person
// to the first screen they may use (or a "no access" page when there is none).
export default function ProtectedRoute({ anyOf, path, children }) {
    const { canAny, can } = useAuth();
    if (canAny(anyOf)) return children;
    const home = landingPath(can);
    if (!home || home === path) return <NoAccessPage />;
    return <Navigate to={home} replace />;
}
