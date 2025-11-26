/**
 * @file Header.js
 * @author Paola Bustos, Simon Tenedero, Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2025-06-01
 * @description file containing Header component (main navbar)
 */

import { useState } from 'react';
import ProfileMenu from './ProfileMenu';
import VideoHeader from './VideoHeader';
import PagesMenu from './PagesMenu';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useLocation } from 'react-router-dom';
//import InviteHeaderButton from './InviteHeaderButton';

/**
 * Header component for displaying navigation and user options.
 *
 * @param {*} props - The component properties
 * @param {string} props.videoId - Current video ID.
 * @param {Function} props.setVideoId - Function to update the video ID.
 * @param {string} props.videoUrl - URL of the current video.
 * @param {Function} props.setVideoUrl - Function to update the video URL.
 *
 * @returns {JSX.Element} The rendered header component.
 */
const Header = ({ videoId, setVideoId, videoUrl, setVideoUrl }) => {
  const location = useLocation();

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showMobileInput, setShowMobileInput] = useState(false);

  //const [isChecked, setIsChecked] = useState(true); //related to dark & light mode

  /*
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'kpop_light') {
      setIsChecked(true);
    } else {
      setIsChecked(false);
    }
  }, []);*/

  /**
   * Toggles between light and dark theme based on the checkbox state.
   * @param {Object} e - The event object.
   */
  /*
  const handleThemeToggle = (e) => {
    //document.documentElement.setAttribute('data-theme', 'kpop_light');
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'kpop_light');
      setIsChecked(true);
    } else {
      document.documentElement.setAttribute('data-theme', 'kpop_dark');
      setIsChecked(false);
    }
  };*/

  return (
    <header
      className="relative flex items-center justify-between w-[100vw] p-1"
      style={{ boxShadow: '0 -1px 10px rgb(0, 0, 0)' }}
    >
      {/* Desktop View */}
      <div className="hidden md:flex items-center">
        <PagesMenu />
        <span className="text-base text-white ml-4 whitespace-nowrap mr-10">
          livestreaming prototype
        </span>
      </div>
      <div className="hidden md:flex w-1/2 justify-center">
        <VideoHeader
          setVideoId={setVideoId}
          videoId={videoId}
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
        />
      </div>

      <div className="hidden md:flex my-4">{/*<InviteHeaderButton/>*/}</div>
      <div className="hidden md:flex items-center">
        <ProfileMenu />
      </div>

      {/* Theme Toggle Button 
      <label className="swap swap-rotate md:mr-1">
        <input type="checkbox" className="theme-controller" onChange={handleThemeToggle} checked={isChecked} />
        <img src={LightMode} alt="Day Mode" className="swap-off h-8 w-8 md:h-12 md:w-12" />
        <img src={NightMode} alt="Night Mode" className="swap-on h-8 w-8 md:h-12 md:w-12" />
      </label>
      */}

      {/* Mobile View */}
      <div className="flex justify-around md:hidden w-full items-center">
        {!showMobileInput ? (
          <>
            <PagesMenu />
            <span className="text-sm font-bold text-white ml-1 whitespace-nowrap">
              livestreaming prototype
            </span>
            {/*dont render button to show video input if on admin panel*/}
            {location.pathname !== '/adminPanel' ? (
              <button
                onClick={() => setShowMobileInput(true)}
                className="ml-auto mr-10"
              >
                <PlayIcon className="w-8 h-8 border border-white rounded-full px-1" />
              </button>
            ) : (
              <div></div>
            )}
            <ProfileMenu />
          </>
        ) : (
          <div className="w-full flex items-center gap-2 px-4">
            <button
              onClick={() => setShowMobileInput(false)}
              className="text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1 w-full">
              <VideoHeader
                setVideoId={setVideoId}
                videoId={videoId}
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
