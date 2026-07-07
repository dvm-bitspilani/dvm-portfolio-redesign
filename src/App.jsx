import { Routes, Route } from "react-router-dom";
import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";
const App = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Land />} />
        <Route path="/blog" element={<Blog />} />
      
      </Routes>
      
    </>
  );
};

export default App;