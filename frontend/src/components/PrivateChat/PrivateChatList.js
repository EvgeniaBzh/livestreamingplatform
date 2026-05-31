/**
 * @file PrivateChatList.js
 * @author Simon Tenedero
 * @created 2025-05-26
 * @lastModified 2025-11-26
 * @description file containing PrivateChatList component
 */

import TreasureLogo from '../../assets/Treasure_logo_2023.png'; //placeholder image, need to update to be customizable
import { leavePrivateChat } from '../../utils/privateChatUtils';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useUser } from '../../context/UserContext';

/**
 * This component displays a list of the users' privateChats - it is the 'messages' pane displayed when selected from the private tabs
 * Each tab has an image for the chat, the title, and a recently sent message (deciding if we will include the name of the livestreams)
 *
 * @param {Object} props - The component properties
 * @param {Array} props.chats - Array of chat objects, each with an id, name, and url.
 * @param {Function} props.setPrivateChats - Function to update the private chats state.
 * @param {Function} props.onSelectChat - Callback function to handle chat selection.
 *
 * @returns {JSX.Element} The rendered PrivateChatList component
 */
const PrivateChatList = ({ chats, setPrivateChats, onSelectChat }) => {
  const { user } = useUser();

  const handleLeaveChat = async (chatId) => {
    if (window.confirm('Are you sure you want to leave this chat?')) {
      await leavePrivateChat(user, chatId);
      // fetchChats is handled automatically by the listener in SwitchableChat, so no need to call it manually here
    }
  };

  return (
    <div className="w-full">
      {chats && chats.length > 0 ? (
        chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center w-full pl-6 pr-2 pb-1 hover:bg-base-100 cursor-pointer border-b border-gray-700/50 last:border-0"
            onClick={() => {
              onSelectChat(chat.id);
            }}
          >
            {/* Chat Icon */}
            <img
              className="w-11 h-11 mr-4 border-2 border-gray-600 rounded-full object-cover"
              src={chat.icon || TreasureLogo}
              alt={chat.name + ' logo'}
            />
            
            <div className="flex flex-col flex-grow py-2 overflow-hidden">
              <div className="flex justify-between items-center w-full">
                {/* Chat Name */}
                <p className="font-bold text-sm text-white truncate max-w-[150px]">
                    {chat.name || "Unnamed Chat"}
                </p>

                {/* Menu (Leave Chat) */}
                <Menu as="div" className="relative inline-block text-left ml-2">
                    <MenuButton 
                        className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()} // Prevent opening chat when clicking menu
                    >
                      <span className="text-xl font-bold">⋮</span>
                    </MenuButton>

                    <MenuItems className="absolute right-0 mt-2 w-32 origin-top-right bg-neutral border border-gray-700 rounded-md shadow-lg z-50 focus:outline-none">
                        <MenuItem>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveChat(chat.id);
                              }}
                              className={`${
                                active ? 'bg-red-500 text-white' : 'text-red-400'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors`}
                            >
                              Leave Chat
                            </button>
                          )}
                        </MenuItem>
                    </MenuItems>
                </Menu>
              </div>
              
              {/* Last Message Preview (Placeholder for now) */}
              <p className="text-xs text-gray-400 truncate w-10/12">
                Open to view messages...
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 mt-[30%]">
          <div className="text-4xl mb-2">🤝</div>
          <div className="text-sm text-gray-400 mb-1">No current chats</div>
          <div className="text-xs text-gray-500">
            Why not invite some friends?
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChatList;