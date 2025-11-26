/**
 * @file DraggableCard.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file contains the DraggableCard component
 */

import { CSS } from '@dnd-kit/utilities';
import {
  useSortable, //make an individual item draggable
} from '@dnd-kit/sortable';

/**
 * This component is represents a single user card
 *
 * @param {Object} props - The component properties
 * @param {Object} props.card - Card data object
 * @param {string} props.card.id - Unique identifier for the card
 * @param {string} props.card.content - Display content for the card (e.g. user name)
 * @param {string} props.card.photoUrl - URL for the user's profile photo
 *
 * @returns {JSX.Element} A draggable card component that can be reordered in a list
 *
 * @example
 * <DraggableCard
 *   card={{ id: 'user1', content: 'John Doe', photoUrl: 'https://example.com/photo.jpg' }}
 * />
 */
const DraggableCard = ({ card }) => {
  const {
    setNodeRef, //connects this DOM element to Dndkit
    attributes, //accessibility properties for screen readers
    listeners, //event handlers (onMouseDown, onTouchStart, etc.)
    transform, //how much to move the card while dragging
    transition, //animation style
    isDragging, //boolean: is this card currently being dragged
  } = useSortable({ id: card.id }); //NOTE: declaring "hey DndKit, this component with ID 'card.id' can be dragged around", returns the properties and functions to make dragging work

  //create a style object using the arguments we passed
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, //make original card look transparent while dragging
  };

  return (
    <div
      ref={setNodeRef} //IMPORTANT! this tells DndKit 'this is the DOM element to track'
      style={style} //pass the style object
      {...attributes} //spreads accesibility attributes
      {...listeners} //spreads event handlers
      /*
      'cursor-grab' = use 'grabbing' cursor when hovering
      'active:cursor-grabbing' = use 'grabbing' cursor when dragging
      */
      className="bg-base-100 rounded-full px-3 py-2 flex items-center text-white hover:bg-primary transition-colors cursor-grab active:cursor-grabbing"
    >
      <img
        className="w-8 h-8 bg-secondary rounded-full mr-3"
        src={card.photoUrl}
      />{' '}
      <span className="flex-1">{card.content}</span> {/*user display name*/}
      <button className="text-accent hover:text-white">...</button>{' '}
      {/*3 dots for more options*/}
    </div>
  );
};

export default DraggableCard;
