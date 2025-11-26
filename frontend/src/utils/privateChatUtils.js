/**
 * @file roleUtils.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-04
 * @desc module for managing private chat
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
  increment,
  deleteDoc,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { fetchYoutubeVideoNameFromUrl } from './livestreamsUtils';

/**
 * allows user to leave private chat
 *
 * @param {object} user - user leaving chat
 * @param {string} privateChatId - the ID of the private chat
 *
 * @returns {Promise<void>} - a promise that resolves when the user has left the chat
 */
export const leavePrivateChat = async (user, privateChatId) => {
  console.log(typeof user);

  const chatRef = doc(db, 'privateChats', privateChatId);
  const chatSnap = await getDoc(chatRef);

  console.log('snap=', chatSnap);

  if (!chatSnap.exists()) {
    console.error('Chat document does not exist.');
    return;
  }

  const chatData = chatSnap.data();

  if (chatData.owner === user.uid) {
    //no members, to make new owner so delete chat
    if (!chatData.members || chatData.members.length === 0) {
      //cancel invitations that are pending
      const invitationsRef = collection(
        db,
        'privateChats',
        privateChatId,
        'invitations'
      );
      const invitationsSnap = await getDocs(invitationsRef);

      const invitationsData = invitationsSnap.docs.map((doc) => doc.data());

      console.log(invitationsData[0]);

      //filter invitations by pending status, then set their status to cancelled in the user document
      await Promise.all(
        invitationsData
          .filter(({ status }) => status === 'pending')
          .map(({ user }) => handleCancelInvitation(privateChatId, user))
      );

      //archive chat in deletePrivateChats collection
      const deletedRef = await addDoc(collection(db, 'deletedPrivateChats'), {
        ...chatData,
        originalChatId: chatSnap.id, //save original uid
        deletedAt: new Date(),
      });

      //add invitations to archive
      const deleteRefInvitations = collection(deletedRef, 'invitations');
      await Promise.all(
        invitationsData.map(({ user, status }) => {
          addDoc(deleteRefInvitations, {
            user,
            status: status === 'pending' ? 'chatDeleted' : status,
          });
          return ''; //map expects function with a return value
        })
      );

      //delete original invitations
      const deleteInvitations = invitationsSnap.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteInvitations);

      //delete original chat
      await deleteDoc(chatRef);
    }
    //members exist, so make one of them the new owner
    else {
      const oldOwner = chatData.owner;
      const updatedMembers = [...chatData.members];
      const newOwner = updatedMembers.pop();
      const updatedPreviousMembers = [...chatData.previousMembers, oldOwner];
      await updateDoc(chatRef, {
        owner: newOwner,
        members: updatedMembers,
        previousMembers: updatedPreviousMembers,
      });
    }
  } else if (chatData.members.includes(user.uid)) {
    //if not owner, just move from members to previous members
    const updatedMembers = chatData.members.filter((uid) => uid !== user.uid);
    const updatedPreviousMembers = [...chatData.previousMembers, user.uid];
    await updateDoc(chatRef, {
      members: updatedMembers,
      previousMembers: updatedPreviousMembers,
    });
  } else {
    console.log('user is not an owner or member of chat');
  }
};

/**
 * Fetches messages from a private chat and sets them in the state. (The result is stored in the messages state variable)
 *
 * @param {string} privateChatId - the ID of the private chat
 * @param {Function} setMessages - a function to set the messages in the state
 *
 * @returns {Function} - a function to unsubscribe from the messages updates
 */
export const fetchPrivateChatMessages = (privateChatId, setMessages) => {
  const q = query(
    collection(db, 'privateChats', privateChatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  //onSnapshot will detect if there are any changes in documents matching the query - and run the argument function
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    //snapshot is the set of documents matching the query
    const messagesData = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        //docSnapshot is a single document in the snapshot - i.e. one message
        const message = docSnapshot.data();
        //if message has an author, we want to retun an object that has both the message and author data
        if (message.authorUid) {
          const userRef = doc(db, 'users', message.authorUid);
          const userSnap = await getDoc(userRef); //get author of message from database
          if (userSnap.exists()) {
            const userData = userSnap.data();
            //object containing message fields, and either their website pfp or google pfp (whichever is true first) as well as the userData
            return {
              ...message,
              authorPhotoURL: userData.photoURL || userData.profilePicture,
              userInfo: userData,
            };
          }
        }
        //otherwise, no author - just return message
        return message;
      })
    );

    //update messages of private chat
    setMessages(messagesData);
  });

  //return function to detect changes in the private chat (will remap all the messages if one is added or removed)
  return unsubscribe;
};

