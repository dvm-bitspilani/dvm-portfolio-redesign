import styles from "./About.module.css"
import about from "../assests/about.png"
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import bg3 from "../assests/bg_3.png"
gsap.registerPlugin(ScrollTrigger);

const About = () => {
    const textureRef = useRef(null);
    const gradientRef = useRef(null);
    const containerRef = useRef(null);
    const gradientPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const updateMask = () => {
            if (!textureRef.current) return;
            const { x, y } = gradientPos.current;
            const mask = `radial-gradient(circle 400px at ${x+300}px ${y+300}px, black 0%, transparent 100%)`;
            textureRef.current.style.webkitMaskImage = mask;
            textureRef.current.style.maskImage = mask;
        };
        updateMask(); // Initial call to set the mask
        gsap.to(gradientPos.current, {
            x: window.innerWidth * 1.5,
            y: window.innerHeight * 1,
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 10%",
                end: "bottom -100%",
                scrub: 1,
               
            },
            onUpdate: updateMask,
        });


    }, []);
    useEffect(() => {
        gsap.to(gradientRef.current, {
            x: window.innerWidth * 1.5,
            y: window.innerHeight * 1,
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 10%",
                end: "bottom -100%",
                scrub: 1,

            },
        });
    }, []);

    return (
        <div ref={containerRef} className={styles.container}>
            <div className={styles.grid}></div>
            <div style={{ backgroundImage: `url(${bg3})` }}  ref={textureRef} className={styles.texture}></div>

            <img className={styles.image} src={about} alt="about" />
            <div className={styles.text}>
                <div>DEPARTMENT OF</div>
                <div className={styles.visualMedia}>VISUAL MEDIA</div>
            </div>
            <div className={styles.para}>
                The Department of Visual Media plays an instrumental role in building the software that is the backbone of all the three fests of BITS Pilani - Oasis and APOGEE.
            </div>
            <div className={styles.para1}>
                DVM is responsible for creating and maintaining the Websites, Applications (iOS & Android), Teasers, Trailers & Promotional Videos of the three fests.
            </div>
            <div className={styles.para2}>
                Despite generating traffic of over 5000 users on our apps and websites, we handle everything with ease.
            </div>
            <div className={styles.project}>PROJECTS</div>
            <div ref={gradientRef} className={styles.gradient}></div>
        </div>
    );
};

export default About;