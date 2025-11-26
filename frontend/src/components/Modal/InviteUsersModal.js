/**
 * @file InviteUsersModal.js
 * @author Simon Tenedero
 * @created 2025-07-02
 * @lastModified 2025-07-02
 * @description file containing InviteUsersModal component
 */

/**
 * NOTE: This component is currently a placeholder and does not implement any functionality.
 * It is intended to be a dynamic popup component for inviting users to a group or chat.
 *
 * @param {Object} props - The component properties
 * @param {Function} props.onClose - Function to close the modal
 *
 * @returns {JSX.Element} The rendered InviteUsersModal component
 */
const InviteUsersModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-800 float-right"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Invite Users</h2>
      </div>
    </div>
  );
};

export default InviteUsersModal;
