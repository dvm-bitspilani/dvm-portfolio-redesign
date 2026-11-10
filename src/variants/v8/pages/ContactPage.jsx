import Navbar from "../chrome/Navbar";
import Contact from "../contact/Contact";
import ui from "../ui.module.css";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <Contact id="contact-page" page headingLevel={1} />
      </main>
    </>
  );
}
