import { useEffect, useRef, useState } from "react";

export default function Loader() {
  const loaderContainerRef = useRef(null);
  const pentagonRef = useRef(null);

  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loaderDestroying = useRef(false);
  const destroyerTriggerTime = useRef(null);

  // Load Font
  useEffect(() => {
    const font = new FontFaceObserver("Jaapokki subtract");

    font.load().then(() => {
      document.documentElement.classList.add("fonts-loaded");
      setFontsLoaded(true);
    });
  }, []);

  // Call this when all images are loaded
  const allImagesLoaded = () => {
    console.log("ALL IMAGES LOADED");

    const loaderContainer = loaderContainerRef.current;
    const pentagon = pentagonRef.current;

    if (!loaderContainer || !pentagon) return;

    const handleAnimationEnd = () => {
      if (
        destroyerTriggerTime.current !== null &&
        loaderDestroying.current
      ) {
        loaderContainer.style.display = "none";
      }
    };

    const handleAnimationIteration = () => {
      if (!loaderDestroying.current) {
        destroyerTriggerTime.current = Math.round(Date.now() / 1000);
        console.log(destroyerTriggerTime.current);

        loaderDestroying.current = true;
        loaderContainer.style.animation = "2s loader-disappear forwards";
        pentagon.style.animation = "none";
      }
    };

    loaderContainer.addEventListener("animationend", handleAnimationEnd);
    loaderContainer.addEventListener(
      "animationiteration",
      handleAnimationIteration
    );

    return () => {
      loaderContainer.removeEventListener(
        "animationend",
        handleAnimationEnd
      );
      loaderContainer.removeEventListener(
        "animationiteration",
        handleAnimationIteration
      );
    };
  };

  // Example: simulate all images loaded
  useEffect(() => {
    if (fontsLoaded) {
      allImagesLoaded();
    }
  }, [fontsLoaded]);

  return (
    <div className="loaderContainer" ref={loaderContainerRef}>
      <div className="loader">
        <div className="pentagon" ref={pentagonRef}></div>
      </div>
    </div>
  );
}