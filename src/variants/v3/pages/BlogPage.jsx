import BlogPageBase from "../../../components/blogs/Blog_Page";
import { useV3Menu } from "../shell/V3Nav";

/** The redesign's blog page; its own hamburger opens the v3 menu. */
export default function BlogPage() {
  const [menu, open] = useV3Menu();
  return (
    <>
      <BlogPageBase onHamClick={open} />
      {menu}
    </>
  );
}
