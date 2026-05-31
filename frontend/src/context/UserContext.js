/**
 * @file UserContext.js
 * @author Simon Tenedero, Yevheniia Bazhmaieva
 * @created 2025-06-11
 * @lastModified 2025-11-26
 * @description file containing UserContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserInfo } from '../utils/usersUtils';
import { logWebsiteUsage } from '../utils/livestreamsUtils';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig.js';
import { useAuth } from '../hooks/useAuth.js';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginTime, setLoginTime] = useState(null);

  const { handleSignOut } = useAuth();

  useEffect(() => {
    const auth = getAuth();
    let userDocUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (authUser) {
        try {
          await authUser.getIdToken();
          let existingUserData = await fetchUserInfo(authUser.uid);

          // --- 1. ЛОГІКА СТВОРЕННЯ НОВОГО ЮЗЕРА ---
          if (!existingUserData) {
            console.log('User document not found. Creating manually...');

            // ТУТ ГОЛОВНА ЛОГІКА РОЛЕЙ
            // Ваша пошта -> Admin, всі інші -> Default
            const isAdminEmail = authUser.email === "bazhmaevaevgenia@gmail.com";
            
            const targetRoleId = isAdminEmail ? "admin" : "default"; 
            const targetRoleName = isAdminEmail ? "Admin" : "Default";

            // A. Створюємо приватний документ (users)
            const newUserRef = doc(db, 'users', authUser.uid);
            const newUserData = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName || 'New User',
              photoURL: authUser.photoURL || '',
              role: {
                roleId: targetRoleId, // "default" або "admin"
                roleName: targetRoleName,
                updatedRoleAt: new Date(),
              },
              createdAt: new Date(),
              isActive: true,
            };
            await setDoc(newUserRef, newUserData);

            // B. Створюємо публічний документ (publicUserInfo)
            const publicUserRef = doc(db, 'publicUserInfo', authUser.uid);
            await setDoc(publicUserRef, {
              uid: authUser.uid,
              username: authUser.displayName || 'New User',
              displayName: authUser.displayName || 'New User',
              profilePicture: authUser.photoURL || '',
              bio: 'No bio available.',
            });

            // C. Додаємо юзера в список учасників ролі (roles/{roleId})
            try {
              const roleRef = doc(db, 'roles', targetRoleId);
              
              // Перевіримо, чи існує документ ролі, щоб не було помилки
              const roleSnap = await getDoc(roleRef);
              if (roleSnap.exists()) {
                  await updateDoc(roleRef, {
                    members: arrayUnion({
                      userId: authUser.uid,
                      displayName: authUser.displayName || 'New User',
                      photoURL: authUser.photoURL || '',
                    }),
                  });
                  console.log(`User added to ${targetRoleId} role members.`);
              } else {
                  console.warn(`Role document '${targetRoleId}' does not exist!`);
              }
            } catch (err) {
              console.error('Error adding user to role list:', err);
            }

            existingUserData = newUserData;
            console.log(`User created successfully as ${targetRoleName}!`);
          }

          // --- 2. САМОЛІКУВАННЯ (Якщо юзер є, а публічного профілю немає) ---
          const publicInfoRef = doc(db, 'publicUserInfo', authUser.uid);
          const publicInfoSnap = await getDoc(publicInfoRef);
          if (!publicInfoSnap.exists()) {
             await setDoc(publicInfoRef, {
                uid: authUser.uid,
                username: authUser.displayName || 'User',
                displayName: authUser.displayName || 'User',
                profilePicture: authUser.photoURL || '',
                bio: 'No bio available.',
             });
          }

          // --- ЗАВАНТАЖЕННЯ В STATE ---
          if (existingUserData) {
            const userInfo = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              username: existingUserData.username || authUser.displayName,
              profilePicture: existingUserData.profilePicture || authUser.photoURL,
              // Зберігаємо повний об'єкт ролі
              role: existingUserData.role || { roleId: 'default', roleName: 'Default' },
            };
            setUser(userInfo);

            // Слухач змін у базі
            const userDocRef = doc(db, 'users', authUser.uid);
            let isInitialLoad = true;

            userDocUnsubscribe = onSnapshot(
              userDocRef,
              (docSnapshot) => {
                if (docSnapshot.exists()) {
                  if (isInitialLoad) {
                    isInitialLoad = false;
                    return;
                  }

                  if (
                    !docSnapshot.metadata.hasPendingWrites &&
                    !docSnapshot.metadata.fromCache
                  ) {
                    const updatedUserData = docSnapshot.data();

                    if (
                      updatedUserData.role?.roleId !==
                      existingUserData.role?.roleId
                    ) {
                      console.log('Role changed, reloading...');
                      alert('Your permissions have been updated. Reloading.');
                      window.location.reload();
                    } else {
                      setUser((prev) => ({
                        ...prev,
                        ...updatedUserData,
                        role: updatedUserData.role,
                      }));
                    }
                  }
                }
              },
              (error) => console.error(error)
            );

            // Логування входу
            const isFreshSignIn = sessionStorage.getItem('freshSignIn') === 'true';
            if (isFreshSignIn) {
              logWebsiteUsage(authUser.uid, `User logged in`, 'loginHistory');
              sessionStorage.removeItem('freshSignIn');
            }

            const storedLoginTime = sessionStorage.getItem('loginTime');
            setLoginTime(storedLoginTime ? new Date(parseInt(storedLoginTime)) : new Date());
          }
        } catch (error) {
          console.error('Error setting up user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        setLoginTime(null);
        localStorage.removeItem('lastVideoUrl');
        localStorage.removeItem('lastPage');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{ user, setUser, loading, loginTime, setLoginTime }}
    >
      {children}
    </UserContext.Provider>
  );
};