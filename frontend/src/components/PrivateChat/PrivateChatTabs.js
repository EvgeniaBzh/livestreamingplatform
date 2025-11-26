/**
 * @file PrivateChatTabs.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-05-28
 * @description file containing ChatTabs component
 */

/**
 * This component displays a list of chat tabs (messages, invitations)
 * It allows users to switch between different tabs.
 * When a tab is clicked, the corresponding pane will appear in switchable chat
 *
 * @param {Object} props - The component properties
 * @param {Array} props.privateTabs - Array of objects representing private chat tabs, each with an id and name.
 * @param {string} props.selectedPrivateTab - The currently selected private tab's id.
 * @param {Function} props.onSelectPrivateTab - Callback function to handle private tab selection.
 * @param {Array} props.invitations - Array of invitation objects, used to display a notification dot if there are pending invitations.
 *
 * @returns {JSX.Element} The rendered PrivateChatTabs component
 */
const PrivateChatTabs = ({
  privateTabs,
  selectedPrivateTab,
  onSelectPrivateTab,
  invitations,
}) => {
  return (
    <div className="flex w-full border-b border-base-100 pt-1 px-3 py-1">
      {privateTabs.length > 0 ? (
        privateTabs.map((tab) => (
          <button
            key={tab.id}
            className={`${tab.id === 'messagesTab' ? 'mr-auto' : ''} p-1 fit-content flex items-center justify-between cursor-pointer text-sm ${selectedPrivateTab === tab.id ? 'text-primary' : 'text-base-content hover:text-white'}`}
            onClick={() => {
              console.log(typeof onSelectPrivateTab);
              onSelectPrivateTab(tab.id);
            }}
          >
            <div className="flex">
              <span className="flex-grow truncate">{tab.name}</span>
              {/*render a red circle to say theres an invitation pending*/}
              {tab.id === 'invitationsTab' && invitations.length > 0 && (
                <div className="bg-red-500 text-white rounded-full w-2 h-2 flex justify-center items-center text-xs"></div>
              )}
            </div>
          </button>
        ))
      ) : (
        <div className="flex items-center justify-between p-2 flex-1 text-sm text-base-content">
          <span className="flex-grow truncate">No private tabs Available</span>
        </div>
      )}
    </div>
  );
};

export default PrivateChatTabs;
