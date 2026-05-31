/**
 * @file App.js
 * @description Main application component that sets up the routing and state management for the K-Pop Livestream Platform. Also wraps the application in the FeatureProvider.
 */

import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import AccountPage from './pages/AccountPage';
import AdminPanel from './pages/AdminPanelPage';
import SettingsPage from './pages/SettingsPage';
import { FeatureProvider } from './context/FeatureContext';
import AdminRoute from './routeguard/AdminRoute';
import ArchivePage from './pages/ArchivePage';

const App = () => {
  //declaring state variables
  const [videoId, setVideoId] = useState(null); //id of Video currently being displayed
  const [videoUrl, setVideoUrl] = useState(''); //video url in input box in header
  const [activeUsers, setActiveUsers] = useState([]); //active users
  const [invitations, setInvitations] = useState([]); //user invitations
  const [privateChats, setPrivateChats] = useState([]); //all private chats user is a member of
  const [selectedPrivateChat, setSelectedPrivateChat] = useState(null); //currently selected private chat

  return (
    <FeatureProvider>
      <div className="app">
        <Header
          videoId={videoId}
          setVideoId={setVideoId}
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
        />
        <div className="content bg-gradient-to-t from-base-300 via-base-200 to-base-100 min-h-screen">
          <Routes>
            {/*use router to declare pages of website, exact path prevents partial URL matches from going to that route */}
            <Route exact path="/" element={<HomePage />} />
            <Route
              path="/load-live"
              element={
                <VideoPlayerPage
                  videoId={videoId}
                  setVideoId={setVideoId}
                  activeUsers={activeUsers}
                  setActiveUsers={setActiveUsers}
                  privateChats={privateChats}
                  setPrivateChats={setPrivateChats}
                  invitations={invitations}
                  setInvitations={setInvitations}
                  selectedPrivateChat={selectedPrivateChat}
                  setSelectedPrivateChat={setSelectedPrivateChat}
                />
              }
            />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/adminPanel"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/archive" element={<ArchivePage />} />
          </Routes>
        </div>
      </div>
    </FeatureProvider>
  );
};

export default App;