/**
 * @file HomePage.js
 * @author Jonas Matulis, Simon Tenedero
 * @created 2024-XX-XX
 * @lastModified 2025-07-07
 * @description file containing the HomePage component.
 */

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
    </div>
  );
};

export default HomePage;
