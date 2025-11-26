/**
 * @file AdminPanel.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-06-18
 * @lastModified 2025-07-07
 * @description file containing the AdminPanel component.
 */

/* imports from the react beautiful dnd library, to make draggable cards */

import {
  DndContext, //think of this as the environment where all the dragging happens
  DragOverlay, //shows a preview of what you're dragging
  closestCorners, //algorithm to detect where you're dropping
} from '@dnd-kit/core';

import {
  SortableContext, //groups items that can be reordered
  horizontalListSortingStrategy, // drag left/right in a row
} from '@dnd-kit/sortable';

import { useRolesData } from '../hooks/useRolesData';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useModalManagement } from '../hooks/useAdminModalManagement';

import Column from '../components/Admin/Column';
import AdminHeader from '../components/Admin/AdminHeader';
import CreateNewGroupButton from '../components/Admin/CreateNewGroupButton';
import CreateGroupModal from '../components/Modal/CreateGroupModal';
import UpdateGroupModal from '../components/Modal/UpdateGroupModal';

/**
 * Inspired by Trello.
 * The AdminPanel page serves as the main interface for administrators to manage user roles and groups.
 * It displays fixed columns for admin and unrecognized roles, allows for the creation of new groups,
 * and supports drag-and-drop functionality for reordering user-created roles.
 *
 * @returns {JSX.Element} The rendered AdminPanel page
 */
const AdminPanel = () => {
  const {
    loading,
    rolesData,
    columns,
    setColumns,
    fixedColumns,
    draggableColumnOrder,
    setDraggableColumnOrder,
    refetch,
  } = useRolesData();

  // Modal management
  const {
    isCreateGroupModalOpen,
    setIsCreateGroupModalOpen,
    isUpdateGroupModalOpen,
    selectedGroupData,
    handleGroupCreated,
    handleEditGroup,
    handleCreateModalClose,
    handleUpdateModalClose,
  } = useModalManagement(rolesData, refetch);

  const {
    sensors,
    activeColumn,
    activeCard,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragAndDrop(
    columns,
    setColumns,
    rolesData,
    draggableColumnOrder,
    setDraggableColumnOrder
  );

  //return a loading spinner if component not loaded yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <AdminHeader />

      <div className="flex overflow-x-auto p-4 gap-4 min-h-screen items-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/*fixed columns first */}
          {fixedColumns.map(
            (columnId) =>
              columns[columnId] && (
                <Column
                  key={columnId}
                  column={columns[columnId]}
                  onEditGroup={handleEditGroup}
                />
              )
          )}

          {/*draggable columns */}
          <SortableContext
            items={draggableColumnOrder}
            strategy={horizontalListSortingStrategy}
          >
            {draggableColumnOrder.map(
              (columnId) =>
                columns[columnId] && (
                  <Column
                    key={columnId}
                    column={columns[columnId]}
                    onEditGroup={handleEditGroup}
                    isDraggable={true}
                  />
                )
            )}
          </SortableContext>

          <CreateNewGroupButton
            onClick={() => setIsCreateGroupModalOpen(true)}
          />

          <DragOverlay>
            {activeColumn ? (
              <div className="bg-base-200 rounded-lg p-3 w-72 shadow-lg opacity-90 rotate-2">
                <h2 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span className="text-gray-400">⋮⋮</span>
                  {activeColumn.title}
                </h2>
                <div className="space-y-2">
                  {activeColumn.cards.slice(0, 3).map((card) => (
                    <div
                      key={card.id}
                      className="bg-base-100 rounded-full px-3 py-2 flex items-center"
                    >
                      <div className="w-8 h-8 bg-secondary rounded-full mr-3"></div>
                      <span className="flex-1">{card.content}</span>
                    </div>
                  ))}
                  {activeColumn.cards.length > 3 && (
                    <div className="text-center text-gray-500 text-sm">
                      +{activeColumn.cards.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ) : activeCard ? (
              <div className="bg-base-100 rounded-full px-3 py-2 mb-2 flex items-center text-white opacity-90 rotate-3 scale-105">
                <div className="w-8 h-8 bg-secondary rounded-full mr-3"></div>
                <span className="flex-1">{activeCard.content}</span>
                <button className="text-accent">...</button>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={handleCreateModalClose}
        onGroupCreated={handleGroupCreated}
      />

      <UpdateGroupModal
        isOpen={isUpdateGroupModalOpen}
        onClose={handleUpdateModalClose}
        onGroupCreated={handleGroupCreated}
        groupData={selectedGroupData}
      />
    </div>
  );
};

export default AdminPanel;
