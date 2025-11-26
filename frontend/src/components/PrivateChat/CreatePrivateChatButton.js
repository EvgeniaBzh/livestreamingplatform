/**
 * @file CreatePrivateChatButton.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-05-27
 * @description file containing CreatePrivateChatButton component
 */

import { useState } from 'react';
import ChatCreationModal from '../Modal/ChatCreationModal.js';

import {
  createChat,
  //simulateInvite,
  fetchChats,
} from '../../utils/privateChatUtils';
import { useUser } from '../../context/UserContext';

const MAX_PRIVATE_CHATS = 10; // Maximum number of private chats allowed

/**
 * This component is a button that allows users to create a new private chat.
 *
 * @param {Object} props - The component properties
 * @param {Array} props.privateChats - Array of private chat objects.
 * @param {Function} props.setPrivateChats - Function to update the private chats state.
 * @param {Function} props.setNotification - Function to set notification messages (currently commented out).
 * @param {Function} props.handleSimulateInvite - Function to simulate an invite (currently commented out).
 *
 * @returns {JSX.Element} The rendered CreatePrivateChatButton component
 */
const CreatePrivateChatButton = ({
  privateChats,
  setPrivateChats,
  //setNotification
  // handleSimulateInvite, // Commented out
}) => {
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const { user } = useUser();

  /**
   * Handles the creation of a new chat if the limit has not been reached.
   * @param {Object} chatSettings - Settings for the new chat.
   */
  const handleCreateChat = async (chatSettings, setPrivateChats) => {
    if (privateChats.length < MAX_PRIVATE_CHATS) {
      await createChat(chatSettings, user); // Create new chat
      setShowChatCreationModal(false); // Close chat creation menu
      await fetchChats(user, setPrivateChats);
    } else {
      alert(`You can only create up to ${MAX_PRIVATE_CHATS} private chats.`);
    }
  };

  /**
   * Simulates a chat invitation for testing purposes.
   */
  /*
  const handleSimulateInvite = async () => {
    await simulateInvite(user);
  };*/

  /**
   * Sets and displays a notification message for a short period.
   * @param {string} message - Notification message to display.
   */
  /*
  const handleInviteNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 5000); // Clear notification after 5 seconds
  };*/

  const [showChatCreationModal, setShowChatCreationModal] = useState(false); // State for showing chat creation menu

  return (
    <>
      {/* Commenting out the Simulate Invite Button */}
      {/* <button
        onClick={handleSimulateInvite}
        className="btn-secondary mb-4 px-4 py-2 text-white rounded"
      >
        Simulate Invite
      </button> */}

      {/* Login Alert Modal */}
      {showLoginAlert && (
        <div className="active-users-modal fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div className="modal-content bg-primary rounded-lg shadow-lg p-4 w-full max-w-md dark:bg-gray-800">
            <span
              className="close text-red-500 hover:text-red-800 cursor-pointer float-right"
              onClick={() => setShowLoginAlert(false)}
            >
              &times;
            </span>
            <h2 className="text-current text-2xl font-semibold m-4 text-center">
              You must Login to create Private Chats!
            </h2>
          </div>
        </div>
      )}

      {/* Create Chat Button */}
      <div className="flex flex-col space-y-2 p-2">
        <button
          onClick={() => {
            setShowChatCreationModal(true);
            if (!user) {
              setShowLoginAlert(true);
            }
          }}
          className="justify-center flex text-nowrap text-center text-black w-full btn bg-accent hover:bg-white"
        >
          create chat
        </button>
      </div>

      {/* Chat Creation Menu */}
      {showChatCreationModal && (
        <ChatCreationModal
          onCreateChat={handleCreateChat}
          onClose={() => setShowChatCreationModal(false)}
          currentUser={user}
          showLoginAlert={showLoginAlert}
          setShowLoginAlert={setShowLoginAlert}
          setPrivateChats={setPrivateChats}
        />
      )}
    </>
  );
};

export default CreatePrivateChatButton;
