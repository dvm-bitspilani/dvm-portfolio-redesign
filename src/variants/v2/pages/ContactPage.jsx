import Navbar from "../chrome/Navbar";
import Terminal from "../contact/Terminal";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <Terminal id="contact-page" page headingLevel={1} />
      </main>
    </>
  );
}
