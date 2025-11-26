/**
 * CreateNewGroupButton.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file contains CreateNewGroupButton component
 */

/**
 * Button to create a new group in the admin panel
 *
 * @param {*} props - The component properties
 * @param {Function} props.onClick - Callback function to handle button click
 *
 * @returns {JSX.Element} - A button that allows the user to create a new group
 */
const CreateNewGroupButton = ({ onClick }) => {
  return (
    <div className="flex items-center justify-center bg-base-200 rounded-lg p-3 w-72 flex-shrink-0 h-20 shadow-lg hover:bg-base-300 transition-colors">
      <button
        onClick={onClick}
        className="text-accent hover:text-primary transition-colors font-medium flex items-center gap-2"
      >
        Create New Group
      </button>
    </div>
  );
};

export default CreateNewGroupButton;
