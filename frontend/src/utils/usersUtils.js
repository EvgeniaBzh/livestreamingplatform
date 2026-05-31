/**
 * @file usersUtils.js
 * @author Simon Tenedero, Jonas Matulis
 * @description Module for managing users
 */

import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  collection,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';

// Видалили імпорт roleUtils, щоб розірвати коло

export const addUser = async (user) => {
  console.log('called addUser()');
  const userRef = doc(db, 'users', user.uid);

  await setDoc(
    userRef,
    {
      username: user.username, 
      displayName: user.displayName, 
      email: user.email,
      photoURL: user.photoURL, 
      profilePicture: user.profilePicture, 
      role: {
        roleId: 'default', 
        roleName: 'Default',
        assignedBy: 'system',
        assignedAt: serverTimestamp(),
      },
      previousRoles: [], 
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  // assignSelfToUnrecognized(user); // Видалено, бо це тепер робить UserContext
  console.log(`User ${user.email} created`);
};

export const fetchUsers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const users = usersSnapshot.docs.map((doc) => ({
    ...doc.data(),
    uid: doc.id,
  }));
  return users;
};

export const fetchUserInfo = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const info = await getDoc(userRef);
  return info.data();
};

// Ці функції потрібні для roleUtils.js, тому ми їх експортуємо тут
export const fetchPublicUserInfo = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "publicUserInfo", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching public user info:", error);
    return null;
  }
};

export const getContentType = (file) => {
  if (file && file.type) return file.type;
  const extension = file.name?.split('.').pop().toLowerCase();
  switch (extension) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
};

export const logWebsiteUsage = async (userId, action, category, timestamp = new Date()) => {
  try {
    if (!userId) return;
    await addDoc(collection(db, "users", userId, category), {
      action: action,
      timestamp: timestamp,
    });
  } catch (error) {
    console.warn("Logging failed", error);
  }
};

export const uploadUserProfilePhoto = async (uid, file) => {
  try {
    const storageRef = ref(storage, `profilePhotos/${uid}`);
    const contentType = getContentType(file);
    const metadata = { contentType: contentType };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const photoURL = await getDownloadURL(snapshot.ref);

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { photoURL: photoURL });
    
    // Update public info as well
    const publicRef = doc(db, "publicUserInfo", uid);
    if ((await getDoc(publicRef)).exists()) {
        await updateDoc(publicRef, { profilePicture: photoURL });
    }

    return photoURL;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

export const resetPfp = async (uid, photoURL) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { photoURL: photoURL });
  
  const publicRef = doc(db, "publicUserInfo", uid);
    if ((await getDoc(publicRef)).exists()) {
        await updateDoc(publicRef, { profilePicture: photoURL });
    }
};

export const resetDisplayName = async (uid, name) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { displayName: name });
  
  const publicRef = doc(db, "publicUserInfo", uid);
    if ((await getDoc(publicRef)).exists()) {
        await updateDoc(publicRef, { displayName: name, username: name });
    }
};

// Заглушка, щоб не ламалися імпорти, якщо десь залишилося
export const assignSelfToUnrecognized = async () => {};