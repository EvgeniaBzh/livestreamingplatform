/**
 * @file HomePage.js
 * @description file containing the HomePage component.
 */

import { Link } from 'react-router-dom';

/**
 * HomePage component serves as the landing page for the application. Prompts users to log in to watch livestreams.
 *
 * @returns {JSX.Element} The rendered HomePage component
 */
const HomePage = () => {
  return (
    <div className="flex flex-col justify-start min-h-screen xl:pt-20 desktop:pt-10">
      <h1 className="my-auto ml-5 text-5xl md:text-7xl font-bold">
        welcome to the <br />{' '}
        <span className="text-primary">livestreaming</span> prototype. <br />{' '}
        login to watch.
      </h1>
      <div className="ml-5 mb-10">
        <Link
          to="/archive"
          className="btn btn-outline btn-primary text-lg px-8 py-3"
        >
          watch archived streams
        </Link>
      </div>
    </div>
  );
};

export default HomePage;