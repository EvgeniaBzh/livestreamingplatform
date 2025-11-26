/**
 * @file FeatureContext.js
 * @author Simon Tenedero, Paola Bustos
 * @created 2025-06-18
 * @lastModified 2025-06-18
 * @description Context for managing user roles and feature flags for A/B testing and modular UI
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { getMyOwnPermissions, AVAILABLE_FEATURES } from '../utils/roleUtils';
import { useUser } from './UserContext';

//create the context
const FeatureContext = createContext();

/**
 * Hook to access feature context
 *
 * @returns {Object} Object containing features, permissions, and utility functions
 */
export const useFeatureFlags = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureProvider');
  }
  return context;
};

/**
 * Provider component for feature flags and role management
 * Uses server-side validation for all permission checks
 * This is a client-side context for UX purposes only (real security is enforced by Firebase Security Rules)
 */
export const FeatureProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useUser(); // Single source of truth for user data

  /**
   * Fetch all user permissions once per user session
   */
  const fetchAllPermissions = async () => {
    try {
      setLoading(true);
      const userPermissions = await getMyOwnPermissions();
      setPermissions(userPermissions);

      console.log(
        `User permissions loaded: ${Object.keys(userPermissions).filter((key) => userPermissions[key])}`
      ); //filter to a list of strings with valid permissions
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has a specific feature permission (client-side check for UX)
   * Note: Real security enforced by Firebase Security Rules
   *
   * @param {string} feature - Feature flag from AVAILABLE_FEATURES
   * @returns {boolean} True if user has access to the feature
   */
  const hasFeature = (feature) => {
    if (!user) {
      // Not logged in - only allow public features
      return feature === AVAILABLE_FEATURES.YOUTUBE_CHAT;
    }

    if (loading) {
      return false;
    }

    return permissions[feature];
  };

  /**
   * Check if user has a specific role (uses UserContext as source of truth)
   */
  const hasRole = (role) => {
    return user?.role === role; //note we aren't doing role.roleName because this user object is from the context - this is not the firebase document
  };

  /**
   * Get user's current role from UserContext
   */
  const getUserRole = () => {
    return user?.role;
  };

  /**
   * Check if user has admin privileges (client-side check for UX)
   */
  const isAdmin = () => {
    return hasRole('admin') && hasFeature(AVAILABLE_FEATURES.ADMIN_PANEL);
  };

  // Fetch permissions when user changes
  useEffect(() => {
    console.log('fetching new set of permissions. user changed');
    if (user) {
      fetchAllPermissions();
    } else {
      // User not logged in - clear permissions
      setPermissions({});
      setLoading(false);
    }
  }, [user]);

  const value = {
    // Core functions (client-side checks for UX only)
    hasFeature,
    hasRole,
    isAdmin,
    getUserRole,
    fetchAllPermissions,

    // State
    loading,
    permissions, // Available for debugging/advanced use

    // Constants for easy access
    FEATURES: AVAILABLE_FEATURES,
  };

  return (
    <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
  );
};
