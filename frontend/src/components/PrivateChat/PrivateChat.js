/**
 * @file PrivateChat.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-11-26
 * @description file containing PrivateChat component with Invite functionality
 */

import { useState, useRef, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Messages from '../Chat/Messages';
import ChatInputForm from '../Chat/ChatInputForm';
import UserInfoModal from '../Modal/UserInfoModal';
import InviteMemberModal from '../Modal/InviteMemberModal'; 
import {
  fetchPrivateChatName,
  fetchPrivateChatMessages,
  sendPrivateChatMessage,
  fetchPrivateChatVideoTitle,
  fetchPrivateChatVideoId,
  leavePrivateChat,
  updatePrivateChatName,
  removePrivateChatMember,
  fetchPrivateChatVideoUrl,
  inviteUsersToPrivateChat,
  fetchPrivateChatMembers // Додаємо імпорт
} from '../../utils/privateChatUtils';
import { useUser } from '../../context/UserContext';

const PrivateChat = ({
  privateChatId,
  videoId,
  updateVideoId,
  togglePrivateUsersModal,
  privateChatMembers,
  setSelectedTab,
  setSelectedPrivateChat,
}) => {
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState(''); 
  const [showOptions, setShowOptions] = useState({}); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [mentionDropdown, setMentionDropdown] = useState([]); 
  const messagesEndRef = useRef(null); 
  const [videoTitle, setVideoTitle] = useState(''); 
  const [videoUrl, setVideoUrl] = useState(''); 
  const [isPopupOpen, setIsPopupOpen] = useState(true); 
  const [privateChatVideoId, setPrivateChatVideoId] = useState(null); 
  const [privateChatName, setPrivateChatName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [chatOwnerId, setChatOwnerId] = useState(null);
  
  // State for the NEW Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempChatName, setTempChatName] = useState('');

  // ВИПРАВЛЕННЯ: Додаємо локальний стан для членів чату
  const [localMembers, setLocalMembers] = useState([]);

  const { user } = useUser();

  const isOwner = user?.uid === chatOwnerId;

  useEffect(() => {
    const fetchVideoData = async () => {
      if (privateChatId) {
        const vidId = await fetchPrivateChatVideoId(privateChatId);
        setPrivateChatVideoId(vidId);
        const url = await fetchPrivateChatVideoUrl(privateChatId);
        setVideoUrl(url);
      }
    };

    const fetchChatData = async () => {
      if (privateChatId) {
        const chatName = await fetchPrivateChatName(privateChatId);
        setPrivateChatName(chatName);
        setTempChatName(chatName);

        try {
            const chatRef = doc(db, 'privateChats', privateChatId);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                setChatOwnerId(chatSnap.data().owner || chatSnap.data().creator);
            }
        } catch (error) {
            console.error("Error fetching chat owner:", error);
        }
      }
    };

    // ВИПРАВЛЕННЯ: Завантажуємо членів напряму з Firebase
    const fetchChatMembersData = async () => {
      if (privateChatId) {
        try {
          const members = await fetchPrivateChatMembers(privateChatId);
          console.log("Fetched members:", members);
          setLocalMembers(members);
          
          // Оновлюємо mentionDropdown тільки з активних членів
          const activeMembers = members
            .filter(([_, status]) => status === 'accepted' || status === 'owner' || status === 'member')
            .map(([user]) => user);
          setMentionDropdown(activeMembers);
        } catch (error) {
          console.error("Error fetching members:", error);
        }
      }
    };

    if (privateChatId) {
      const unsubscribeMessages = fetchPrivateChatMessages(privateChatId, setMessages);
      const unsubscribeVideoTitle = fetchPrivateChatVideoTitle(privateChatId, setVideoTitle);
      
      fetchVideoData();
      fetchChatData();
      fetchChatMembersData();

      return () => {
        unsubscribeMessages();
        unsubscribeVideoTitle();
      };
    }
  }, [privateChatId]);

  const handleSendClick = async (e) => {
    e.preventDefault();
    await sendPrivateChatMessage(privateChatId, user, input, setInput);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClickOutside = (event) => {
    if (!event.target.closest('.options-menu')) {
      setShowOptions({});
    }
  };

  const handleSeeAccountInfo = async (uid) => {
    if (!uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setSelectedUser(userSnap.data());
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleRemoveMessage = (index) => {
    setMessages((prevMessages) => prevMessages.filter((_, i) => i !== index)); 
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.includes('@')) {
      const mentionPart = value.split('@').pop().toLowerCase();
      if (mentionPart) {
        const filteredUsers = localMembers
          .filter(
            ([user, status]) =>
              user.username?.toLowerCase().includes(mentionPart.toLowerCase()) &&
              (status === 'accepted' || status === 'owner' || status === 'member')
          )
          .map(([user]) => user);
        setMentionDropdown(filteredUsers);
      } else {
        setMentionDropdown([]);
      }
    } else {
      setMentionDropdown([]);
    }
  };

  const handleLeaveChat = async () => {
    if (window.confirm('Are you sure you want to leave this chat?')) {
      await leavePrivateChat(user, privateChatId);
      setSelectedPrivateChat(null);
      setSelectedTab('privateTab');
    }
  };

  const handleNameSave = async () => {
      if (tempChatName.trim() !== privateChatName) {
          await updatePrivateChatName({ id: privateChatId }, tempChatName);
          setPrivateChatName(tempChatName);
      }
      setIsEditingName(false);
  };

  const handleRemoveMember = async (memberId) => {
      if (window.confirm('Remove this user from chat?')) {
          await removePrivateChatMember(memberId, privateChatId);
          // Оновлюємо локальний список після видалення
          const updatedMembers = await fetchPrivateChatMembers(privateChatId);
          setLocalMembers(updatedMembers);
      }
  };

  // ВИПРАВЛЕННЯ: Оновлена функція відправки запрошень
  const handleSendInvites = async (selectedUsers) => {
      try {
          await inviteUsersToPrivateChat(
              privateChatId,
              privateChatName,
              null,
              user.uid,
              selectedUsers
          );
          alert("Invitations sent successfully!");
          // Оновлюємо список членів після відправки запрошень
          const updatedMembers = await fetchPrivateChatMembers(privateChatId);
          setLocalMembers(updatedMembers);
      } catch (error) {
          console.error("Failed to invite users:", error);
          alert("Error sending invitations.");
      }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // ВИПРАВЛЕННЯ: Використовуємо localMembers замість privateChatMembers
  const visibleMembers = localMembers?.filter(([member, status]) => 
      status !== 'removed' && status !== 'rejected' && status !== 'chatDeleted'
  );

  return (
    <div className="flex flex-col w-full h-full bg-neutral text-white rounded-lg overflow-hidden border border-gray-800">
      {!showSettings ? (
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-neutral">
              <button
                onClick={() => {
                  setSelectedPrivateChat(null);
                  setSelectedTab('privateTab');
                }}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back
              </button>
              
              <div className="text-center">
                <h2 className="font-bold text-md truncate max-w-[200px]">
                    {privateChatName}
                </h2>
                {videoTitle && (
                    <p className="text-[10px] text-gray-500 truncate max-w-[200px]">
                        {videoTitle}
                    </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {videoId !== privateChatVideoId && privateChatVideoId && (
                    <button
                        onClick={() => updateVideoId(privateChatId)}
                        className="text-xs text-primary hover:underline"
                    >
                        Sync
                    </button>
                )}
                <button 
                    onClick={() => setShowSettings(true)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Settings
                </button>
              </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto bg-neutral scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <Messages
              privacyLevel="private"
              chatId={privateChatId}
              messages={messages}
              formatTimestamp={formatTimestamp}
              handleSeeAccountInfo={handleSeeAccountInfo}
              handleRemoveMessage={handleRemoveMessage}
              isPopupOpen={isPopupOpen}
              setIsPopupOpen={setIsPopupOpen}
            />
            <div ref={messagesEndRef} />
          </div>

          <ChatInputForm
            input={input}
            handleInputChange={handleInputChange}
            handleSendClick={handleSendClick}
            mentionDropdown={mentionDropdown}
            toggleUsersModal={togglePrivateUsersModal}
          />
          <UserInfoModal
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
          />
        </>
      ) : (
        /* Settings View */
        <div className="flex flex-col w-full h-full bg-neutral">
            {/* Settings Header */}
            <div className="flex items-center p-4 border-b border-gray-800">
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white mr-4"
              >
                ← Back
              </button>
              <h2 className="font-bold text-lg">Settings</h2>
            </div>

            <div className="flex-grow overflow-y-auto">
              {/* 1. Centered Icon & Chat Name */}
              <div className="flex flex-col items-center justify-center py-6 border-b border-gray-800">
                 <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4 overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-gray-400">
                      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z" clipRule="evenodd" />
                    </svg>
                 </div>

                 {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={tempChatName} 
                            onChange={(e) => setTempChatName(e.target.value)}
                            className="bg-transparent border-b border-gray-600 text-white py-1 text-center focus:outline-none focus:border-primary"
                        />
                        <button onClick={handleNameSave} className="text-primary text-sm">Save</button>
                        <button onClick={() => setIsEditingName(false)} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                 ) : (
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">{privateChatName}</h1>
                        {isOwner && (
                          <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-white">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                          </button>
                        )}
                    </div>
                 )}
              </div>

              <div className="p-4 space-y-6">
                 {/* 2. Video Link */}
                 <div className="flex flex-col gap-2">
                    <label className="text-gray-500 text-xs uppercase font-bold">Video Link</label>
                    <div className="text-gray-300 text-sm truncate bg-transparent border-b border-gray-800 py-2 select-all">
                        {videoUrl || "No video attached"}
                    </div>
                 </div>

                 {/* 3. Members List */}
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-500 text-xs uppercase font-bold">
                            Members ({visibleMembers?.length || 0})
                        </label>
                        
                        {/* Add Member Button */}
                        {isOwner && (
                            <button 
                                onClick={() => setShowInviteModal(true)} 
                                className="text-primary text-xs hover:underline flex items-center gap-1"
                            >
                                + Add Member
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col">
                        {visibleMembers && visibleMembers.length > 0 ? (
                          visibleMembers.map(([member, status], idx) => (
                            <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                                        {member.profilePicture || member.photoURL ? (
                                            <img src={member.profilePicture || member.photoURL} alt={member.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {member.username || member.displayName || "User"}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {status} 
                                            {member.uid === chatOwnerId ? ' (Owner)' : ''}
                                        </span>
                                    </div>
                                </div>

                                {isOwner && member.uid !== user.uid && (
                                    <button 
                                        onClick={() => handleRemoveMember(member.uid)}
                                        className="text-red-500 hover:text-red-400 text-xs px-2"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-sm py-4 text-center">
                            No members found
                          </div>
                        )}
                    </div>
                 </div>
              </div>
            </div>

            {/* Footer: Leave Chat */}
            <div className="p-4 border-t border-gray-800 mt-auto">
                <button
                  onClick={handleLeaveChat}
                  className="w-full text-red-500 hover:text-red-400 text-sm py-2 text-left"
                >
                  Leave Chat Group
                </button>
            </div>
        </div>
      )}

      {/* Invite Modal - передаємо поточних членів для фільтрації */}
      <InviteMemberModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleSendInvites}
        currentMembers={localMembers?.map(([member]) => member) || []}
      />

    </div>
  );
};

export default PrivateChat;