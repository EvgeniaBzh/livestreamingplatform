/**
 * @file usersUtils.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-04
 * @desc module for managing users
 */

import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { assignSelfToUnrecognized } from './roleUtils';

/**
 * Function to add a user to the Firestore database
 *
 * @param {Object} user - The user object containing user information
 * @param {string} user.uid - The unique identifier for the user
 * @param {string} user.username - The username of the user (Google username)
 * @param {string} user.displayName - The display name of the user (website username)
 * @param {string} user.email - The email address of the user
 * @param {string} user.photoURL - The URL of the user's profile picture (website profile picture)
 * @param {string} user.profilePicture - The URL of the user's profile picture
 *
 * @returns {Promise<void>} A promise that resolves when the user is added to the database
 * @throws {Error} If there is an error adding the user to the database
 */
export const addUser = async (user) => {
  console.log('called addUser()');

  const userRef = doc(db, 'users', user.uid); // Using user UID as the document ID, this will be users/{u.id}

  await setDoc(
    userRef,
    {
      username: user.username, //google user name
      displayName: user.displayName, //website user name
      email: user.email,
      photoURL: user.photoURL, //website pfp
      profilePicture: user.profilePicture, //google pfp
      role: {
        roleName: 'unrecognized', //roleName is the same as roleId in firebase. by default, users are assinged an 'unrecognized' role, having no permissions to access experimental features
        assignedBy: 'assigned at account creation',
        assignedAt: serverTimestamp(),
        removedAt: null,
        removedBy: null,
      },
      previousRoles: [], //need to track which roles user has had with array of objects {role:rolename, assignedAt:time, removedAt:time}
      createdAt: serverTimestamp(),
    },
    { merge: true }
  ); //merge new data with existing document data instead of overwriting

  assignSelfToUnrecognized(user);

  console.log(`User ${user.email} created with role 'unrecognized'`);
};

/**
 * Fetches all users from the Firestore database and returns them as an array of user objects.
 * Each user object contains the user's data along with their unique identifier (uid).
 *
 * @returns {Promise<Array>} A promise that resolves to an array of user objects fetched from the Firestore database
 * @throws {Error} If there is an error fetching users from the database
 */
export const fetchUsers = async () => {
  //grab reference to entire collection
  const usersSnapshot = await getDocs(collection(db, 'users'));

  //create a new list of objects - NOTE '...' is the spread() operator, which returns an object containing a COPY of all the fields in an iteratable (doc.data() in this case)
  const users = usersSnapshot.docs.map((doc) => ({
    ...doc.data(),
    uid: doc.id,
  }));
  //the object returned by ...doc.data() is MERGED with uid:doc.id so essentially it'll be an object almost identical to a regular document PLUS a new key-value pair

  return users;
};

/**
 * Function to fetch user information from the Firestore database based on the provided user ID (uid).
 *
 * @param {string} uid - The unique identifier of the user whose information is to be fetched.
 *
 * @returns {Promise<Object>} A promise that resolves to an object containing the user's information.
 * @throws {Error} If there is an error fetching user information from the database
 */
export const fetchUserInfo = async (uid) => {
  const userRef = doc(db, 'users', uid);

  const info = await getDoc(userRef);
  console.log('DB Info: ', info.data());
  return info.data();
};

/**
 * Function to get the content type of a file based on its extension.
 *
 * @param {File} file - The file object for which the content type is to be determined.
 *
 * @returns {string} The content type of the file based on its extension.
 * @throws {Error} If the file type is not recognized, it defaults to 'image/png'.
 */
const getContentType = (file) => {
  console.log(
    'file: ',
    file,
    ' file type: ',
    file.type,
    ' file name: ',
    file.name
  );
  const extension = file.name.split('.').pop().toLowerCase();

  //potentially add error handling? what if file is not recognized

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png'; // Fallback content type
  }
};

/*****these following 3 functions are called in AccountPage.js - 'export' makes function available to external files*****/

/**
 * Function to upload a user's profile photo to Firebase Storage and update the user's photoURL in Firestore.
 *
 * @param {string} uid - The unique identifier of the user whose profile photo is to be uploaded.
 * @param {File} file - The file object representing the user's profile photo to be uploaded
 *
 * @returns {Promise<string>} A promise that resolves to the public URL of the uploaded profile photo.
 * @throws {Error} If there is an error uploading the profile photo or updating the user's
 */
export const uploadUserProfilePhoto = async (uid, file) => {
  try {
    // Create a reference to the storage bucket location, and get the reference
    const storageRef = ref(storage, `profilePhotos/${uid}`);
    const contentType = getContentType(file); // Determine the content type
    const metadata = {
      contentType: contentType,
    };

    //upload file and metadata to storage at storageRef. snapshot stores the metadata and reference to uploaded file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const photoURL = await getDownloadURL(snapshot.ref); //get a public URL for the file based on the snapshot reference - photoURL can be used to display img

    // Update the user's photoURL in Firestore with the new reference
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      photoURL: photoURL,
    });

    return photoURL;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

/**
 * set photoURL field to argument
 *
 * @param {string} uid - The unique identifier of the user whose profile photo URL is to be reset.
 * @param {string} photoURL - The new photo URL to be set for the user
 *
 * @returns {Promise<void>} A promise that resolves when the photo URL is successfully updated in Firestore.
 * @throws {Error} If there is an error updating the photo URL in Firestore
 */
export const resetPfp = async (uid, photoURL) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    photoURL: photoURL,
  });
};

/**
 * set displayName field to argument
 *
 * @param {string} uid - The unique identifier of the user whose display name is to be reset.
 * @param {string} name - The new display name to be set for the user
 *
 * @returns {Promise<void>} A promise that resolves when the display name is successfully updated in Firestore.
 * @throws {Error} If there is an error updating the display name in Firestore
 */
export const resetDisplayName = async (uid, name) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    displayName: name,
  });
};
