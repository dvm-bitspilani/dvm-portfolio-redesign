// V7 · Signal Board — full site under /v/v7/*.
// One board, many arrangements: every route (home, about, projects, projects/:name, legacy, team,
// blog, artwork, archive, contactus) is the same set of twelve live tiles laid out differently.
// The Board owns the URL → layout mapping so tiles never remount between routes (the mercury
// mark keeps its WebGL context; the clock, ticker and team pulse keep running).
import { Route, Routes } from "react-router-dom";
import "@fontsource-variable/jetbrains-mono";
import "./board/v7.module.css";
import "./board/vt.css";
import Board from "./board/Board";

export default function V7() {
  return (
    <Routes>
      <Route path="*" element={<Board />} />
    </Routes>
  );
}
