import dvm_text from "../assests/image.png"
import styles from "./HomePage.module.css"
import logo from "../assests/logo.png"
import About from "./About"
import bg3 from "../assests/bg_3.png"
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
gsap.registerPlugin(ScrollTrigger);
const HomePage = () => {
    const textureRef = useRef(null);
    const gradientRef = useRef(null);
    const containerRef = useRef(null);
    const gradientPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const updateMask = () => {
            if (!textureRef.current) return;
            const { x, y } = gradientPos.current;
            const centerX = x + window.innerWidth * 0.2;
            const centerY = y + window.innerHeight * 0.28;
            const mask = `radial-gradient(circle 30vh at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
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
        <>
            <div className={styles.container}>
                <div className={styles.grid}></div>
                <div style={{ backgroundImage: `url(${bg3})` }} ref={textureRef} className={styles.texture}></div>
                
                <img className={styles.dvm_text} src={dvm_text} alt="dvm_text" />

                <div className={styles.image_container}><img className={styles.logo} src={logo} alt="logo" /></div>
                <div className={styles.text}>
                    <div>DEPARTMENT OF</div>
                    <div className={styles.visualMedia}>VISUAL MEDIA</div>
                </div>
                <div className={styles.text_sub}>
                    <div>CODE.</div>
                    <div>DESIGN.</div>
                    <div>ANIMATE.</div>

                </div>
                <button className={styles.about}>ABOUT US</button>
                <div ref={gradientRef} className={styles.gradient}></div>
            </div >
           


          
        </>
    );
};

export default HomePage;