import styles from "./Navbar.module.css"
import ham from "../assests/ham.png"
const Navbar = () => {

    return (
        <>
            <div className={styles.container}>

                <div className={styles.heading}>DVM</div>

                <div className={styles.ham}>
                    <img src={ham} alt="ham" />
                </div>


            </div>
        </>
    );
};

export default Navbar;