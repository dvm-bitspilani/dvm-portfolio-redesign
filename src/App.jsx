import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Land from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import Blog from "./pages/Blog";

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          color: "#fff",
          fontSize: "2rem",
          fontWeight: "bold",
        }}
      >
        Loading...
      </div>
    );
  }

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