/**
 * @file AdminHeader.js
 * @author Paola Bustos, Yevheniia Bazhmaieva, Simon Tenedero
 * @created 2025-07-07
 * @lastModified 2025-07-07
 * @description file contains the AdminHeader component
 */

/**
 * Header for AdminPanelPage, contains the configure button
 *
 * @returns {JSX.Element} A header for the admin panel with a title and configure button
 */
const AdminHeader = () => {
  return (
    <div className="admin-header flex items-center py-4 px-5">
      <h1 className="font-bold text-lg mr-auto">Admin Panel</h1>
      <button
        className="hover:text-white"
        onClick={() => console.log('clicked configure')} //TODO: implement configure functionality
      >
        Configure
      </button>
    </div>
  );
};

export default AdminHeader;
