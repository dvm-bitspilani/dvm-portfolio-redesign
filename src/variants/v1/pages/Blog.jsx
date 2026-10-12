import { useState } from "react";
import Blog_Page from "../components/blogs/Blog_Page";
import Ham from "../components/Ham";

const Landing = () => {
  const [isHamOpen, setIsHamOpen] = useState(false);

  return (
    <>
      <Blog_Page onHamClick={() => setIsHamOpen(true)} />

      {isHamOpen && <Ham onClose={() => setIsHamOpen(false)} />}
    </>
  );
};

export default Landing;