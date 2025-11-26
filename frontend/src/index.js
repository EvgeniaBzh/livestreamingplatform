/**
 * @file index.js
 * @author Paola Bustos, Jonas Matulis, Simon Tenedero
 * @created 2024-XX-XX
 * @lastModified 2025-07-07
 * @description Main entry point for the React application, rendering the App component within a HashRouter and UserProvider context.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import './index.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <HashRouter>
      {/*wrapping app in user provider to make User available to all components in app*/}
      <UserProvider>
        <App />
      </UserProvider>
    </HashRouter>
  </React.StrictMode>
);
