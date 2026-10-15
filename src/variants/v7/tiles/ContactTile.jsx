// Contact. Expands into the contact form (same web3forms endpoint as the original site).
import Head from "./Head";
import ContactPage from "../pages/ContactPage";
import { site, socials } from "../lib/data";
import t from "./tiles.module.css";

export default function ContactTile({ role, label }) {
  if (role === "primary") return <ContactPage />;
  return (
    <>
      <Head id="contact" label={label} led="live">
        Open
      </Head>
      <div className={t.contact} data-role={role}>
        <ul className={t.contactSocials}>
          {socials.map((s) => (
            <li key={s.id}>{s.label}</li>
          ))}
        </ul>
        <p className={t.contactBig}>
          Write
          <br />
          to us
        </p>
        <p className={t.contactMail}>{site.contact.email}</p>
      </div>
    </>
  );
}
