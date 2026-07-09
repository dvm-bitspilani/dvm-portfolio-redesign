import { useRef, useState, useEffect } from "react";
import styles from "./Legacy.module.css";
import header from "../assests/Legacy/header.svg";
import header_fill from "../assests/Legacy/header_fill.svg";
import arrow from "../assests/Legacy/arrow.png";
import LegacyCircle from "./LegacyCircle";
import google from "../assests/Legacy/google.png";
import microsoft from "../assests/Legacy/microsoft.png";
import meta from "../assests/Legacy/meta.png";
import imc from "../assests/Legacy/imc.png";

const Legacy = () => {
    const wrapperRef = useRef(null);
    const googleRef = useRef(null);
    const microsoftRef = useRef(null);
    const metaRef = useRef(null);
    const imcRef = useRef(null);
    const img1Ref = useRef(null);
    const img2Ref = useRef(null);
    const img3Ref = useRef(null);

    const [centers, setCenters] = useState(null);
    const [hoveredKey, setHoveredKey] = useState(null);

    // Returns the center x/y of `el`, relative to `wrapperRef.current`
    const getCenter = (el) => {
        if (!el || !wrapperRef.current) return null;

        const rect = el.getBoundingClientRect();
        const wrapperRect = wrapperRef.current.getBoundingClientRect();

        return {
            x: rect.left + rect.width / 2 - wrapperRect.left,
            y: rect.top + rect.height / 2 - wrapperRect.top,
        };
    };

    useEffect(() => {
        const calculate = () => {
            setCenters({
                google: getCenter(googleRef.current),
                microsoft: getCenter(microsoftRef.current),
                meta: getCenter(metaRef.current),
                imc: getCenter(imcRef.current),
                img1: getCenter(img1Ref.current),
                img2: getCenter(img2Ref.current),
                img3: getCenter(img3Ref.current),
            });
        };

        calculate();
        window.addEventListener("resize", calculate);
        return () => window.removeEventListener("resize", calculate);
    }, []);

    // All connecting pairs between circles (by key, resolved to coords at render time)
    const pairs = centers
        ? [
              ["google", "microsoft"],
              ["google", "meta"],
              ["google", "imc"],
              ["microsoft", "meta"],
              ["microsoft", "img3"],
              ["meta", "imc"],
              ["imc", "img2"],
              ["imc", "img3"],
              ["imc", "img1"],
              ["img2", "img1"],
              ["google", "img2"],
              ["microsoft", "imc"],
              ["img1", "img3"],
              ["img2", "img3"],
          ]
        : [];

    const circleList = [
        { key: "google", ref: googleRef, className: styles.google, img: google },
        { key: "microsoft", ref: microsoftRef, className: styles.microsoft, img: microsoft },
        { key: "meta", ref: metaRef, className: styles.meta, img: meta },
        { key: "imc", ref: imcRef, className: styles.imc, img: imc },
        { key: "img1", ref: img1Ref, className: styles.img1, img: imc },
        { key: "img2", ref: img2Ref, className: styles.img2, img: google },
        { key: "img3", ref: img3Ref, className: styles.img3, img: meta },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <img src={header} alt="Header" className={styles.headerOuterImage} />
                <img src={header_fill} alt="Header" className={styles.headerImage} />
            </div>

            <div className={styles.circleWrapper} ref={wrapperRef}>
                <svg
                    className={styles.lineSvg}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4facfe" />
                            <stop offset="100%" stopColor="#00c6ff" />
                        </linearGradient>
                    </defs>

                    {pairs.map(([fromKey, toKey], i) => {
                        let from = centers[fromKey];
                        let to = centers[toKey];
                        const isHighlighted =
                            hoveredKey && (hoveredKey === fromKey || hoveredKey === toKey);
                        const isDimmed = hoveredKey && !isHighlighted;

                        if (!from || !to) return null;

                        // Ensure the line always starts (grows) FROM the hovered circle,
                        // regardless of the pair's original order in the array.
                        if (isHighlighted && hoveredKey === toKey) {
                            const temp = from;
                            from = to;
                            to = temp;
                        }

                        return (
                            <g key={i}>
                                <line
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    className={`${styles.baseLine} ${isDimmed ? styles.dimmed : ""}`}
                                />

                                <line
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    pathLength="1"
                                    className={`${styles.overlayLine} ${isHighlighted ? styles.active : ""}`}
                                />
                            </g>
                        );
                    })}
                </svg>

                {circleList.map(({ key, ref, className, img }) => {
                    const isDimmedCircle = hoveredKey && hoveredKey !== key;
                    return (
                        <div
                            key={key}
                            ref={ref}
                            className={`${className} ${styles.circleBase} ${
                                isDimmedCircle ? styles.circleDimmed : ""
                            }`}
                            onMouseEnter={() => setHoveredKey(key)}
                            onMouseLeave={() => setHoveredKey(null)}
                        >
                            <LegacyCircle img={img} />
                        </div>
                    );
                })}
            </div>

            <div className={styles.footer}>
                <div className={styles.footerContent}>
                    <h2>DEPARTMENT OF</h2>
                    <h1 className={styles.vm}>VISUAL MEDIA</h1>
                </div>
                <div className={styles.footerActions}>
                    <button className={styles.footerButton}>ARTWORKS</button>
                    <img className={styles.arrow} src={arrow} alt="Arrow" />
                </div>
            </div>
        </div>
    );
};

export default Legacy;