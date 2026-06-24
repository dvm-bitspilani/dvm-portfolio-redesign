import { useEffect, useRef, useState } from "react";
import artwork_png from "../assests/artwork.png";
import styles from "./ArtWork.module.css";
import lines from "../assests/lines.png";
import line1 from "../assests/line1.png";
import line2 from "../assests/line2.png";
import line3 from "../assests/line3.png";
import line4 from "../assests/line4.png";

const ArtWork = () => {
    const artworkRef = useRef(null);
    const [calcHeight, setCalcHeight] = useState("100vh");

    useEffect(() => {
        const img = artworkRef.current;

        const updateHeight = () => {
            if (!img) return;

            const imageHeight = img.getBoundingClientRect().height;
            setCalcHeight(`${imageHeight + window.innerHeight}px`);
        };

        if (img?.complete) {
            updateHeight();
        } else {
            img?.addEventListener("load", updateHeight);
        }

        window.addEventListener("resize", updateHeight);

        return () => {
            img?.removeEventListener("load", updateHeight);
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    return (
        <>
            <div
                className={styles.container}
                style={{ height: calcHeight }}
            >
                <img
                    ref={artworkRef}
                    className={styles.image}
                    src={artwork_png}
                    alt="Artwork"
                />

                <div className={styles.lines}>
                    <img src={lines} alt="lines" />
                </div>

                <div>
                    <img src={line1} alt="line1" className={styles.line1} />
                    <img src={line2} alt="line2" className={styles.line2} />
                    <img src={line3} alt="line3" className={styles.line3} />
                    <img src={line4} alt="line4" className={styles.line4} />
                </div>
            </div>
        </>
    );
};

export default ArtWork; 