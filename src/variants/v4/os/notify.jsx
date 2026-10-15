// Notifications: transient toasts (top right, under the menu bar / phone status bar) plus
// a history shown in the notification centre. Toasts pause while hovered.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { AppIcon } from "./icons";
import { fmtTime } from "../lib/hooks";
import s from "./notify.module.css";

const NotifyContext = createContext(null);
export const useNotify = () => useContext(NotifyContext);

let nid = 0;

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [unread, setUnread] = useState(0);

  const dismiss = useCallback((id) => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), []);
  const drop = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /** notify({ title, body, app, cover, action: { label, run }, ttl }) */
  const notify = useCallback((n) => {
    const item = { id: ++nid, at: new Date(), ttl: 5200, ...n };
    setToasts((t) => [...t.slice(-2), item]);
    if (!n.transient) {
      setHistory((h) => [item, ...h].slice(0, 30));
      setUnread((u) => u + 1);
    }
    return item.id;
  }, []);

  const value = useMemo(
    () => ({ notify, dismiss, drop, toasts, history, unread, markRead: () => setUnread(0), clear: () => setHistory([]) }),
    [notify, dismiss, drop, toasts, history, unread],
  );
  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>;
}

function Toast({ t, onDismiss, onDrop, phone }) {
  const timer = useRef(0);
  const left = useRef(t.ttl);
  const started = useRef(0);
  const pause = () => {
    clearTimeout(timer.current);
    left.current -= performance.now() - started.current;
  };
  const resume = useCallback(() => {
    started.current = performance.now();
    timer.current = setTimeout(() => onDismiss(t.id), Math.max(800, left.current));
  }, [onDismiss, t.id]);
  useEffect(() => {
    if (t.leaving) return;
    resume();
    return () => clearTimeout(timer.current);
  }, [resume, t.leaving]);
  return (
    <div
      className={`${s.toast} ${phone ? s.phone : ""} ${t.leaving ? s.leaving : ""}`}
      role="status"
      onPointerEnter={pause}
      onPointerLeave={resume}
      onAnimationEnd={(e) => e.target === e.currentTarget && t.leaving && onDrop(t.id)}
    >
      <div className={s.head}>
        {t.app ? <AppIcon app={t.app} cover={t.cover} size={22} /> : <Bell size={16} />}
        <span className={s.app}>{t.source ?? "DVM OS"}</span>
        <span className={s.time}>{fmtTime(t.at)}</span>
        <button className={s.x} onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
          <X size={13} />
        </button>
      </div>
      <p className={s.title}>{t.title}</p>
      {t.body && <p className={s.body}>{t.body}</p>}
      {t.action && (
        <button
          className={s.action}
          onClick={() => {
            t.action.run();
            onDismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}

export function Toasts({ phone = false }) {
  const { toasts, dismiss, drop } = useNotify();
  return (
    <div className={`${s.stack} ${phone ? s.stackPhone : ""}`} aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} t={t} onDismiss={dismiss} onDrop={drop} phone={phone} />
      ))}
    </div>
  );
}

/** The list used by the desktop notification centre and the phone's pull-down. */
export function NotificationList({ onRun }) {
  const { history, clear } = useNotify();
  if (!history.length) return <p className={s.empty}>You're all caught up. New notifications appear here.</p>;
  return (
    <>
      <div className={s.listHead}>
        <span>Notifications</span>
        <button onClick={clear}>Clear all</button>
      </div>
      <ul className={s.list}>
        {history.map((n) => (
          <li key={n.id}>
            <button
              className={s.item}
              disabled={!n.action}
              onClick={() => {
                n.action?.run();
                onRun?.();
              }}
            >
              {n.app ? <AppIcon app={n.app} cover={n.cover} size={30} /> : <Bell size={18} />}
              <span className={s.itemText}>
                <span className={s.itemTitle}>{n.title}</span>
                {n.body && <span className={s.itemBody}>{n.body}</span>}
              </span>
              <span className={s.time}>{fmtTime(n.at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
