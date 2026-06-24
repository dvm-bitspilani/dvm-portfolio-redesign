import dvm_text from "../assests/image.png"
import styles from "./HomePage.module.css"
import logo from "../assests/logo.png"
import lines from "../assests/lines.png"
import gradient from "../assests/gradient.png"
const HomePage = () => {

    return (
        <>
            <div className={styles.container}>

                <div className={styles.lines}>
                    <img src={lines} alt="lines" />
                </div>
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
                <div className={styles.about}>ABOUT US</div>


            </div >
            <div className={styles.tp}>


            </div>
        </>
    );
};

export default HomePage;