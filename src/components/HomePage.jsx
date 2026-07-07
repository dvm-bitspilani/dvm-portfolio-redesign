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
    const logoGlowRef = useRef(null);
    const dvm_Ref = useRef(null);
    const dvm_textRef = useRef(null);
    const code_ref = useRef(null);
    const about_ref = useRef(null);
    const lineRef = useRef(null);
    const line1Ref = useRef(null);
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

    // DVM text reveal (left -> right)
    useEffect(() => {
        gsap.set(dvm_textRef.current, {
            clipPath: "inset(0 100% 0 0)",
            webkitClipPath: "inset(0 100% 0 0)",
        });

        const tl = gsap.timeline();

        tl.to(lineRef.current, {
            x: window.innerWidth * 1.5,
            ease: "none",
            duration: 1,

        }, 0)
        .to(dvm_textRef.current, {
            clipPath: "inset(0 0% 0 0)",
            webkitClipPath: "inset(0 0% 0 0)",
            ease: "none",
            duration: 1,

        }, 0)
        .from(dvm_Ref.current, {
            x: -100,
            opacity: 0,

        })
        .from(code_ref.current.children, {
            x: -100,
            opacity: 0,
            duration: 1,
            stagger: 0.3,
        })
        .from(about_ref.current, {
            x: -100,
            opacity: 0,
            duration: 1,
            stagger: 0.3,
        })
    }, []);

    // Logo reveal (top -> bottom) with glowing outline trace
    useEffect(() => {
        gsap.set(logoRef.current, {
            clipPath: "inset(0 0 100% 0)",
            webkitClipPath: "inset(0 0 100% 0)",
        });

        gsap.set(logoGlowRef.current, {
            filter: "drop-shadow(0 0 0px rgba(120,220,255,0)) drop-shadow(0 0 0px rgba(120,220,255,0))",
        });

        const tl = gsap.timeline({ delay: 0.5 });

        tl.to(line1Ref.current, {
            y: window.innerHeight * 1.5,
            ease: "none",
            duration: 2.5,
        }, 0)
        .to(logoRef.current, {
            clipPath: "inset(0 0 0% 0)",
            webkitClipPath: "inset(0 0 0% 0)",
            ease: "none",
            duration: 2.5,
        }, 0)
        .to(logoGlowRef.current, {
            filter: "drop-shadow(0 0 14px rgba(120,220,255,0.9)) drop-shadow(0 0 34px rgba(60,200,230,0.6))",
            duration: 1.2,
            ease: "power2.out",
        }, 0)
        .to(logoGlowRef.current, {
            filter: "drop-shadow(0 0 0px rgba(120,220,255,0)) drop-shadow(0 0 0px rgba(120,220,255,0))",
            duration: 1.3,
            ease: "power2.in",
        }, 1.2).to(logoRef.current, {
            y: 10,
            yoyo: true,
            duration: 1,
            ease: "ease",
            repeat: -1,
        });
    }, []);

    // Magnetic tilt on logo (cursor-follow)
    useEffect(() => {
        const logoEl = logoRef.current;
        if (!logoEl) return;

        const handleMouseMove = (e) => {
            const rect = logoEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = (e.clientX - centerX) / rect.width;
            const deltaY = (e.clientY - centerY) / rect.height;

            gsap.to(logoEl, {
                rotateY: deltaX * 20,
                rotateX: -deltaY * 20,
                transformPerspective: 800,
                duration: 0.4,
                ease: "power2.out",
            });
        };

        const handleMouseLeave = () => {
            gsap.to(logoEl, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <>
            <div ref={containerRef} className={styles.container}>
                <div className={styles.grid}></div>
                <div style={{ backgroundImage: `url(${bg3})` }} ref={textureRef} className={styles.texture}></div>

                <img className={styles.dvm_text} src={dvm_text} ref={dvm_textRef} alt="dvm_text" />
                <div ref={lineRef} className={styles.line}></div>
                <div ref={line1Ref} className={styles.line1}></div>
                <div ref={logoRef} className={styles.image_container}>
                    <img className={styles.logoGlow} src={logo} ref={logoGlowRef} alt="" aria-hidden="true" />
                    <img className={styles.logo} src={logo} alt="logo" />
                </div>
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
            </div>
        </>
    );
};

export default HomePage;