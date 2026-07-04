import { useState } from "react";

import Navbar from "./components/Navbar";
import LandingPage from "./components/HomePage";
import AboutPage from "./components/About";
import Ham from "./components/Ham";
const App = () => {
  const [isHamOpen, setIsHamOpen] = useState(false);

  return (
    <>
      <Navbar onHamClick={() => setIsHamOpen(true)} />

      <LandingPage />
      
      <AboutPage />
      <LandingPage />
      {isHamOpen && (
        <Ham onClose={() => setIsHamOpen(false)} />
      )}
    </>
  );
};

export default App;