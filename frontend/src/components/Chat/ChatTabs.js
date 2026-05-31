/**
 * @file ChatTabs.js
 * @author Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-04
 * @description file containing ChatTabs component
 */

import './styles/ChatTabs.css';
import { FeatureGate } from '../Gates/FeatureGate';

/**
 * This component displays a list of chat tabs (youtube, native, private) - also used for the messages/invites
 * It allows users to switch between different tabs.
 * When a tab is clicked, the corresponding pane will appear in switchable chat
 *
 * @param {*} props - The component properties
 * @param {Array} props.tabs - Array of tab objects, each with an id, name, and optional url and flag
 * @param {string} props.selectedTab - The currently selected tab's id
 * @param {Function} props.onSelectTab - Callback function to handle tab selection
 *
 * @returns {JSX.Element} A list of chat tabs with buttons to switch between them
 */
const ChatTabs = ({ tabs, selectedTab, onSelectTab }) => {
  return (
    <div className="flex gap-8">
      {tabs.length > 0 ? (
        tabs.map((tab) => (
          <FeatureGate flag={tab.flag}>
            <div
              className={`rounded-full button-container flex items-center justify-between flex-1 ${selectedTab === tab.id ? 'active-tab-container p-0.5' : ''}`}
            >
              <button
                key={tab.id}
                className={`font-dm rounded-full p-1 cursor-pointer w-full text-xs md:text-sm whitespace-nowrap ${selectedTab === tab.id ? 'active-tab bg-neutral' : 'text-neutral bg-accent hover:bg-white'}`}
                onClick={() => {
                  console.log(tab);
                  onSelectTab(tab.id);
                }}
              >
                {tab.name || tab.url}
              </button>
            </div>
          </FeatureGate>
        ))
      ) : (
        <div className="flex items-center justify-between p-2 flex-1 text-sm text-base-content">
          <span className="flex-grow truncate">No Tabs Available</span>
        </div>
      )}
    </div>
  );
};

export default ChatTabs;
