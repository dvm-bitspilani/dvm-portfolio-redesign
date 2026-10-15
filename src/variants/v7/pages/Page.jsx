// The inside of an expanded tile: the tile's head strip, then a scrolling page whose title takes
// focus when the tile opens.
import Head from "../tiles/Head";
import p from "./pages.module.css";

export default function Page({ id, label, title, readout, scrollRef, className = "", children, titleHidden = false }) {
  return (
    <>
      <Head id={id} label={label} led="live">
        {readout}
      </Head>
      <div ref={scrollRef} className={`${p.page} ${className}`}>
        <h1 className={titleHidden ? p.srOnly : p.title} tabIndex={-1} data-v7-focus="">
          {title}
        </h1>
        {children}
      </div>
    </>
  );
}
