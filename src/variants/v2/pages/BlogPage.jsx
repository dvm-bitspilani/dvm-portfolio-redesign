import { useState } from "react";
import Blog_Page from "../base/Blog_Page";
import Ham from "../chrome/Ham";

export default function BlogPage() {
  const [hamOpen, setHamOpen] = useState(false);
  return (
    <>
      <Blog_Page onHamClick={() => setHamOpen(true)} />
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
