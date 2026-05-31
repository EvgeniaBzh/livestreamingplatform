/**
 * @file useDragAndDrop.js
 * @description Custom hook to manage drag-and-drop functionality
 */

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useState } from 'react';

// Використовуємо функцію assignUserToRoleCloud, яка зараз є основним методом
import { assignUserToRoleCloud } from '../utils/roleUtils'; 

export const useDragAndDrop = (
  columns,
  setColumns,
  rolesData,
  draggableColumnOrder,
  setDraggableColumnOrder
) => {
  const [activeColumn, setActiveColumn] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [sourceColumn, setSourceColumn] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, 
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id) => {
    if (id.startsWith('empty-')) {
      return id.replace('empty-', '');
    }
    if (id in columns) {
      return id;
    }
    return Object.keys(columns).find((key) =>
      columns[key].cards.some((card) => card.id === id)
    );
  };

  const handleDragStart = (event) => {
    const { active } = event;
    if (draggableColumnOrder.includes(active.id)) {
      setActiveColumn(columns[active.id]);
      return;
    }
    const containerId = findContainer(active.id);
    if (containerId) {
      const card = columns[containerId].cards.find((c) => c.id === active.id);
      setActiveCard(card);
      setSourceColumn(containerId);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    if (draggableColumnOrder.includes(active.id)) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id) || over.id;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Візуальне оновлення (Optimistic UI)
    setColumns((prev) => {
      const activeCol = prev[activeContainer];
      const overCol = prev[overContainer];

      if (!activeCol || !overCol) return prev;

      const activeItems = activeCol.cards;
      const overItems = overCol.cards;
      const activeIndex = activeItems.findIndex((item) => item.id === active.id);
      const newActiveItems = activeItems.filter((item) => item.id !== active.id);
      const newOverItems = [...overItems];

      const overIndex = overItems.findIndex((item) => item.id === over.id);
      
      if (over.id in prev || overItems.length === 0) {
        newOverItems.push(activeItems[activeIndex]);
      } else {
        const modifier = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height ? 1 : 0;
        const newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        newOverItems.splice(newIndex, 0, activeItems[activeIndex]);
      }

      return {
        ...prev,
        [activeContainer]: { ...prev[activeContainer], cards: newActiveItems },
        [overContainer]: { ...prev[overContainer], cards: newOverItems },
      };
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) {
      setSourceColumn(null);
      return;
    }

    // Логіка для колонок
    if (draggableColumnOrder.includes(active.id)) {
      const oldIndex = draggableColumnOrder.indexOf(active.id);
      const newIndex = draggableColumnOrder.indexOf(over.id);
      if (oldIndex !== newIndex) {
        setDraggableColumnOrder(arrayMove(draggableColumnOrder, oldIndex, newIndex));
      }
      return;
    }

    // Логіка для карток (Юзерів)
    const rawOverContainer = findContainer(over.id) || over.id;
    const overContainer = String(rawOverContainer).replace("empty-", "");

    if (sourceColumn && overContainer) {
      if (sourceColumn !== overContainer) {
        console.log(`Moving user ${active.id} from ${sourceColumn} to ${overContainer}`);

        try {
          // Знаходимо справжній ID ролі
          const targetRole = Object.values(rolesData).find(
            (role) => (role.roleName || role.id) === overContainer
          );

          if (!targetRole) {
            console.error(`Role document not found for column: ${overContainer}`);
            return;
          }

          // Викликаємо функцію оновлення бази даних
          await assignUserToRoleCloud(active.id, targetRole.id);

          console.log(`Successfully assigned user ${active.id} to role ${targetRole.roleName}`);
        } catch (error) {
          console.error('Error updating user role in DB:', error);
        }
      } 
    }
    setSourceColumn(null);
  };

  return {
    sensors,
    activeColumn,
    activeCard,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
};