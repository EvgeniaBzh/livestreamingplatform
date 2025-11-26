/**
 * @file livestreamsUtils.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-04
 * @desc module for managing livestreaming in firebase
 */

import { db } from '../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
  increment,
  addDoc,
} from 'firebase/firestore';

/**
 * Function to log a message sent by a user
 * This function will create a new document for the user if it doesn't exist
 *
 * @param {string} userId - The ID of the user sending the message
 * @param {string} message - The message sent by the user
 *
 * @returns {Promise<void>} - A promise that resolves when the message is logged
 */
export const logMessageSent = async (userId, message) => {
  const userRef = doc(db, 'users', userId); // Using user UID as the document ID
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, { messagesSent: [] }, { merge: true });
  }

  await updateDoc(userRef, {
    messagesSent: arrayUnion({ text: message, timestamp: new Date() }),
  });
};

/**
 * Function to log website usage by a user
 * This function will create a new document for the user if it doesn't exist
 *
 * @param {string} userId - The ID of the user
 * @param {string} activity - The activity performed by the user on the website
 *
 * @returns {Promise<void>} - A promise that resolves when the activity is logged
 */
export const logWebsiteUsage = async (userId, activity) => {
  const userRef = doc(db, 'users', userId); // Using user UID as the document ID
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, { websiteUsage: [] }, { merge: true });
  }

  await updateDoc(userRef, {
    websiteUsage: arrayUnion({ activity, timestamp: new Date() }),
  });
};

/**
 * Function to get the list of active users in a chat for a given videoId
 *
 * @param {string} videoId - The ID of the video for which to get active users
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of active users in the chat
 */
export const getActiveUsers = async (videoId) => {
  try {
    // Query to get the last 100 messages ordered by timestamp
    const q = query(
      collection(db, 'livestreams', videoId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    const querySnapshot = await getDocs(q);
    const userIds = new Set();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 15000);

    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      const messageTimestamp = new Date(messageData.timestamp); // Convert ISO 8601 to Date object
      if (messageTimestamp >= fiveMinutesAgo) {
        //a user is 'active' iff they have a message in the chat sent in the last 5 minutes
        userIds.add(messageData.authorUid);
      }
    });

    const activeUserPromises = Array.from(userIds).map(async (uid) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data();
      }
      return null;
    });

    const activeUsers = await Promise.all(activeUserPromises);
    return activeUsers.filter((user) => user !== null);
  } catch (error) {
    console.error('Error getting active users: ', error);
    return [];
  }
};

/**
 * Function to get the number of active users in the last 5 minutes for a given videoId
 *
 * @param videoId
 * @returns {Promise<number>} - A promise that resolves to the number of active users in the chat
 */
export const getNumberOfActiveUsers = async (videoId) => {
  const activeUsers = await getActiveUsers(videoId);
  return activeUsers.length;
};

/**
 * NOTE: this isn't currently being used, was originally used in getVideoDetails() in VideoHeader.js, but we opted to use oEmbed to retrieve title instead of through youtube api.
 *
 * @param videoUrl
 *
 * @returns {Promise<Object>} - A promise that resolves to the video details object containing title, description, channelTitle, publishedAt, and thumbnails.
 */
/*
export const fetchYoutubeDetails = async (videoUrl) => {
  try {
    console.log('livestreamsUtils.js: fetchingYoutubeDetails() received videoId=',videoUrl);

    const response = await fetch('http://localhost:8080/api/getVideoDetails',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({videoUrl}), //sends {videoId:videoId}
    }); //1 api cost

    if(!response.ok){
      throw new Error('Failed to fetch video details');
    }

    const data = await response.json();
    console.log('livestreamsUtils.js: fetchYoutubeDetails() received data from backend =',data);

    return data;
  } 
  catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
};*/

/**
 * Fetches all active streams from the Firestore database
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of active stream (Each stream is an object containing the stream's id and data)
 */
export const fetchActiveStreams = async () => {
  const q = query(collection(db, 'livestreams'), where('isActive', '==', true));
  const querySnapshot = await getDocs(q);
  const streams = [];
  querySnapshot.forEach((doc) => {
    streams.push({ id: doc.id, ...doc.data() });
  });
  return streams;
};

/**
 * Function to fetch video details from the Firestore database
 *
 * @param {string} videoId - The ID of the video to fetch details for
 *
 * @returns {Promise<Object|null>} - A promise that resolves to the video details object if found, or null if not found
 */
