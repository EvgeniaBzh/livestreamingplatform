/**
 * @file UserContext.js
 * @author Simon Tenedero
 * @created 2025-06-11
 * @lastModified 2025-07-02
 * @description file containing UserContext, decided to implement a user context to prevent prop drilling
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { addUser, fetchUserInfo } from '../utils/usersUtils';
import { logWebsiteUsage } from '../utils/livestreamsUtils';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig.js';

//1. create the context
const UserContext = createContext();

/**
 * 2. Hook to access user context
 *
 * @returns {Object} Object containing user, setUser, loading, loginTime, and setLoginTime
 */
export const useUser = () => {
  const context = useContext(UserContext); //provides the context value provided by the nearest UserProvider
  if (!context) {
    //this ensures useUser is not used with children not nested in a provider - this catches 'undefined'
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

/**
 * 3. create the context provider, 'children' is a special prop that represents any nested JSX inside the component
 *
 * UserProvider component provides user authentication state and user data to the application.
 * It listens for authentication state changes and updates the user context accordingly.
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); //create a local state inside UserProvider
  const [loading, setLoading] = useState(true); //used when auth state hasn't resolved yet - "checking if user is signed in on app startup"
  const [loginTime, setLoginTime] = useState(null); // Session tracking

  useEffect(() => {
    const auth = getAuth();
    let userDocUnsubscribe = null; //track the user document listener

    //this will trigger whenever handleSignIn() or handleSignOut() is called in ProfileMenu.js
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      //clean up previous user document listener
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (authUser) {
        //if user is signed in, initialize local user variable
        try {
          const existingUserData = await fetchUserInfo(authUser.uid);
          if (existingUserData) {
            const userInfo = {
              //user authUser as source of truth when possible
              uid: authUser.uid, //unique id for firebase document
              email: authUser.email, //google email
              displayName: authUser.displayName, //username from google account
              photoURL: authUser.photoURL, //profile photo from google account

              //these are custom fields, so we must use firebase for this.
              username: existingUserData.username, //custom name for our website (set in profile menu)
              profilePicture: existingUserData.profilePicture, //custom photo for our website (set in profile menu)
              role: existingUserData.role.roleName, //role
            };
            setUser(userInfo);

            //set up real-time listener for user document changes
            const userDocRef = doc(db, 'users', authUser.uid);
            let isInitialLoad = true;

            userDocUnsubscribe = onSnapshot(
              userDocRef,
              (docSnapshot) => {
                if (docSnapshot.exists()) {
                  //skip the initial load to avoid immediate reload
                  if (isInitialLoad) {
                    isInitialLoad = false;
                    return;
                  }

                  //only reload if this is a server update (not from cache or pending writes)
                  if (
                    !docSnapshot.metadata.hasPendingWrites &&
                    !docSnapshot.metadata.fromCache
                  ) {
                    const updatedUserData = docSnapshot.data();

                    //check if role changed (most important change requiring reload)
                    if (
                      updatedUserData.role?.roleName !==
                      existingUserData.role?.roleName
                    ) {
                      console.log(
                        'User role changed, initiating page reload...'
                      );

                      //notify user of permission change, then force reload
                      alert(
                        'Your account permissions have been updated. The page will now reload.'
                      );
                      window.location.reload();
                    } else {
                      //for other changes, just update the context without reload
                      console.log('User data updated, refreshing context...');
                      const updatedUserInfo = {
                        uid: authUser.uid,
                        email: authUser.email,
                        displayName: authUser.displayName,
                        photoURL: authUser.photoURL,
                        username: updatedUserData.username,
                        profilePicture: updatedUserData.profilePicture,
                        role: updatedUserData.role?.roleName || 'unrecognized',
                      };
                      setUser(updatedUserInfo);
                    }
                  }
                }
              },
              (error) => {
                console.error(
                  'Error listening to user document changes:',
                  error
                );
              }
            );
          } else {
            const newUserInfo = {
              //user authUser as source of truth when possible
              uid: authUser.uid,
              email: authUser.email,
              username: authUser.displayName,
              photoURL: authUser.photoURL,

              //since we don't have prev. user data, we use authUser data to initialize display
              displayName: authUser.displayName,
              profilePicture: authUser.photoURL,
              role: 'unrecognized', //default assign users to unrecognized, only have access to youtube chat
            };
            await addUser(newUserInfo);
            setUser(newUserInfo);

            //for new users, also set up the listener after initial creation
            const userDocRef = doc(db, 'users', authUser.uid);
            let isInitialLoad = true;

            userDocUnsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
              if (docSnapshot.exists() && !isInitialLoad) {
                if (
                  !docSnapshot.metadata.hasPendingWrites &&
                  !docSnapshot.metadata.fromCache
                ) {
                  const updatedUserData = docSnapshot.data();

                  if (updatedUserData.role?.roleName !== 'unrecognized') {
                    console.log(
                      'New user role assigned, initiating page reload...'
                    );
                    alert(
                      'Your account permissions have been updated. The page will now reload.'
                    );
                    window.location.reload();
                  }
                }
              }
              isInitialLoad = false;
            });
          }

          //track login time and log usage
          const currentTime = new Date();
          setLoginTime(currentTime);
          console.log('loginTime=', currentTime);
          logWebsiteUsage(
            authUser.uid,
            `User logged in at ${currentTime.toUTCString()}`
          );
        } catch (error) {
          console.error('Error setting up user:', error);
          setUser(null);
        }
      }
      //clean-up, user signs out
      else {
        //log website usage while user data is still available.
        if (user && loginTime) {
          const logoutTime = new Date();
          const sessionDuration =
            (logoutTime.getTime() - loginTime.getTime()) / (1000 * 60);
          logWebsiteUsage(
            user.uid,
            `User logged out at ${logoutTime.toUTCString()}, with a session time of ${sessionDuration} minutes.`
          );
        }
        setUser(null);
        setLoginTime(null);
      }
      setLoading(false); //auth state is now determined.
    });

    //cleanup function
    return () => {
      unsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []); //don't put user or login time in dependency, causes infinite loop.

  return (
    <UserContext.Provider
      value={{ user, setUser, loading, loginTime, setLoginTime }}
    >
      {/*the value prop is what will be passed to children from the context*/}
      {children}
    </UserContext.Provider>
  );
};
