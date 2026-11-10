// The room (direction §2): one floor, one grid, one pool of light, defined once for the whole
// variant. Two fixed layers at z 0 under everything the routes render (`.pages` is z 1); the
// pool (a pure gradient: no texture behind text) is moved by chrome/lightControl.js. No section
// draws its own backdrop.
import { useLayoutEffect, useRef } from "react";
import { useLight } from "./lightControl";
import s from "./room.module.css";

export default function Room() {
  const light = useLight();
  const ref = useRef(null);
  useLayoutEffect(() => {
    light?.attach(ref.current);
    return () => light?.attach(null);
  }, [light]);
  return (
    <>
      <div className={s.grid} aria-hidden="true" />
      <div ref={ref} className={s.light} aria-hidden="true" />
    </>
  );
}
