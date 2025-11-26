/**
 * @file InviteHeaderButton.js
 * @author Paola Bustos, Jonas Matulis, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file containing InviteHeaderButton component
 */

import { useState } from 'react';
import InviteUsersModal from '../Modal/InviteUsersModal.js';

/**
 * Button that toggles the display of the InviteUsersModal.
 *
 * @returns {JSX.Element} A button that opens the InviteUsersModal when clicked.
 */
const InviteHeaderButton = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  /**
   * Toggles the visibility of the InviteUsersModal.
   */
  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  return (
    <div>
      <button
        onClick={togglePopup}
        className="whitespace-nowrap bg-primary text-white px-5 py-1 mr-5 rounded-lg text-sm hover:bg-red-600 transition duration-200 ease-in-out shadow-md"
      >
        invite users
      </button>
      {isPopupOpen && <InviteUsersModal onClose={togglePopup} />}
    </div>
  );
};

export default InviteHeaderButton;
