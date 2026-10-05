import { useRouter, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { STOPS, firstStop } from "./stops";
import "./tour.css";

const seenKey = "soi-tour";

// Storage throws when the browser blocks it; treat that as seen so the invite never nags.
function seen() {
  try {
    return localStorage.getItem(seenKey) === "seen";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(seenKey, "seen");
  } catch {}
}

const StartTour = createContext<() => void>(() => {});

export function TourButton() {
  const start = useContext(StartTour);
  return (
    <button type="button" className="tour-button" onClick={start}>
      Take the tour
    </button>
  );
}

export function Tour({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [step, setStep] = useState<number | "invite" | null>(() => (seen() ? null : "invite"));
  const ring = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  const go = (index: number) => {
    markSeen();
    const stop = STOPS[index];
    if (!stop.shows(pathname)) void router.navigate({ href: stop.path });
    setStep(index);
  };
  const end = () => {
    markSeen();
    setStep(null);
  };

  useEffect(() => {
    if (typeof step === "number") title.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (typeof step !== "number") return;
    const stop = STOPS[step];
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scrolled = false;
    let frame = 0;
    const track = () => {
      const target = stop.shows(pathname)
        ? document.querySelector(`[data-tour="${stop.target}"]`)
        : null;
      const box = ring.current;
      if (box) box.hidden = !target;
      if (box && target) {
        if (!scrolled) {
          scrolled = true;
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - 88,
            behavior: smooth ? "smooth" : "auto",
          });
        }
        const rect = target.getBoundingClientRect();
        const left = Math.max(4, rect.left - 8);
        const right = Math.min(window.innerWidth - 4, rect.right + 8);
        box.style.transform = `translate(${left}px, ${rect.top - 8}px)`;
        box.style.width = `${right - left}px`;
        box.style.height = `${rect.height + 16}px`;
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") end();
    };
    window.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", escape);
    };
  }, [step, pathname]);

  return (
    <StartTour.Provider value={() => go(firstStop(pathname))}>
      {children}
      {step === "invite" && (
        <section className="tour-card" aria-labelledby="tour-title">
          <p className="tour-count">New here?</p>
          <h2 id="tour-title">Take a two-minute tour</h2>
          <p>
            Six stops on real companies: the five questions, the shortlist, one company’s evidence,
            its track record, the screener and who owns what.
          </p>
          <div className="tour-actions">
            <button type="button" className="more" onClick={end}>
              Not now
            </button>
            <button type="button" className="go" onClick={() => go(firstStop(pathname))}>
              Start the tour
            </button>
          </div>
        </section>
      )}
      {typeof step === "number" && (
        <>
          <div className="tour-ring" ref={ring} hidden data-step={step + 1} aria-hidden="true" />
          <StopCard
            key={step}
            index={step}
            here={STOPS[step].shows(pathname)}
            go={go}
            end={end}
            titleRef={title}
          />
        </>
      )}
    </StartTour.Provider>
  );
}

function StopCard({
  index,
  here,
  go,
  end,
  titleRef,
}: {
  index: number;
  here: boolean;
  go: (index: number) => void;
  end: () => void;
  titleRef: RefObject<HTMLHeadingElement | null>;
}) {
  const stop = STOPS[index];
  const next = STOPS[index + 1];
  return (
    <section className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title">
      <div className="tour-top">
        <p className="tour-count">
          Tour · {index + 1} of {STOPS.length}
        </p>
        <button type="button" className="tour-close" onClick={end} aria-label="End the tour">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" />
          </svg>
        </button>
      </div>
      <h2 id="tour-title" ref={titleRef} tabIndex={-1}>
        {stop.title}
      </h2>
      <p>{stop.body}</p>
      <ol className="tour-progress" aria-hidden="true">
        {STOPS.map((item, at) => (
          <li key={item.target} className={at <= index ? "done" : undefined} />
        ))}
      </ol>
      <div className="tour-actions">
        {index > 0 && (
          <button type="button" className="more" onClick={() => go(index - 1)}>
            Back
          </button>
        )}
        {!here ? (
          <button type="button" className="go" onClick={() => go(index)}>
            Back to the tour
          </button>
        ) : next ? (
          <button type="button" className="go" onClick={() => go(index + 1)}>
            Next: {next.place}
          </button>
        ) : (
          <button type="button" className="go" onClick={end}>
            Finish
          </button>
        )}
      </div>
    </section>
  );
}
