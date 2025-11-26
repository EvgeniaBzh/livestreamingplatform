/**
 * @file FeatureGates.js
 * @author Paola Bustos, Simon Tenedero
 * @created 2025-06-18
 * @lastModified 2025-06-18
 * @description Gate components for conditional rendering based on user roles and feature flags
 */

import { useFeatureFlags } from '../../context/FeatureContext';
import { forwardRef } from 'react';

/**
 * forwardRef explanation:
 * The Problem
 * Imagine trying to hand someone a note through their backpack instead of directly to them. The backpack can't receive the note - only the person can.
 *
 * That's what's happening here:
 * HeadlessUI wants to pass a "remote control" (called a ref) to control menu items
 * FeatureGate is like a backpack - it's just a wrapper and can't receive the remote control
 * NavLink (in PagesMenu.js) is the actual element that should get the remote control
 *
 * Why HeadlessUI Needs This Remote Control
 * HeadlessUI creates accessible menus that need to:
 * Move focus when you press arrow keys
 * Close when you click outside the menu
 * Work with screen readers for blind users
 * Position dropdowns in the right place
 * To do all this, HeadlessUI needs direct control over the actual DOM elements.
 *
 * The Solutions
 * 1. Teach the wrapper to pass it along - Use forwardRef to make FeatureGate pass the ref through to the real element
 * 2. Add a middleman - Put a <div> between MenuItem and FeatureGate to catch the ref
 * 3. Rearrange the order - Move FeatureGate outside so MenuItem can connect directly to NavLink
 */

/**
 * Gate component that renders children only if user has the specified feature
 *
 * @param {Object} props - Component props
 * @param {string} props.flag - Feature flag from AVAILABLE_FEATURES to check
 * @param {ReactNode} props.children - Components to render if user has feature access
 * @param {ReactNode} [props.fallback] - Optional fallback content when access is denied
 * @param {React.Ref} [ref] - Optional ref to forward to the children component
 *
 * @returns {JSX.Element|null} Children if user has feature, fallback or null otherwise
 */
export const FeatureGate = forwardRef(
  ({ flag, children, fallback = null }, ref) => {
    const { hasFeature, loading } = useFeatureFlags();

    // Show loading state if permissions are still being fetched
    if (loading) {
      return <div className="loading loading-spinner loading-sm"></div>;
    }

    hasFeature(flag) ? console.log('accepted') : console.log('denied.');

    // Render children if user has the required feature
    return hasFeature(flag) ? children : fallback;
  }
);

/**
 * Gate component that renders children only if user has the specified role
 *
 * @param {Object} props - Component props
 * @param {string} props.role - Role to check
 * @param {ReactNode} props.children - Components to render if user has role
 * @param {ReactNode} [props.fallback] - Optional fallback content when access is denied
 * @returns {JSX.Element|null} Children if user has role, fallback or null otherwise
 */
export const RoleGate = forwardRef(
  ({ role, children, fallback = null }, ref) => {
    const { hasRole, loading } = useFeatureFlags();

    // Show loading state if role is still being fetched
    if (loading) {
      return <div className="loading loading-spinner loading-sm"></div>;
    }

    // Render children if user has the required role
    return hasRole(role) ? children : fallback;
  }
);

/**
 * Gate component for admin-only content with enhanced security
 * Uses both role check and admin panel feature check
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Components to render for admin users
 * @param {boolean} [props.showError] - Whether to show access denied message
 * @returns {JSX.Element|null} Children if user is admin, error message or null otherwise
 */
export const AdminGate = ({ children, showError = false }) => {
  const { isAdmin, loading } = useFeatureFlags();

  if (loading) {
    return <div className="loading loading-spinner loading-sm"></div>;
  }

  if (isAdmin()) {
    return children;
  }

  // Show access denied message if requested
  if (showError) {
    return (
      <div className="alert alert-error">
        <span>Access denied. Admin privileges required.</span>
      </div>
    );
  }

  return null;
};