/**
 * Sends a message to a private chat.
 * If the input is not empty, the private chat ID exists, and the user is authenticated, the message is sent.
 * The message is added to the private chat's messages collection.
 *
 * @param {string} privateChatId - the ID of the private chat
 * @param {Object} user - the authenticated user object
 * @param {string} input - the message to send
 * @param {Function} setInput - a function to set the input state to an empty string after sending the message
 *
 * @returns {Promise<void>} - a promise that resolves when the message is sent
 */
export const sendPrivateChatMessage = async (
  privateChatId,
  user,
  input,
  setInput
) => {
  if (input.trim() && privateChatId && user) {
    const messageData = {
      text: input,
      authorName: user.displayName,
      authorUid: user.uid,
      timestamp: new Date().toISOString(),
    };
    await addDoc(
      collection(db, 'privateChats', privateChatId, 'messages'),
      messageData
    );
    setInput('');
  }
};

/**
 * Deletes a private message from a private chat. Moves to the deletedMessages collection of the private chat.
 *
 * @param {string} privateChatId - the ID of the private chat
 * @param {string} text - the text of the message to delete
 * @param {string} timestamp - the timestamp of the message to delete
 *
 * @returns {Promise<void>} - a promise that resolves when the message is deleted
 */
export const deletePrivateChatMessage = async (
  privateChatId,
  text,
  timestamp
) => {
  const q = query(
    collection(db, 'privateChats', privateChatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);
  snapshot.forEach(async (doc) => {
    const message = doc.data();
    if (message.text === text && message.timestamp === timestamp) {
      await deleteDoc(doc.ref);
      await addDoc(collection(db, 'deletedMessages'), {
        ...message,
        chatId: privateChatId,
      });
    }
  });
};

/**
 * Fetches the active users from the Firestore database and sets them in the state.
 * The active users are users who are currently online.
 *
 * @param {Function} setActiveUsers - a function to set the active users in the state
 *
 * @returns {Promise<void>} - a promise that resolves when the active users are fetched
 */
export const fetchActiveUsers = async (setActiveUsers) => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const users = usersSnapshot.docs.map((doc) => ({
    ...doc.data(),
    uid: doc.id,
  }));
  setActiveUsers(users);
};

