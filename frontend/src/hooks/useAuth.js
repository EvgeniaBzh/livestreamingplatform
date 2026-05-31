/**
 * @file useAuth.js
 * @description Custom hook to handle Google Authentication (Sign In / Sign Out)
 */

import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { useState } from "react";

export const useAuth = () => {
  const [error, setError] = useState(null);

  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  // Функція входу через Google
  const handleSignIn = async () => {
    setError(null);
    try {
      // Це відкриває спливаюче вікно Google
      await signInWithPopup(auth, provider);
      // sessionStorage використовується для визначення "свіжого" входу для логування
      sessionStorage.setItem("freshSignIn", "true");
      console.log("Sign-in successful");
    } catch (err) {
      console.error("Error signing in:", err);
      setError(err.message);
    }
  };

  // Функція виходу
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      
      // Очищаємо локальні дані
      localStorage.removeItem("lastVideoUrl");
      localStorage.removeItem("lastPage");
      sessionStorage.clear();
      
      console.log("Sign-out successful");
      // Перезавантажуємо сторінку, щоб очистити всі стани React
      window.location.href = "/"; 
    } catch (err) {
      console.error("Error signing out:", err);
      setError(err.message);
    }
  };

  return {
    handleSignIn,
    handleSignOut,
    error
  };
};