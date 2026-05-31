/**
 * @file ChatCreationModal.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-11
 * @description file containing ChatCreationModal component
 */

import React, { useState, useEffect } from 'react';
import { fetchUsers } from '../../utils/usersUtils';

/**
 * This component is a modal (popup) that allows users to create a private chat - this appears when the CreatePrivateChatButton component is clicked
 * It displays a form with input fields for the chat name and live URL.
 * It also displays a list of users that can be invited to the chat.
 * Users can be selected or removed from the list of invited users.
 * When the create button is clicked, the chat is created with the specified settings.
 *
 * @param {Object} props - The properties passed to the component
 * @param {Function} props.onCreateChat - Function to set the chat settings and create the chat
 * @param {Function} props.onClose - Function to close the chat creation menu
 * @param {Object} props.currentUser - Object with current user info { uid: string, username: string, email: string }
 * @param {Boolean} props.showLoginAlert - state variable to determine if login alert is showing (notify users they must be logged in to create chats)
 * @param {Function} props.setShowLoginAlert - setState function for showLoginAlert
 * @param {Function} props.setPrivateChats - setState function for privateChats
 *
 * @returns {JSX.Element} The rendered ChatCreationModal component
 */
const ChatCreationModal = ({
  onCreateChat,
  onClose,
  currentUser,
  showLoginAlert,
  setShowLoginAlert,
  setPrivateChats,
}) => {
  const [chatName, setChatName] = useState(''); // State variable for the chat name
  const [chatUrl, setChatUrl] = useState(''); // State variable for the live URL
  const [invitedUsers, setInvitedUsers] = useState([]); // State variable for the list of invited users
  const [users, setUsers] = useState([]); // State variable for the list of users
  const [isLoading, setIsLoading] = useState(true); // State variable for loading state

  // Fetch users from the database when the component mounts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await fetchUsers();
        console.log('[DEBUG: ChatCreationModal] Fetched users:', fetchedUsers);
        
        // Filter out current user from the list
        const filteredUsers = fetchedUsers.filter(
          (user) => user.uid !== currentUser?.uid
        );
        
        setUsers(filteredUsers);
      } catch (error) {
        console.error('[ERROR: ChatCreationModal] Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  // Helper function to get user display name with fallback logic
  const getUserDisplayName = (user) => {
    return user.username || user.displayName || user.email || 'Unknown User';
  };

  // Function to add a user to list of invited users
  const handleUserSelect = (user) => {
    if (user.uid !== currentUser.uid && !invitedUsers.some((u) => u.uid === user.uid)) {
      setInvitedUsers((prev) => [...prev, user]);
    }
  };

  // Function to remove a user from the list of invited users
  const handleUserRemove = (user) => {
    setInvitedUsers((prev) => prev.filter((u) => u.uid !== user.uid));
  };

  // Function to create the chat with the specified settings
  const handleCreateChat = async () => {
    // Validation
    if (!chatName.trim()) {
      alert('Please enter a chat name');
      return;
    }

    if (!chatUrl.trim()) {
      alert('Please enter a YouTube URL');
      return;
    }

    if (invitedUsers.length === 0) {
      alert('Please invite at least one user');
      return;
    }

    const chatSettings = {
      name: chatName,
      url: chatUrl,
      invitedUsers,
    };

    try {
      await onCreateChat(chatSettings, setPrivateChats);
      onClose(); // Close the menu after creating the chat
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat. Please try again.');
    }
  };

  return (
    <>
      {showLoginAlert && (
        <div className="active-users-modal fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div className="modal-content bg-primary rounded-lg shadow-lg p-4 w-full max-w-md dark:bg-gray-800">
            <span
              className="close text-red-500 hover:text-red-800 cursor-pointer float-right"
              onClick={() => {
                setShowLoginAlert(!showLoginAlert);
              }}
            >
              &times;
            </span>
            <h2 className="text-current text-2xl font-semibold m-4 text-center">
              You must Login to create Private Chats!
            </h2>
          </div>
        </div>
      )}

      {currentUser && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1005]">
          <div className="bg-secondary p-6 rounded-lg max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Create Private Chat</h2>

            <input
              type="text"
              placeholder="Chat Name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="mb-4 p-2 border rounded w-full text-black"
            />

            <input
              type="text"
              placeholder="Live URL (YouTube)"
              value={chatUrl}
              onChange={(e) => setChatUrl(e.target.value)}
              className="mb-4 p-2 border rounded w-full text-black"
            />
            
            <h3 className="font-semibold mb-2">Invite Users</h3>

            {/* Show invited users count */}
            {invitedUsers.length > 0 && (
              <div className="mb-2 text-sm text-gray-400">
                {invitedUsers.length} user{invitedUsers.length !== 1 ? 's' : ''} invited
              </div>
            )}

            <div className="mb-4 max-h-40 overflow-y-auto border rounded p-2">
              {isLoading ? (
                <div className="text-center text-gray-400 py-4">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  No other users available
                </div>
              ) : (
                users.map((user) => {
                  const isInvited = invitedUsers.some((u) => u.uid === user.uid);
                  const displayName = getUserDisplayName(user);
                  
                  return (
                    <div
                      key={user.uid}
                      className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-center space-x-2">
                        {/* Avatar or initial */}
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-black font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-white">{displayName}</span>
                      </div>
                      
                      {isInvited ? (
                        <button
                          onClick={() => handleUserRemove(user)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUserSelect(user)} 
                          className="text-accent hover:text-white text-sm"
                        >
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChat}
                className="bg-accent hover:bg-white hover:text-black text-black px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatCreationModal;