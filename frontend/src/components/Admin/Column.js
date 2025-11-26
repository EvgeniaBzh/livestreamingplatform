/**
 * @file Column.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file contains Column component
 */

import EmptyColumnDropArea from './EmptyColumnDropArea';
import DraggableCard from './DraggableCard';
import { CSS } from '@dnd-kit/utilities';

import {
  useSortable, //make an individual item draggable
  SortableContext, //groups items that can be reordered
  verticalListSortingStrategy, //drag up/down in a list
} from '@dnd-kit/sortable';

/**
 * Column component that represents a single role/group column in the admin panel.
 * Can be either draggable (for user-created roles) or fixed (for admin/unrecognized roles).
 *
 * @param {Object} props - The component properties
 * @param {Object} props.column - Column data object
 * @param {string} props.column.id - Unique identifier for the column
 * @param {string} props.column.title - Display title for the column
 * @param {Array} props.column.cards - Array of user cards in this column
 * @param {Function} props.onEditGroup - Callback function when "options" button is clicked
 * @param {boolean} [props.isDraggable=false] - Whether the column can be dragged to reorder
 *
 * @returns {JSX.Element} A draggable or fixed column containing user cards
 *
 * @example
 * //draggable column
 * <Column
 *   column={{ id: 'users', title: 'Users', cards: [...] }}
 *   onEditGroup={handleEdit}
 *   isDraggable={true}
 * />
 *
 * @example
 * //fixed column
 * <Column
 *   column={{ id: 'admin', title: 'Admin', cards: [...] }}
 *   onEditGroup={handleEdit}
 * />
 */
const Column = ({ column, onEditGroup, isDraggable = false }) => {
  //only use sortable hook if the column is draggable
  const sortableProps = useSortable({
    id: column.id,
    disabled: !isDraggable, //if isDraggable is false, disabled is true
  });

  //only apply drag styles if draggable
  const style = isDraggable
    ? {
        transform: CSS.Transform.toString(sortableProps.transform),
        transition: sortableProps.transition,
      }
    : {};

  //if the column is not draggable, we don't need to set node ref or apply styles
  const containerProps = isDraggable
    ? {
        ref: sortableProps.setNodeRef, //connect this DOM element to DndKit
        style,
        className: sortableProps.isDragging ? 'opacity-50' : '',
      }
    : {};

  //drag handle props for accessibility and event listeners
  const dragHandleProps = isDraggable
    ? {
        ...sortableProps.attributes,
        ...sortableProps.listeners,
      }
    : {};

  return (
    //this is the main container for the column
    <div {...containerProps}>
      <div className="bg-base-200 rounded-lg p-3 w-72 flex-shrink-0 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h2
            {...dragHandleProps}
            className={`font-medium text-white flex items-center gap-2 ${
              isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            {/*if the column is draggable, show drag handle*/}
            {isDraggable && <span className="text-gray-400">⋮⋮</span>}
            {column.title}
          </h2>
          {/*options button to edit group settings*/}
          <button
            onClick={() => onEditGroup(column)}
            className="text-xs text-accent cursor-pointer hover:text-primary transition-colors"
          >
            options
          </button>
        </div>
        {/*SortableContext groups the cards in this column for reordering*/}
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {/*if no cards, display the empty column drop area with text 'drop users here'*/}
          {column.cards.length === 0 ? (
            <EmptyColumnDropArea columnId={column.id} />
          ) : (
            //if there are cards, display them, then a small box at bottom with '+'
            <div className="space-y-2">
              {column.cards.map((card) => (
                <DraggableCard key={card.id} card={card} />
              ))}
              <div className="h-4 w-full rounded border border-dashed border-gray-600 opacity-30 hover:opacity-60 transition-opacity flex items-center justify-center text-xs text-gray-500">
                +
              </div>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default Column;
