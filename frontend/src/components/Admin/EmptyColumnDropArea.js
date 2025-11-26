/**
 * EmptyColumnDropArea.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file contains the empty column drop area component
 */

import {
  useDroppable, //creates an area where you can drop things
} from '@dnd-kit/core';

/**
 * Create an empty area where we can store the individual user cards - this will then be wrapped in a column or 'role card'
 *
 * @param {Object} props - The component properties
 * @param {string} props.columnId - Unique identifier for the column this drop area belongs to
 *
 * @returns {JSX.Element} A drop area for users to drop cards into
 */
const EmptyColumnDropArea = ({ columnId }) => {
  const {
    setNodeRef, //connect this DOM element to DndKit
    isOver, //boolean: is something hovering over this area
  } = useDroppable({
    //NOTE: declaring "hey DndKit, this component with ID empty-'column.id' can accept dropped items"
    id: `empty-${columnId}`,
    data: {
      //extra info attached to this drop zone
      type: 'empty-column',
      columnId: columnId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-[100px] border-2 border-dashed rounded-lg flex items-center justify-center text-gray-500 transition-colors 
        ${isOver ? 'border-primary bg-primary bg-opacity-20 text-primary' : 'border-gray-600'}`}
    >
      Drop users here
    </div>
  );
};

export default EmptyColumnDropArea;
