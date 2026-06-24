import styles from "./About.module.css"
import about from "../assests/about.png"
import lines from "../assests/lines.png"
const About = () => {
    return (
        <div className={styles.container}>
            <div className={styles.lines}>
                <img src={lines} alt="lines" />
            </div>
            <img className={styles.image} src={about} alt="about" />
            <div className={styles.text}>
                <div>DEPARTMENT OF</div>
                <div className={styles.visualMedia}>VISUAL MEDIA</div>
            </div>
            <div className={styles.para}>The Department of Visual Media plays an instrumental role in building the software that is the backbone of all the three fests of BITS Pilani - Oasis and APOGEE.</div>
            <div className={styles.para1}>DVM is responsible for creating and maintaining the Websites, Applications (iOS & Android), Teasers, Trailers & Promotional Videos of the three fests.</div>
            <div className={styles.para2}>Despite generating traffic of over 5000 users on our apps and websites, we handle everything with ease.</div>
            <div className={styles.project}>PROJECTS</div>
        </div>
    )
}

export default About