import { useState } from "react";

import Navbar from "./components/Navbar";
import LandingPage from "./components/HomePage";
import AboutPage from "./components/About";
import Ham from "./components/Ham";
import Blog from "./components/blogs/Blog_Land";
const App = () => {
  const [isHamOpen, setIsHamOpen] = useState(false);

  return (
    <>
      <Navbar onHamClick={() => setIsHamOpen(true)} />

      <LandingPage />
      
      <AboutPage />
      <Blog />
      {isHamOpen && (
        <Ham onClose={() => setIsHamOpen(false)} />
      )}
    </>
  );
};

export default App;