/**
 * @file firebaseConfig.js
 * @author Jonas Matulis, Simon Tenedero
 * @created 2024-XX-XX
 * @lastModified 2024-XX-XX
 * @description Configuration file for Firebase, initializing Firestore and Storage services.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/*
 * Firestore is a cloud-hosted NoSQL database provided by Firebase
 * Data is stored in collections (similar to a hash map)
 * The actual data is stored as key-value pairs; key = document id, value = document
 * ex.
 * users = {
 *  "idxyz":{name: "jellyCat", age: 5},
 *  "idabc":{name: "calico", age: 3}
 * }
 *
 * run down of functions in this example
 * doc(): creates a reference in the data base, think of as declaring a ptr - references are stored as path like structures
 * setDoc(): creates or overwrites data at the given reference
 * updateDoc(): only updates specified fields in a document - does not overwrite document
 * serverTimeStamp(): returns current time on server-side (NOT client-slide)
 * getDoc(): retrieve documentSnapshot based on given document id
 * getDocs(): retrieve bundle of documeSnapshot in a collection
 * colection(): create a reference - ptr - to an entire collection
 *
 * documentSnapshot: contains the data of a document as well as the doc id, whether document exists or not, metadata
 *
 * Firebase Config:
 * db (firestore) - stores structure data (key-value pairs where the value is an object with fields)
 * storage (cloud storage) - stores files/media (files are stored in buckets (similar to folders) instead of collections)
 *
 */

//object with credentials for Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyCSJgprIaGHqunzuJ17gAev7_lR_51SoFU",
  authDomain: "livestreaming-platform-937be.firebaseapp.com",
  projectId: "livestreaming-platform-937be",
  storageBucket: "livestreaming-platform-937be.firebasestorage.app",
  messagingSenderId: "104361532548",
  appId: "1:104361532548:web:52913d5de29fe2d4d7f6d1",
  measurementId: "G-7PPRK1BK30"
};

//start firebase app with config
const app = initializeApp(firebaseConfig);
//connect to database
const db = getFirestore(app);
//connect to storage
const storage = getStorage(app);

export { db, storage };