export const fetchVideoDetails = async (videoId) => {
  const docRef = doc(db, 'livestreams', videoId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.error('No such document!');
    return null;
  }
};

/**
 * Adds a new live stream to the Firestore database
 * The videoId is used as the document ID
 *
 * @param {string} videoId - The ID of the video to add
 * @param {string} title - The title of the live stream
 * @param {string} url - The URL of the live stream
 *
 * @returns {Promise<void>} - A promise that resolves when the live stream is added
 */
export const addLiveStream = async (videoId, title, url) => {
  console.log('addLiveStream called');
  const livestreamRef = doc(db, 'livestreams', videoId);

  console.log('title =', title);
  await setDoc(livestreamRef, {
    videoId: videoId,
    title: title,
    url: url,
    isActive: true,
    createdAt: serverTimestamp(),
  });
};

/**
 * Updates the isActive field of the live stream to false
 * This effectively stops the live stream from being embeded in the website
 * The videoId is used as the document ID
 *
 * @param {string} videoId - The ID of the video to stop
 *
 * @returns {Promise<void>} - A promise that resolves when the live stream is stopped
 */
export const archiveChatMessages = async (videoId) => {
  const messagesRef = collection(db, 'livestreams', videoId, 'messages');
  const archiveRef = collection(db, 'archive', videoId, 'messages');

  const querySnapshot = await getDocs(messagesRef);
  querySnapshot.forEach(async (doc) => {
    const messageData = doc.data();
    const archiveDocRef = doc(archiveRef, doc.id);
    await setDoc(archiveDocRef, messageData);
    await deleteDoc(doc.ref);
  });
};

/**
 * Deletes a message from the Firestore database
 * The message is identified by the text and timestamp
 * The videoId is used as the document ID
 * The text and timestamp are used as the message ID
 *
 * @param {string} videoId - The ID of the video from which to delete the message
 * @param {string} text - The text of the message to delete
 * @param {Date} timestamp - The timestamp of the message to delete
 *
 * @returns {Promise<void>} - A promise that resolves when the message is deleted
 */
export const deleteMessage = async (videoId, text, timestamp) => {
  console.log('Deleting message:', videoId, text, timestamp);
  const messagesRef = collection(db, 'livestreams', videoId, 'messages');
  const q = query(
    messagesRef,
    where('text', '==', text),
    where('timestamp', '==', timestamp)
  );

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
};

/**
 * Function to mute a user in a live stream
 * NOTE: This function currently does not implement any functionality.
 *
 * @param {*} videoId
 * @param {*} uid
 */
export const muteUser = async (videoId, uid) => {};

/**
 * Fetches the title of a YouTube video from its URL using the backend API.
 * This function bypasses CORS issues by using the backend as a proxy.
 *
 * @param {string} url - The YouTube video URL (supports various formats: watch, live, embed, short links)
 *
 * @returns {Promise<string>} The video title if found, or 'No video just chatting :)' if not found/error
 */
export const fetchYoutubeVideoNameFromUrl = async (url) => {
  // Early return if no URL provided
  if (!url) {
    return 'No video just chatting :)';
  }

  try {
    console.log('Fetching video title for URL:', url);

    // Primary method: Use YouTube's oEmbed API (no API key required) - note this could potentially be deprecated, and require the API key in the future.
    // oEmbed is a format for allowing embedded representation of URLs
    try {
      // Extract the video ID from the URL using helper function
      const videoId = extractVideoIdFromUrl(url);
      if (videoId) {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        console.log('Trying oEmbed fallback:', oEmbedUrl);

        const oEmbedResponse = await fetch(oEmbedUrl);
        if (oEmbedResponse.ok) {
          const oEmbedData = await oEmbedResponse.json();
          if (oEmbedData.title) {
            console.log(
              'Title obtained via oEmbed fallback:',
              oEmbedData.title
            );
            return oEmbedData.title;
          }
        }
      }
    } catch (oEmbedError) {
      console.warn('oEmbed fallback also failed:', oEmbedError);
    }

    return 'No video just chatting :)';
  } catch (error) {
    console.error('Error fetching video title:', error);
    return 'No video just chatting :)';
  }
};

/**
 * Helper function to extract YouTube video ID from various URL formats.
 * Supports multiple YouTube URL patterns including standard watch URLs,
 * short URLs, embed URLs, and live stream URLs.
 *
 * @param {string} url - The YouTube URL to parse
 *
 * @returns {string|null} The extracted video ID, or null if not found
 */
