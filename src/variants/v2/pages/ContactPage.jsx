import { useState } from "react";
import Navbar from "../chrome/Navbar";
import Ham from "../chrome/Ham";
import Terminal from "../contact/Terminal";

export default function ContactPage() {
  const [hamOpen, setHamOpen] = useState(false);
  return (
    <>
      <Navbar onHamClick={() => setHamOpen(true)} />
      <main>
        <Terminal id="contact-page" page headingLevel={1} />
      </main>
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
