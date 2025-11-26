/**
 * @file useDragAndDrop.js
 * @author Yevheniia Bazhmaieva, Paola Bustos, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description Custom hook to manage drag-and-drop functionality for columns and cards in the admin panel
 */

import {
  KeyboardSensor, //allows you to drag with keyboard (for accessibility)
  PointerSensor, //detects mouse clicks and tocuhes
  useSensor, //combines different input methods
  useSensors, //comines different input methods
} from '@dnd-kit/core';

import {
  arrayMove, //helper to reorder arrays
  sortableKeyboardCoordinates, //makes an individual item draggable
} from '@dnd-kit/sortable';

import { assignUserToRole } from '../utils/roleUtils';
import { useState } from 'react';

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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * finds a columns with the given id
   *
   * @param {*} id
   * @returns column with id matching passed argument
   */
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

  /**
   * triggers when a dragging event starts
   *
   * @param {*} event
   */
  const handleDragStart = (event) => {
    const { active } = event;

    // Check if we're dragging a draggable column (not fixed)
    if (draggableColumnOrder.includes(active.id)) {
      setActiveColumn(columns[active.id]);
      return;
    }

    // Otherwise, we're dragging a card
    const containerId = findContainer(active.id);
    console.log('start=', active.id);

    //set the active card and src column
    if (containerId) {
      const card = columns[containerId].cards.find((c) => c.id === active.id);
      setActiveCard(card);
      setSourceColumn(containerId);
    }
  };

  /**
   * triggers during the dragging, before the element is dropped
   *
   * @param {*} event
   */
  const handleDragOver = (event) => {
    const { active, over } = event;

    if (!over) return;

    //skip if dragging a column, not needed since columns are ordered as 1-D arrays
    if (draggableColumnOrder.includes(active.id)) return;

    //cards have more complex behaviour (2-D arrays, across columns and the order within a column itself)
    const activeContainer = findContainer(active.id); //where card came from
    const overContainer = findContainer(over.id) || over.id; //where card is going

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    setColumns((prev) => {
      const activeItems = prev[activeContainer].cards; //source column's cards
      const overItems = prev[overContainer].cards; //target column's cards

      const activeIndex = activeItems.findIndex(
        (item) => item.id === active.id
      );
      const newActiveItems = activeItems.filter(
        (item) => item.id !== active.id
      ); //remove from source
      const newOverItems = [...overItems]; //copy target column

      if (over.id in prev || overItems.length === 0) {
        newOverItems.push(activeItems[activeIndex]); //add card to end of target column
      } else {
        const overIndex = overItems.findIndex((item) => item.id === over.id);
        newOverItems.splice(overIndex, 0, activeItems[activeIndex]); //insert card at relevant position
      }

      return {
        ...prev,
        [activeContainer]: {
          ...prev[activeContainer],
          cards: newActiveItems,
        },
        [overContainer]: {
          ...prev[overContainer],
          cards: newOverItems,
        },
      };
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    //clear active card/column - to prevent confusing overlay rendering
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) {
      setSourceColumn(null);
      return;
    }

    //handle draggable column reordering (only for non-fixed columns)
    if (draggableColumnOrder.includes(active.id)) {
      const oldIndex = draggableColumnOrder.indexOf(active.id);
      const newIndex = draggableColumnOrder.indexOf(over.id);

      if (oldIndex !== newIndex) {
        setDraggableColumnOrder(
          arrayMove(draggableColumnOrder, oldIndex, newIndex)
        );
      }
      return;
    }

    //handle card drag end (existing logic)
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id) || over.id;

    if (!activeContainer || !overContainer) {
      console.log('not active container or overContainer, returning null');
      setSourceColumn(null);
      return;
    }

    console.log('made it through first 2 checks');
    console.log('originalContainer:', sourceColumn);
    console.log('overContainer:', overContainer);

    if (sourceColumn !== overContainer) {
      console.log('entered A - role assignment');

      try {
        const targetRole = Object.values(rolesData).find(
          (role) => (role.roleName || role.id) === overContainer
        );

        if (!targetRole) {
          console.error(`Role document not found for: ${overContainer}`);
          setSourceColumn(null);
          return;
        }

        console.log('active.id=', active.id);
        console.log('targetrole.id=', targetRole.id);
        await assignUserToRole(active.id, targetRole.id);

        console.log(
          `Successfully assigned user ${active.id} to role ${targetRole.roleName}`
        );
      } catch (error) {
        console.error('Error updating user role:', error);
      }
    }

    if (sourceColumn === overContainer) {
      console.log('entered B - reordering within same column');

      const items = columns[activeContainer].cards;
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== newIndex) {
        setColumns((prev) => ({
          ...prev,
          [activeContainer]: {
            ...prev[activeContainer],
            cards: arrayMove(items, oldIndex, newIndex),
          },
        }));
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