const extractVideoIdFromUrl = (url) => {
  // Return early if no URL provided
  if (!url) return null;

  // Array of regex patterns to match different YouTube URL formats
  const patterns = [
    // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/live/ID
    // Captures everything after the format identifier until it hits a parameter separator or end
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,

    // Fallback pattern for URLs with v= parameter anywhere in the query string
    // Matches: youtube.com/watch?other_param=value&v=ID or youtube.com/watch?v=ID&other_param=value
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  // Try each pattern until we find a match
  for (const pattern of patterns) {
    const match = url.match(pattern);

    // If pattern matches and has a captured group, return the video ID
    if (match && match[1]) {
      return match[1];
    }
  }

  // No pattern matched - return null
  return null;
};

/**
 * Adds a reaction to a message in the Firestore database
 * The message is identified by the text and timestamp
 * The videoId is used as the document ID
 *
 * @param {string} videoId - The ID of the video containing the message
 * @param {string} text - The text of the message to which the reaction is added
 * @param {Date} timestamp - The timestamp of the message to which the reaction is added
 * @param {string} reaction - The reaction to add to the message (e.g., 'like', 'dislike', etc.)
 *
 * @returns {Promise<void>} - A promise that resolves when the reaction is added
 */
export const addReaction = async (videoId, text, timestamp, reaction) => {
  const messagesCollectionRef = collection(
    db,
    'livestreams',
    videoId,
    'messages'
  );
  const q = query(
    messagesCollectionRef,
    where('text', '==', text),
    where('timestamp', '==', timestamp)
  );

  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      updateDoc(doc.ref, {
        [`reactions.${reaction}`]: increment(1),
      });
    });
  } catch (error) {
    throw error;
  }
};

/**
 *
 * Function to fetch the title of a live stream from the Firestore database
 *
 * @param {string} streamId - The ID of the live stream to fetch the title for
 *
 * @returns {Promise<string>} - A promise that resolves to the title of the live stream, or an error message if the title could not be fetched
 */
export const fetchLiveStreamTitle = async (streamId) => {
  try {
    const liveStreamRef = doc(db, 'livestreams', streamId);
    const liveStreamSnap = await getDoc(liveStreamRef);

    if (liveStreamSnap.exists()) {
      return liveStreamSnap.data().title;
    } else {
      console.error('Live stream document does not exist.');
      return 'Error fetching title';
    }
  } catch (error) {
    console.error('Error fetching video name:', error);
    return 'Error fetching title';
  }
};

/**
 * Fetches all live streams from the Firestore database
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of live streams (Each stream is an object containing the stream's id and data)
 */
export const fetchLiveStreams = async () => {
  const liveStreamsSnapshot = await getDocs(collection(db, 'livestreams'));
  return liveStreamsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Function to fetch the number of active users in a live stream
 *
 * @param {*} liveStreamId
 *
 * @returns {Promise<number>} - A promise that resolves to the number of active users in the live stream
 */
export const fetchActiveUsersCount = async (liveStreamId) => {
  const liveStreamRef = doc(db, 'livestreams', liveStreamId);
  const liveStreamSnap = await getDoc(liveStreamRef);

  if (liveStreamSnap.exists()) {
    return liveStreamSnap.data().activeUsersCount || 0;
  } else {
    console.error('Live stream document does not exist.');
    return 0;
  }
};

/**
 * Gets video details from firebase cache
 *
 * @param {string} videoId - The video ID to search for
 *
 * @returns {Promise<Object|null>} - A promise that resolves to the video details object if found, or null if not found
 */
export const getVideoFromFirebase = async (videoId) => {
  try {
    const videoRef = doc(db, 'livestreams', videoId);
    const videoSnap = await getDoc(videoRef);

    if (videoSnap.exists()) {
      return videoSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching video from Firebase:', error);
    return null;
  }
};

/**
 * Updates the title of a video in the Firestore database
 *
 * @param {string} videoId - The ID of the video to update
 * @param {string} newTitle - The new title to set for the video
 *
 * @returns {Promise<void>} - A promise that resolves when the video title is updated
 */
export const updateVideoTitleInFirebase = async (videoId, newTitle) => {
  try {
    const videoRef = doc(db, 'livestreams', videoId);
    const videoSnap = await getDoc(videoRef);

    if (videoSnap.exists()) {
      await updateDoc(videoRef, { title: newTitle });
    }
  } catch (error) {
    console.error('Error updating video from Firebase:', error);
  }
};
