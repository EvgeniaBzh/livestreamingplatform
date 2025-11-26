/**
 * @file AdminRoute.js
 * @author Paola Bustos
 * @created 2025-06-18
 * @lastModified 2025-06-18
 * @description Route guard component that protects admin-only pages. (Extra security layer in case someone types the URL directly)
 */

import { Navigate } from 'react-router-dom';
import { useFeatureFlags } from '../context/FeatureContext';

/**
 * Route guard component that only allows admin users to access protected routes
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Components to render if user is admin
 * @param {string} [props.redirectTo='/'] - Path to redirect non-admin users
 *
 * @returns {JSX.Element} Children if admin, redirect otherwise
 */
function AdminRoute({ children, redirectTo = '/' }) {
  const { isAdmin, loading, userRole } = useFeatureFlags();

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-base-300 via-base-200 to-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect if user is not admin (in case they typed URL directly)
  if (!isAdmin()) {
    console.warn(`Access denied to admin route. User role: ${userRole}`);
    return <Navigate to={redirectTo} replace />;
  }

  // User is admin, render the protected component
  return children;
}

export default AdminRoute;
