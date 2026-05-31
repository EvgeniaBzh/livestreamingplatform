/**
 * @file FeatureContext.js
 * @author Simon Tenedero, Paola Bustos
 * @created 2025-06-18
 * @lastModified 2025-11-26
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
  const [permissionsLoading, setPermissionsLoading] = useState(true); 
  
  // ВАЖЛИВО: Беремо loading з UserContext
  // Це та сама логіка, яка "не викидає" вас. Ми чекаємо, поки UserContext скаже "Я все"
  const { user, loading: userLoading } = useUser(); 

  // Загальний статус завантаження: або вантажиться юзер, або вантажаться права
  const isLoading = userLoading || permissionsLoading;

  /**
   * Fetch all user permissions once per user session
   */
  const fetchAllPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const userPermissions = await getMyOwnPermissions();
      setPermissions(userPermissions);

      console.log(
        `User permissions loaded: ${Object.keys(userPermissions).filter((key) => userPermissions[key])}`
      ); 
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setPermissions({});
    } finally {
      setPermissionsLoading(false);
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
    // Якщо ще йде завантаження - повертаємо false (але AdminRoute буде чекати через loading flag)
    if (isLoading) return false;

    if (!user) {
      // Not logged in - only allow public features
      return feature === AVAILABLE_FEATURES.YOUTUBE_CHAT;
    }

    return permissions[feature];
  };

  /**
   * Check if user has a specific role (uses UserContext as source of truth)
   */
  const hasRole = (roleToCheck) => {
    if (isLoading) return false;
    // ВИПРАВЛЕННЯ: Перевіряємо ID ролі з об'єкта
    const userRoleId = user?.role?.roleId || user?.role; 
    return userRoleId === roleToCheck; 
  };

  /**
   * Get user's current role from UserContext
   */
  const getUserRole = () => {
    return user?.role?.roleId || user?.role;
  };

  /**
   * Check if user has admin privileges (client-side check for UX)
   */
  const isAdmin = () => {
    if (isLoading) return false; // Поки вантажиться - не пускаємо, але і не викидаємо (бо loading=true)
    
    // Перевіряємо роль Admin або ваш старий ID
    const hasAdminRole = hasRole('admin') || hasRole('isXI4WLotri8r7v3SFa6') || user?.role?.roleName === 'Admin';
    
    // Для надійності перевіряємо і роль, і фічу доступу до панелі
    return hasAdminRole && (permissions[AVAILABLE_FEATURES.ADMIN_PANEL] === true);
  };

  // Fetch permissions when user changes
  useEffect(() => {
    // Якщо юзер ще вантажиться - нічого не робимо, чекаємо
    if (userLoading) {
        return; 
    }

    console.log('User state settled. User:', user ? 'Found' : 'Not found');

    if (user) {
      fetchAllPermissions();
    } else {
      // User not logged in - clear permissions
      setPermissions({});
      setPermissionsLoading(false);
    }
  }, [user, userLoading]);

  const value = {
    // Core functions (client-side checks for UX only)
    hasFeature,
    hasRole,
    isAdmin,
    getUserRole,
    fetchAllPermissions,

    // State
    loading: isLoading, // Передаємо комбінований статус завантаження
    permissions, // Available for debugging/advanced use
    userRole: getUserRole(),

    // Constants for easy access
    FEATURES: AVAILABLE_FEATURES,
  };

  return (
    <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
  );
};