
import "./Tabs.css";

export default function Tabs({ categories, active, onChange }) {
  return (
    <nav className="filter-tabs">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          className={
            "filter-tabs__tab" + (cat === active ? " filter-tabs__tab--active" : "")
          }
          onClick={() => onChange(cat)}
          aria-pressed={cat === active}
        >
          {cat}
        </button>
      ))}
    </nav>
  );
}