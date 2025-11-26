/**
 * @file useModalManagement.js
 * @author Simon Tenedero, Paola Bustos, Yevheniia Bazhmaieva
 * @created 2024-XX-XX
 * @lastModified 2025-07-07
 * @description Custom hook to manage modal states for group creation and updates in the admin panel.
 */

import { useState } from 'react';

export const useModalManagement = (rolesData, refetchRoles) => {
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isUpdateGroupModalOpen, setIsUpdateGroupModalOpen] = useState(false);
  const [selectedGroupData, setSelectedGroupData] = useState(null);

  const handleGroupCreated = () => {
    refetchRoles();
  };

  const handleEditGroup = (column) => {
    const roleData = Object.values(rolesData).find(
      (role) => (role.roleName || role.id) === column.id
    );

    if (roleData) {
      setSelectedGroupData(roleData);
      setIsUpdateGroupModalOpen(true);
    } else {
      console.error('Role data not found for column:', column.id);
    }
  };

  const handleCreateModalClose = () => {
    setIsCreateGroupModalOpen(false);
  };

  const handleUpdateModalClose = () => {
    setIsUpdateGroupModalOpen(false);
    setSelectedGroupData(null);
  };

  return {
    isCreateGroupModalOpen,
    setIsCreateGroupModalOpen,
    isUpdateGroupModalOpen,
    selectedGroupData,
    handleGroupCreated,
    handleEditGroup,
    handleCreateModalClose,
    handleUpdateModalClose,
  };
};
