/**
 * @file ProfileMenu.js
 * @author Paola Bustos, Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-30
 * @description file containing ProfileMenu component
 */

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { GoogleUserSignIn, signOutUser } from '../../auth/googleAuth'; // Authentication functions
import { NavLink } from 'react-router-dom'; // React Router component for navigation
import { useUser } from '../../context/UserContext';

/**
 * Menu that appears when profile is clicked on right side of navbar. displays user login/logout functionality and user profile menu.
 *
 * @returns {JSX.Element} rendered component of ProfileMenu
 */
const ProfileMenu = () => {
  //retrieve user context
  const { user } = useUser();

  // We define the classes as constants so as not to repeat so much
  const linkBaseClass =
    'block px-4 py-3 text-white transition-colors duration-200 text-sm';
  const hoverClass = 'hover:bg-primary';

  /**
   * Handles user sign-in with Google authentication. This will trigger on authStateChanged()
   */
  async function handleSignIn() {
    //error handling is defined in googleAuth.js
    const response = await GoogleUserSignIn(); // Trigger Google sign-in, get user data such as email, profile, name, etc.
    if (response.result === 'error') {
      console.error('Google sign-in failed:', response.error);
      return;
    }
    console.log('Sign-in initiated successfully.');
  }

  /**
   * Handles user sign-out and updates the UI accordingly. This will trigger the cleanup of onAuthStateChanged
   */
  function handleSignOut() {
    const response = signOutUser(); // Trigger Google sign-out
    if (response.result === 'error') {
      console.error('Google sign-out failed:', response.error);
      return;
    }
    console.log('Sign-out initiated successfully.');
  }

  return (
    <div className="relative text-xs">
      {user ? (
        <Menu as="div" className="relative inline-block text-left">
          {({ open }) => (
            <>
              <MenuButton className="mr-5">
                <div className="flex items-center">
                  <img
                    alt="User Avatar"
                    src={user.photoURL || user.profilePicture}
                    className="rounded-full w-10 h-10"
                  />
                </div>
              </MenuButton>

              {open && (
                <MenuItems
                  transition
                  className="absolute top-full right-3 w-52 bg-base-300 text-white shadow-xl rounded-xl"
                >
                  <MenuItem>
                    {({ active }) => (
                      <NavLink
                        to="/account"
                        className={({ isActive }) =>
                          `rounded-t-md ${linkBaseClass} ${hoverClass} ${isActive ? 'bg-primary' : ''}`
                        }
                      >
                        Profile
                      </NavLink>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                          `${linkBaseClass} ${hoverClass} ${isActive ? 'bg-primary' : ''}`
                        }
                      >
                        Settings
                      </NavLink>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={handleSignOut}
                        className={`rounded-b-md text-left w-full ${linkBaseClass} ${hoverClass}`}
                      >
                        Logout
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              )}
            </>
          )}
        </Menu>
      ) : (
        <button
          onClick={handleSignIn}
          id="login"
          className="whitespace-nopwrap truncate mr-2 btn btn-secondary text-xsm hover:btn-accent px-4"
        >
          Google Login
        </button>
      )}
    </div>
  );
};

export default ProfileMenu;
