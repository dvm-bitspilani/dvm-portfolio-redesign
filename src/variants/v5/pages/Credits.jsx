// Reel 9: Credits (contact). The message form, the rolling end credits, The End.
import { Frame, Reel } from "../reel/Reel";
import { ContactForm, CreditsRoll } from "../frames/blocks";
import { TitleCard } from "../frames/ends";
import { EndFrame } from "./Home";
import { site, socials } from "../lib/data";
import f from "../frames/frames.module.css";
import i from "./inner.module.css";

export default function Credits() {
  return (
    <Reel label="Credits and contact">
      <TitleCard n={9} title="Credits" line="Write to us, then let the credits roll." />
      <Frame id="message" chapter="Message" label="Send us a message" w={100} edge="MESSAGE">
        <div className={`${f.inner} ${i.message}`}>
          <div className={i.messageIntro}>
            <h1 className={i.sectionTitle}>Contact us</h1>
            <p className={i.body}>Questions about a fest, a project, a sponsorship or joining DVM. Fill this in and we will reply by email.</p>
            <p className={i.body}>
              Or write to <a href={`mailto:${site.contact.email}`} className={i.textLink}>{site.contact.email}</a>
            </p>
            <ul className={i.socialList}>
              {socials.map((so) => (
                <li key={so.id}>
                  <a href={so.url} target="_blank" rel="noreferrer" className={i.textLink}>
                    {so.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ContactForm idPrefix="contact" />
        </div>
      </Frame>
      <Frame id="roll" chapter="End credits" label="End credits" w={72} edge="END CREDITS">
        <div className={`${f.inner} ${i.rollFrame}`}>
          <CreditsRoll />
        </div>
      </Frame>
      <EndFrame />
    </Reel>
  );
}
