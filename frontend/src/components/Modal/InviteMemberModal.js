/**
 * @file InviteMemberModal.js
 * @description Modal to select and invite new users to a private chat
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUser } from '../../context/UserContext';

const InviteMemberModal = ({ isOpen, onClose, onInvite, currentMembers = [] }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useUser();

  // Завантажуємо всіх користувачів з publicUserInfo
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "publicUserInfo"));
        const allUsers = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));

        // Фільтруємо:
        // 1. Прибираємо себе
        // 2. Прибираємо тих, хто ВЖЕ є в чаті (currentMembers)
        const availableUsers = allUsers.filter(u => 
            u.uid !== currentUser.uid && 
            !currentMembers.some(member => member.uid === u.uid || member[0]?.uid === u.uid)
        );

        setUsers(availableUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, [isOpen, currentMembers, currentUser.uid]);

  const handleToggleUser = (user) => {
    if (selectedUsers.find(u => u.uid === user.uid)) {
      setSelectedUsers(prev => prev.filter(u => u.uid !== user.uid));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  const handleSubmit = () => {
    onInvite(selectedUsers);
    setSelectedUsers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-neutral border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-white font-bold text-lg">Invite Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
             <div className="text-center text-gray-500 py-4">Loading users...</div>
          ) : users.length === 0 ? (
             <div className="text-center text-gray-500 py-4">No new users to invite.</div>
          ) : (
            users.map(u => {
              const isSelected = selectedUsers.some(sel => sel.uid === u.uid);
              return (
                <div 
                  key={u.uid}
                  onClick={() => handleToggleUser(u)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected 
                      ? 'bg-primary/20 border-primary' 
                      : 'bg-gray-800/50 border-transparent hover:bg-gray-800'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">👤</div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{u.username || u.displayName || "User"}</p>
                    <p className="text-gray-500 text-xs truncate">{u.email || "No bio"}</p>
                  </div>

                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-primary border-primary' : 'border-gray-500'
                  }`}>
                      {isSelected && <span className="text-black text-xs font-bold">✓</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0}
            className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Invitations ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;