export const handleAcceptInvitation = async (
  invitationId,
  chatId,
  user,
  setPrivateChats
) => {
  console.log('handleac call');

  const invitationRef = doc(db, 'users', user.uid, 'invitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  if (invitationSnap.exists()) {
    await updateDoc(invitationRef, { status: 'accepted' });
    setPrivateChats((prev) => [...prev, chatId]); //prev is the current value of the state (in this case selectedChat) to be updated - we add the chatId of the chat that was accepted

    //update invitation in the privateChat document collection too
    const q = query(
      collection(db, 'privateChats', chatId, 'invitations'),
      where('user', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const invite = querySnapshot.docs[0];
      await updateDoc(invite.ref, { status: 'accepted' });
    }

    //updating private chat document
    const chatRef = doc(db, 'privateChats', chatId);
    const chatSnap = await getDoc(chatRef);
    const currentMembers = chatSnap.data().members;

    if (!currentMembers.includes(user.uid)) {
      currentMembers.push(user.uid);
    }
    await updateDoc(chatRef, { members: currentMembers });

    console.log('current members =', currentMembers);
  } else {
    console.error('Invitation document does not exist.');
  }
};

/**
 * Rejects an invitation to a private chat.
 * The status of the invitation is set to 'rejected'.
 * The invitation is not deleted from the database.
 *
 * @param {string} invitationId - the ID of the invitation
 * @param {string} chatId - the ID of the private chat
 * @param {Object} user - the authenticated user
 *
 * @returns {Promise<void>} - a promise that resolves when the invitation is rejected
 */
export const handleRejectInvitation = async (invitationId, chatId, user) => {
  const invitationRef = doc(db, 'users', user.uid, 'invitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  if (invitationSnap.exists()) {
    await updateDoc(invitationRef, { status: 'rejected' });

    const q = query(
      collection(db, 'privateChats', chatId, 'invitations'),
      where('user', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const invite = querySnapshot.docs[0];
      await updateDoc(invite.ref, { status: 'rejected' });
    }
  } else {
    console.error('Invitation document does not exist.');
  }
};

/**
 * Cancels an invitation to a private chat if chat is deleted before a response is received
 * The status of the invitation is set to 'chatDeleted'.
 * The invitation is not deleted from the database.
 *
 * @param {string} chatId - the ID of the private chat
 * @param {string} userID - the ID of the user whose invitation is being cancelled
 *
 * @returns {Promise<void>} - a promise that resolves when the invitation is cancelled
 */
export const handleCancelInvitation = async (chatId, userID) => {
  const q = query(
    collection(db, 'users', userID, 'invitations'),
    where('chatId', '==', chatId)
  );
  const invitationSnap = await getDocs(q);

  if (!invitationSnap.empty) {
    await updateDoc(invitationSnap.docs[0].ref, { status: 'chatDeleted' });

    //when we call handleCancelInvitation in leaveChat, we handle updating the private chat invitation collection there
  } else {
    console.error('Invitation document does not exist.');
  }
};

/**
 * Create a new chat with the given chat settings
 * The chat is added to the privateChats collection.
 * Invitations are sent to the invited users.
 * The invitations are added to the users' invitations collection.
 * The private chat document has its own collection of invitations, which records the user ID and status of the invitation.
 *
 * @param {*} chatId, user
 *
 * @param {Object} chatSettings - the settings for the new chat
 * @param {string} chatSettings.name - the name of the chat
 * @param {string} chatSettings.url - the URL of the YouTube video to be associated with the chat
 * @param {Array} chatSettings.invitedUsers - an array of user objects to be invited to the chat
 * @param {Object} user - the authenticated user creating the chat
 * @param {string} user.uid - the UID of the authenticated user
 * @param {string} user.displayName - the display name of the authenticated user
 * @param {string} user.photoURL - the photo URL of the authenticated user
 * @param {string} user.email - the email of the authenticated user
 *
 * @returns {Promise<void>} - a promise that resolves when the chat is created and invitations are sent
 */
export const createChat = async (chatSettings, user) => {
  console.log('in createchat()');

  console.log(chatSettings);

  const chatData = {
    name: chatSettings.name,
    creator: user.uid,
    owner: user.uid, //owner doesn't always equal creator, if creator leaves chat owner is chosen from remaining members in chat
    members: [],
    previousMembers: [],
    url: chatSettings.url,
    videoTitle: await fetchYoutubeVideoNameFromUrl(chatSettings.url),
    createdAt: new Date().toISOString(),
  };

  const chatRef = await addDoc(collection(db, 'privateChats'), chatData); //chat will exist in privateChats collection if request to create is made - regardless of whether invitation is accepted

  //create collection with invitations, recording uid and invitation status
  await Promise.all(
    chatSettings.invitedUsers.map((u) =>
      addDoc(collection(db, 'privateChats', chatRef.id, 'invitations'), {
        user: u.uid,
        status: 'pending',
      })
    )
  );

  //send invitations to each user
  chatSettings.invitedUsers.forEach(async (invitedUser) => {
    const invitationData = {
      chatId: chatRef.id,
      invitedBy: user.uid,
      invitedAt: new Date().toISOString(),
      status: 'pending',
    };
    await addDoc(
      collection(db, 'users', invitedUser.uid, 'invitations'),
      invitationData
    );
  });
};

/***
 * Simulates an invitation to a private chat *for testing*.
 *
 * @param {Object} user - the authenticated user
 *
 * @returns {Promise<void>} - a promise that resolves when the invitation is simulated
 */
export const simulateInvite = async (user) => {
  const chatId = 'testChatId';
  const invitationData = {
    chatId,
    invitedBy: 'testUser2',
    invitedAt: new Date().toISOString(),
    status: 'pending',
  };
  await addDoc(
    collection(db, 'users', user.uid, 'invitations'),
    invitationData
  );
};

/**
 * Fetches the name of a private chat from the Firestore database.
 * If the chat document exists, the name is returned.
 *
 * @param {string} chatId - the ID of the private chat
 *
 * @returns {Promise<string>} - a promise that resolves to the name of the private chat
 */
export const fetchPrivateChatName = async (chatId) => {
  const chatRef = doc(db, 'privateChats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    return chatSnap.data().name || chatSnap.data().url || 'Unnamed Chat';
  } else {
    console.error('Chat document does not exist.');
    return 'Unnamed Chat';
  }
};

/**
 * Fetches the title of the YouTube video from the Firestore database.
 * If the chat document exists, the video title is set in the state.
 * If the chat document does not exist, an error is logged.
 *
 * @param {string} chatId - the ID of the private chat
 * @param {Function} setVideoTitle - a function to set the video title in the state
 *
 * @returns {Function} - a function to unsubscribe from the video title updates
 */
export const fetchPrivateChatVideoTitle = (chatId, setVideoTitle) => {
  console.log('calling fetchPrivateChatvideoTitle??');
  const chatRef = doc(db, 'privateChats', chatId);
  const unsubscribe = onSnapshot(chatRef, async (doc) => {
    if (doc.exists()) {
      const videoTitle = doc.data().videoTitle;
      console.log('videoTitle = ', videoTitle);
      setVideoTitle(videoTitle || 'no video');
    } else {
      console.error('Chat document does not exist.');
      setVideoTitle('');
    }
  });
  return unsubscribe;
};

/**
 * Fetches the URL of the YouTube video from the Firestore database corresponding to the private chat.
 *
 * @param {string} chatId - the ID of the private chat
 *
 * @returns {Promise<string>} - a promise that resolves to the URL of the YouTube video, or an empty string if the chat does not exist or has no URL
 */
export const fetchPrivateChatVideoUrl = async (chatId) => {
  try {
    const chatRef = doc(db, 'privateChats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      console.log('chatSnap.data().url:', chatSnap.data().url);
      return chatSnap.data().url || '';
    } else {
      console.error('Chat document does not exist.');
      return '';
    }
  } catch (error) {
    console.error('Error fetching chat URL:', error);
    return '';
  }
};

/**
 * Fetches the video ID of a private chat from the Firestore database.
 *
 * @param {*} chatId
 *
 * @returns {Promise<string|null>} the video ID of the private chat with chatId, or null if the chat does not exist or has no URL
 */
export const fetchPrivateChatVideoId = async (chatId) => {
  try {
    const chatRef = doc(db, 'privateChats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const url = chatSnap.data().url;
      if (url) {
        const videoId = new URL(url).searchParams.get('v'); //https://www.youtube.com/watch?v=abcd1234" returns abcd124 (the videoID)
        return videoId || null;
      }
      return null;
    } else {
      console.error('Chat document does not exist.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching chat URL:', error);
    return null;
  }
};

/**
 * NOTE: need to fix this, broken when people leave the chat
 * Fetches the members of a private chat from the Firestore database, members who accepted and are pending will be returned
 *
 * @param {*} chatId - the ID of the private chat
 *
 * @returns {Promise<Array>} - a promise that resolves to an array of members, where each member is an array containing the user object and their status ('accepted' or 'pending')
 */
export const fetchPrivateChatMembers = async (chatId) => {
  const chatRef = doc(db, 'privateChats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    // Get the owner's data
    const owner = await fetchUser(chatSnap.data().owner);

    const q = query(
      collection(db, 'privateChats', chatId, 'invitations'),
      where('status', '!=', 'rejected')
    );
    const invitationsSnapshot = await getDocs(q);

    //dont use .exists() for collections
    if (!invitationsSnapshot.empty) {
      // Get the invited users' data
      const invitedUsersData = invitationsSnapshot.docs.map((inv) =>
        inv.data()
      );
      //using colon brackets to destructure object
      const invitedUsers = await Promise.all(
        invitedUsersData.map(async ({ user, status }) => {
          const userData = await fetchUser(user);
          return [userData, status];
        })
      ); //get the entire user object from their id

      // Combine the owner with the invited users
      const allMembers = [
        [owner, 'accepted'],
        ...invitedUsers.filter(([userData, _]) => userData !== null),
      ];

      return allMembers;
    } else {
      //no users who are pending or accepted
      return [[owner, 'accepted']];
    }
  } else {
    console.error('Chat document does not exist.');
    return [];
  }
};

/**
 * Fetches the user object with the given userId from the Firestore database.
 *
 * @param {string} userId - the ID of the user to fetch
 *
 * @returns {Promise<Object|null>} - a promise that resolves to the user object if it exists, or null if it does not
 */
export const fetchUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { ...userSnap.data(), uid: userSnap.id };
  } else {
    console.error('User document does not exist.');
    return null;
  }
};

/**
 * Adds the user to the list of invited users in the private chat with chatId.
 * If the user is already in the list, the function does nothing.
 * If the user is not in the list, the function adds the user to the list.
 *
 * @param {string} chatId - the ID of the private chat
 * @param {Object} inviter - the user who is inviting the user to the chat
 * @param {Object} invitee - the user who is being invited to the chat
 *
 * @returns {Promise<void>} - a promise that resolves when the user is added to the chat
 */
export const addUserToPrivateChat = async (chatId, inviter, invitee) => {
  //not using arrayunion because it doesn't work with the emulator
  const invitationsRef = collection(db, 'privateChats', chatId, 'invitations');
  const invitationsSnap = await getDocs(invitationsRef);
  if (invitationsSnap.exists()) {
    const q = query(invitationsRef, where('user', '==', invitee.uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      await addDoc(invitationsRef, { user: invitee.uid, status: 'pending' });
    }
  }

  //IMPLEMENT REMOVING USER FROM PREVIOUS MEMBERS IF WE ARE RE-INVITING THEM

  //update invitee's invitations collection
  const invitationData = {
    chatId: chatId,
    invitedBy: inviter.uid,
    invitedAt: new Date().toISOString(),
    status: 'pending',
  };

  await addDoc(
    collection(db, 'users', invitee.uid, 'invitations'),
    invitationData
  );
};

/**
 * Adds a reaction to a message in a private chat.
 *
 * @param {string} privateChatId - the ID of the private chat
 * @param {string} timestamp - the timestamp of the message to add a reaction to
 * @param {string} reaction - the reaction to add to the message
 *
 * @returns {Promise<void>} - a promise that resolves when the reaction is added
 */
export const addPrivateChatReaction = async (
  privateChatId,
  //text,
  timestamp,
  reaction
) => {
  const q = query(
    collection(db, 'privateChats', privateChatId, 'messages'),
    where('timestamp', '==', timestamp)
  );
  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      updateDoc(doc.ref, {
        [`reactions.${reaction}`]: increment(1), //save reaction and count
      });
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches all private chats for the authenticated user.
 * It retrieves both chats where the user is an invited member and chats where the user is the owner.
 * The chat names are fetched and set in the state using the provided setPrivateChats function
 *
 * @param {Object} user - the authenticated user object
 * @param {Function} setPrivateChats - a function to set the private chats in the state
 *
 * @returns {Promise<void>} - a promise that resolves when the chats are fetched and set in the state
 */
export const fetchChats = async (user, setPrivateChats) => {
  // Query for chats where the user is an invited user
  const invitedQuery = query(
    collection(db, 'privateChats'),
    where('members', 'array-contains', user.uid)
  );
  const ownerQuery = query(
    collection(db, 'privateChats'),
    where('owner', '==', user.uid)
  );

  const invitedSnapshot = await getDocs(invitedQuery);
  const ownerSnapshot = await getDocs(ownerQuery);

  const combinedSnapshots = [...invitedSnapshot.docs, ...ownerSnapshot.docs];

  const fetchChatNames = async () => {
    //Promise stores the result of an action, whether it succeeded or failed - Promise.all() takes an array of promises and returns a single promise that succeeds when all promises succeed
    const chats = await Promise.all(
      combinedSnapshots.map(async (doc) => {
        const chatData = doc.data();
        const chatName = await fetchPrivateChatName(doc.id);
        //map each document to an object with the document id, chatData, and chatName
        return { id: doc.id, ...chatData, name: chatName };
      })
    );

    setPrivateChats(chats);
  };

  fetchChatNames();
};
