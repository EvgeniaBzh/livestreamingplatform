/**
 * @file privateChatUtils.js
 * @author Simon Tenedero, Jonas Matulis, Yevheniia Bazhmaieva
 * @description Module for managing private chats (Fixed Defaults)
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  where,
  getDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { fetchYoutubeVideoNameFromUrl } from './livestreamsUtils';
import { fetchPublicUserInfo, logWebsiteUsage, getContentType } from './usersUtils';
import { getAuth } from 'firebase/auth';

// ==========================================
// FETCH & LISTENERS
// ==========================================

export const fetchChats = (
  user, 
  setPrivateChats, 
  // --- ДОДАНО ЗНАЧЕННЯ ЗА ЗАМОВЧУВАННЯМ, ЩОБ ВИПРАВИТИ ПОМИЛКУ ---
  setSelectedPrivateChat = () => {}, 
  setPrivateChatMembers = () => {}, 
  setSelectedPrivateChatMembers = () => {}, 
  setPendingPrivateChatMembers = () => {}, 
  setSelectedPrivateChatPendingMembers = () => {}, 
  chatCacheRef = { current: new Map() }, // Виправляє "reading 'current' of undefined"
  selectedPrivateChatRef = { current: null }, 
  setLoadingChatSettings = () => {} 
  // ---------------------------------------------------------------
) => {
  try {
    console.log("Setting up chat listener for user", user.uid);
    const privateChatsQuery = query(collection(db, "users", user.uid, "privateChats"));

    const unsubscribe = onSnapshot(privateChatsQuery, async (snapshot) => {
        setLoadingChatSettings(true);
        
        // Використовуємо переданий ref або створюємо новий, якщо його немає
        let chatCache = chatCacheRef.current || new Map();
        let selectedChat = selectedPrivateChatRef.current;

        if (snapshot.empty) {
          chatCache.clear();
          setPrivateChats([]);
          setSelectedPrivateChat(null);
          setPrivateChatMembers(new Map());
          setLoadingChatSettings(false);
          return;
        }

        const currentChatRefs = new Map();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          currentChatRefs.set(doc.id, {
            settingsLastUpdated: data.settingsLastUpdated?.toDate() || new Date(),
            membersLastUpdated: data.membersLastUpdated?.toDate() || new Date(),
            pendingMembersLastUpdated: data.pendingMembersLastUpdated?.toDate() || new Date(),
          });
        });

        const chatsToFetch = [];
        const membersToFetch = [];
        const pendingToFetch = [];

        for (const [chatId, updates] of currentChatRefs) {
          const cached = chatCache.get(chatId);
          if (!cached || updates.settingsLastUpdated > cached.settingsLastUpdated) chatsToFetch.push(chatId);
          if (!cached || updates.membersLastUpdated > cached.membersLastUpdated) membersToFetch.push(chatId);
          if (!cached || updates.pendingMembersLastUpdated > cached.pendingMembersLastUpdated) pendingToFetch.push(chatId);
        }

        const currentChatIds = new Set(currentChatRefs.keys());
        for (const key of chatCache.keys()) {
            if (!currentChatIds.has(key)) chatCache.delete(key);
        }

        if (chatsToFetch.length > 0) {
            const snaps = await Promise.all(chatsToFetch.map(id => getDoc(doc(db, "privateChats", id))));
            snaps.forEach(snap => {
                if(snap.exists()) {
                    const cache = chatCache.get(snap.id) || {};
                    chatCache.set(snap.id, { ...cache, chatData: { id: snap.id, ...snap.data() }, settingsLastUpdated: currentChatRefs.get(snap.id).settingsLastUpdated });
                }
            });
        }

        if (membersToFetch.length > 0) {
            for(const id of membersToFetch) {
                const memSnaps = await getDocs(collection(db, "privateChats", id, "members"));
                const members = memSnaps.docs.map(d => ({ uid: d.id, ...d.data() }));
                const cache = chatCache.get(id) || {};
                chatCache.set(id, { ...cache, memberData: members, membersLastUpdated: currentChatRefs.get(id).membersLastUpdated });
            }
        }

        if (pendingToFetch.length > 0) {
            for(const id of pendingToFetch) {
                const q = query(collection(db, "privateChats", id, "invitations"), where("status", "==", "pending"));
                const invSnaps = await getDocs(q);
                const pendingIds = invSnaps.docs.map(d => d.data().userId);
                
                const pendingData = await Promise.all(pendingIds.map(async uid => {
                    const uSnap = await getDoc(doc(db, "publicUserInfo", uid));
                    return uSnap.exists() ? { uid, ...uSnap.data(), membershipStatus: "pending" } : null;
                }));
                
                const cache = chatCache.get(id) || {};
                chatCache.set(id, { ...cache, pendingMemberData: pendingData.filter(p => p), pendingMembersLastUpdated: currentChatRefs.get(id).pendingMembersLastUpdated });
            }
        }

        const allChats = Array.from(currentChatRefs.keys()).map(id => chatCache.get(id)?.chatData).filter(c => c);
        setPrivateChats(allChats);

        const allMembers = new Map();
        const allPending = new Map();
        currentChatRefs.forEach((_, id) => {
            if(chatCache.get(id)?.memberData) allMembers.set(id, chatCache.get(id).memberData);
            if(chatCache.get(id)?.pendingMemberData) allPending.set(id, chatCache.get(id).pendingMemberData);
        });
        
        setPrivateChatMembers(allMembers);
        if (setPendingPrivateChatMembers) setPendingPrivateChatMembers(allPending);

        if (selectedChat && currentChatRefs.has(selectedChat.id)) {
            const cached = chatCache.get(selectedChat.id);
            if (cached) {
              if (cached.chatData && setSelectedPrivateChat) setSelectedPrivateChat({ id: selectedChat.id, ...cached.chatData });
              if (cached.memberData && setSelectedPrivateChatMembers) setSelectedPrivateChatMembers(cached.memberData);
              if (cached.pendingMemberData && setSelectedPrivateChatPendingMembers) setSelectedPrivateChatPendingMembers(cached.pendingMemberData);
            }
        } else if (setSelectedPrivateChat) {
            setSelectedPrivateChat(null);
            if (setSelectedPrivateChatMembers) setSelectedPrivateChatMembers([]);
        }
        
        setLoadingChatSettings(false);
    });

    return () => unsubscribe();
  } catch (error) {
    console.error("Error setting up chat listener:", error);
    return () => {};
  }
};

export const fetchPrivateChatName = async (chatId) => {
  try {
    const snap = await getDoc(doc(db, "privateChats", chatId));
    return snap.exists() ? (snap.data().name || "Unnamed Chat") : "Unnamed Chat";
  } catch (e) { return "Unnamed Chat"; }
};

export const fetchPrivateChatVideoTitle = (chatId, setVideoTitle) => {
  const chatRef = doc(db, 'privateChats', chatId);
  return onSnapshot(chatRef, (doc) => {
    if (doc.exists()) {
      setVideoTitle(doc.data().videoTitle || 'No video');
    } else {
      setVideoTitle('');
    }
  });
};

export const fetchPrivateChatVideoId = async (chatId) => {
  try {
    const snap = await getDoc(doc(db, "privateChats", chatId));
    if (snap.exists() && snap.data().url) {
        const url = new URL(snap.data().url);
        return url.searchParams.get("v");
    }
    return null;
  } catch (e) { return null; }
};

export const fetchPrivateChatVideoUrl = async (chatId) => {
  try {
    const s = await getDoc(doc(db, "privateChats", chatId));
    return s.exists() ? s.data().url || "" : "";
  } catch (e) { return ""; }
};

export const fetchPrivateChatMessages = (privateChatId, setMessages) => {
  const q = query(
    collection(db, 'privateChats', privateChatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, async (snapshot) => {
    const messagesData = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const message = docSnapshot.data();
        if (message.authorUid) {
            const userData = await fetchPublicUserInfo(message.authorUid);
            if (userData) {
                return {
                    ...message,
                    messageId: docSnapshot.id,
                    authorPhoto: userData.profilePicture,
                    authorName: userData.username || userData.displayName,
                    userInfo: userData
                };
            }
            const userRef = doc(db, 'users', message.authorUid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const u = userSnap.data();
                return {
                ...message,
                messageId: docSnapshot.id,
                authorPhoto: u.photoURL || u.profilePicture,
                userInfo: u,
                };
            }
        }
        return { ...message, messageId: docSnapshot.id };
      })
    );
    setMessages(messagesData);
  });
};

// Виправлена функція fetchPrivateChatMembers (вже була вище, але дублюю тут)
export const fetchPrivateChatMembers = async (chatId) => {
  try {
    const membersRef = collection(db, "privateChats", chatId, "members");
    const membersSnap = await getDocs(membersRef);
    
    if (!membersSnap.empty) {
        const membersData = await Promise.all(
          membersSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const uid = docSnap.id;
            
            try {
              const publicInfo = await fetchPublicUserInfo(uid);
              if (publicInfo) {
                return [
                  {
                    uid,
                    username: publicInfo.username || publicInfo.displayName || data.username,
                    profilePicture: publicInfo.profilePicture || data.profilePicture,
                    photoURL: publicInfo.profilePicture || data.profilePicture,
                    displayName: publicInfo.displayName || publicInfo.username || data.username,
                    bio: publicInfo.bio || data.bio || "No bio available."
                  },
                  data.membershipStatus || 'member'
                ];
              }
            } catch (err) {
              console.warn("Could not fetch public info for user:", uid, err);
            }
            
            return [
              { 
                uid, 
                username: data.username || data.displayName || "User", 
                profilePicture: data.profilePicture || data.photoURL || "",
                photoURL: data.profilePicture || data.photoURL || "",
                displayName: data.username || data.displayName || "User",
                bio: data.bio || "No bio available."
              }, 
              data.membershipStatus || 'member'
            ];
          })
        );
        
        return membersData;
    }
    return [];
  } catch (e) {
      console.error("Error fetching chat members:", e);
      return [];
  }
};

export const fetchPendingInvitations = async (chatId) => {
    const q = query(collection(db, "privateChats", chatId, "invitations"), where("status", "==", "pending"));
    const s = await getDocs(q);
    return s.docs.map(d => d.data());
};

export const fetchActiveUsers = async (setActiveUsers) => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const users = usersSnapshot.docs.map((doc) => ({
    ...doc.data(),
    uid: doc.id,
  }));
  setActiveUsers(users);
};

// --- ACTIONS ---

export const createChat = async (chatSettings, user) => {
  console.log('createChat', chatSettings);
  const currentTime = new Date();

  try {
    const chatData = {
      name: chatSettings.name,
      creator: user.uid,
      owner: user.uid, // ВИПРАВЛЕННЯ: Додаємо owner
      url: chatSettings.url,
      icon: null, 
      videoTitle: await fetchYoutubeVideoNameFromUrl(chatSettings.url),
      createdAt: currentTime.toISOString(),
    };

    const chatRef = await addDoc(collection(db, 'privateChats'), chatData);

    let chatIcon = null;
    if (chatSettings.icon) {
      chatIcon = await uploadChatIcon(chatRef.id, chatSettings.icon);
      await updateDoc(chatRef, { icon: chatIcon });
    }

    const ownerInvRef = await addDoc(
      collection(db, 'users', user.uid, 'invitations'),
      {
        chatId: chatRef.id,
        chatName: chatSettings.name,
        chatIcon: chatIcon,
        invitedBy: user.uid,
        invitedAt: currentTime.toISOString(),
        status: 'accepted',
        chatStatus: 'active',
        acceptedAt: currentTime.toISOString(),
      },
    );
 await addDoc(collection(db, 'privateChats', chatRef.id, 'invitations'), {
      userId: user.uid,
      status: 'accepted',
      userInvitationId: ownerInvRef.id,
    });

    let ownerName = user.displayName || user.username || "User";
    let ownerPhoto = user.photoURL || user.profilePicture || "";
    
    try {
        const pInfo = await getDoc(doc(db, "publicUserInfo", user.uid));
        if (pInfo.exists()) {
            const d = pInfo.data();
            ownerName = d.username || d.displayName || ownerName;
            ownerPhoto = d.profilePicture || ownerPhoto;
        }
    } catch(e) { console.warn("Owner info fetch failed", e); }

    // ВИПРАВЛЕННЯ: Встановлюємо membershipStatus як 'owner' замість 'accepted'
    await setDoc(doc(db, "privateChats", chatRef.id, "members", user.uid), {
      username: ownerName,
      profilePicture: ownerPhoto,
      bio: "No bio available.",
      membershipStatus: "owner",
    });

    await setDoc(doc(db, "users", user.uid, "privateChats", chatRef.id), {
      settingsLastUpdated: currentTime,
      membersLastUpdated: currentTime,
      pendingMembersLastUpdated: currentTime,
    });

    await inviteUsersToPrivateChat(
      chatRef.id,
      chatSettings.name,
      chatIcon,
      user.uid,
      chatSettings.invitedUsers,
      currentTime
    );

    return chatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

export const inviteUsersToPrivateChat = async (chatId, chatName, chatIcon, inviter, invitees, currentTime = new Date()) => {
    const promises = invitees.map(async (u) => {
      const invRef = await addDoc(collection(db, "users", u.uid, "invitations"), {
        chatId, chatName, chatIcon: chatIcon || null, invitedBy: inviter, invitedAt: currentTime.toISOString(), status: "pending", chatStatus: "active"
      });
  
      await addDoc(collection(db, "privateChats", chatId, "invitations"), {
        userId: u.uid, status: "pending", userInvitationId: invRef.id
      });
    });
    await Promise.all(promises);
};

export const addUserToPrivateChat = async (chatId, inviteeUid) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    const inviteeUser = { uid: inviteeUid }; 
    const chatName = await fetchPrivateChatName(chatId);
    
    await inviteUsersToPrivateChat(chatId, chatName, null, user.uid, [inviteeUser]);
};

export const handleAcceptInvitation = async (invitationId, chatId, user) => {
  const invitationRef = doc(db, 'users', user.uid, 'invitations', invitationId);
  const invSnap = await getDoc(invitationRef);
  
  if (invSnap.exists()) {
    await updateDoc(invitationRef, { status: 'accepted', acceptedAt: new Date() });

    const q = query(collection(db, 'privateChats', chatId, 'invitations'), where('userInvitationId', '==', invitationId));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(snap.docs[0].ref, { status: 'accepted' });

    let memberName = user.displayName || user.username || "User";
    let memberPhoto = user.photoURL || user.profilePicture || "";

    try {
        const pInfo = await getDoc(doc(db, "publicUserInfo", user.uid));
        if (pInfo.exists()) {
            const d = pInfo.data();
            memberName = d.username || d.displayName || memberName;
            memberPhoto = d.profilePicture || memberPhoto;
        }
    } catch(e) {
      console.warn("Could not fetch public info:", e);
    }

    // ВИПРАВЛЕННЯ: Використовуємо setDoc з merge замість просто setDoc
    await setDoc(doc(db, "privateChats", chatId, "members", user.uid), {
      username: memberName,
      profilePicture: memberPhoto,
      bio: "No bio available.",
      membershipStatus: "member", 
    }, { merge: true }); // Додаємо merge: true

    await setDoc(doc(db, "users", user.uid, "privateChats", chatId), {
      settingsLastUpdated: new Date(),
      membersLastUpdated: new Date(),
      pendingMembersLastUpdated: new Date(),
    });
  }
};

export const handleRejectInvitation = async (invitationId, chatId, user) => {
  const ref = doc(db, 'users', user.uid, 'invitations', invitationId);
  if ((await getDoc(ref)).exists()) {
    await updateDoc(ref, { status: 'rejected' });
  }
};

export const handleCancelInvitation = async (uId, invId) => {
  const ref = doc(db, 'users', uId, 'invitations', invId);
  if((await getDoc(ref)).exists()) await updateDoc(ref, { chatStatus: 'chatDeleted' });
};

export const leavePrivateChat = async (user, privateChatId) => {
  try {
    await deleteDoc(doc(db, "privateChats", privateChatId, "members", user.uid));
    await deleteDoc(doc(db, "users", user.uid, "privateChats", privateChatId));
  } catch(e) { console.error(e); }
};

export const removePrivateChatMember = async (userIdToRemove, chatId) => {
    try {
        await deleteDoc(doc(db, "privateChats", chatId, "members", userIdToRemove));
        await deleteDoc(doc(db, "users", userIdToRemove, "privateChats", chatId));
    } catch (e) { console.error(e); }
};

export const sendPrivateChatMessage = async (privateChatId, user, input, setInput) => {
  if (input.trim() && privateChatId && user) {
    await addDoc(collection(db, 'privateChats', privateChatId, 'messages'), {
      text: input, authorUid: user.uid, timestamp: new Date().toISOString()
    });
    setInput('');
  }
};

export const deletePrivateChatMessage = async (cId, mId) => {
    await deleteDoc(doc(db, 'privateChats', cId, 'messages', mId));
};

export const updatePrivateChatName = async ({ id }, newName) => {
    const ref = doc(db, 'privateChats', id);
    await updateDoc(ref, { name: newName });
};

export const updatePrivateChatUrl = async ({ id }, newUrl) => {
    const ref = doc(db, 'privateChats', id);
    await updateDoc(ref, { url: newUrl });
};

export const updatePrivateChatIcon = async (selectedChat, file) => {
    const url = await uploadChatIcon(selectedChat.id, file);
    const ref = doc(db, "privateChats", selectedChat.id);
    await updateDoc(ref, { icon: url });
};

export const uploadChatIcon = async (chatId, file) => {
    try {
      const refStr = ref(storage, `chatIcons/${chatId}`);
      const meta = { contentType: getContentType(file) };
      const snap = await uploadBytes(refStr, file, meta);
      return await getDownloadURL(snap.ref);
    } catch (e) { throw e; }
};

export const fetchUser = async (id) => {
    const s = await getDoc(doc(db, "users", id));
    return s.exists() ? { ...s.data(), uid: s.id } : null;
};

// Dummy exports
export const simulateInvite = async () => {};
export const addPrivateChatReaction = async (cId, ts, reaction) => {
    const q = query(collection(db, "privateChats", cId, "messages"), where("timestamp", "==", ts));
    const snap = await getDocs(q);
    snap.forEach(d => updateDoc(d.ref, { [`reactions.${reaction}`]: increment(1) }));
};
export const logDeletedPrivateChatActivity = () => {};
export const logPrivateChatActivity = () => {};