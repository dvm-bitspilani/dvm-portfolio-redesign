import dvm_text from "../assests/image.png";
import styles from "./HomePage.module.css";
import logo from "../assests/logo.png";
import About from "./About";

import bg3 from "../assests/bg_3.png";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
    const textureRef = useRef(null);
    const gradientRef = useRef(null);
    const containerRef = useRef(null);
    const logoRef = useRef(null);
    const dvm_Ref = useRef(null);
    const dvm_textRef = useRef(null);
    const code_ref = useRef(null);
    const about_ref = useRef(null);
    const gradientPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const updateMask = () => {
            if (!textureRef.current) return;

            const { x, y } = gradientPos.current;
            const centerX = x + window.innerWidth * 0.6;
            const centerY = y + window.innerHeight * 0.2;

            const mask = `radial-gradient(circle 40vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;

            textureRef.current.style.webkitMaskImage = mask;
            textureRef.current.style.maskImage = mask;
        };

        updateMask();

        gsap.to(gradientPos.current, {
            x: -window.innerWidth * 1.5,
            y: window.innerHeight,
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
            x: -window.innerWidth * 1.5,
            y: window.innerHeight,
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 10%",
                end: "bottom -100%",
                scrub: 1,
            },
        });
    }, []);

    useEffect(() => {
        gsap.from(dvm_textRef.current, {
  
            y: -100,
            opacity: 0,
            duration: 1,
        

        });
        
    }, []);
    useEffect(() => {
        const tl = gsap.timeline();
        tl.from(dvm_Ref.current, {

            x: -100,
            opacity: 0,
            duration: 1,
        

        })
        .from(code_ref.current.children, {
            x: -100,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            
        })
        .from(about_ref.current, {
            x: -100,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,

        })


    }, []);

    useEffect(() => {
        const tl = gsap.timeline();
        tl.to(logoRef.current, {
            zIndex: 1000
        }).from(logoRef.current, {
            z: -1000,
            opacity: 0,
            duration: 1,
            delay: 0.5
        });

    }, []);

    useEffect(() => {
        gsap.to(gradientRef.current, {
            x: -window.innerWidth * 1.5,
            y: window.innerHeight,
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

                <img className={styles.dvm_text} src={dvm_text} ref={dvm_textRef} alt="dvm_text" />

                <div ref={logoRef} className={styles.image_container}><img className={styles.logo} src={logo} alt="logo" /></div>
                <div className={styles.text} ref={dvm_Ref}>
                    <div>DEPARTMENT OF</div>
                    <div className={styles.visualMedia}>VISUAL MEDIA</div>
                </div>
                <div className={styles.text_sub} ref={code_ref}>
                    <div>CODE.</div>
                    <div>DESIGN.</div>
                    <div>ANIMATE.</div>

                </div>
                <button ref={about_ref} className={styles.about}>ABOUT US</button>
                <div ref={gradientRef} className={styles.gradient}></div>
            </div >
           


          
        </>
    );
};

export default HomePage;