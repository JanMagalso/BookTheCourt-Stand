"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type AccordionType = "single" | "multiple";

type AccordionContextValue = {
  type: AccordionType;
  collapsible: boolean;
  openValues: string[];
  toggleValue: (value: string) => void;
};

type AccordionItemContextValue = {
  value: string;
  isOpen: boolean;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null,
);

export function Accordion({
  children,
  className = "",
  type = "single",
  collapsible = false,
}: {
  children: ReactNode;
  className?: string;
  type?: AccordionType;
  collapsible?: boolean;
}) {
  const [openValues, setOpenValues] = useState<string[]>([]);

  const value = useMemo<AccordionContextValue>(
    () => ({
      type,
      collapsible,
      openValues,
      toggleValue: (nextValue) => {
        setOpenValues((current) => {
          const isOpen = current.includes(nextValue);

          if (type === "single") {
            if (isOpen) {
              return collapsible ? [] : current;
            }

            return [nextValue];
          }

          if (isOpen) {
            return current.filter((value) => value !== nextValue);
          }

          return [...current, nextValue];
        });
      },
    }),
    [collapsible, openValues, type],
  );

  return (
    <AccordionContext.Provider value={value}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  children,
  className = "",
  value,
}: {
  children: ReactNode;
  className?: string;
  value: string;
}) {
  const accordion = useAccordionContext();
  const itemValue = useMemo<AccordionItemContextValue>(
    () => ({
      value,
      isOpen: accordion.openValues.includes(value),
    }),
    [accordion.openValues, value],
  );

  return (
    <AccordionItemContext.Provider value={itemValue}>
      <div
        data-state={itemValue.isOpen ? "open" : "closed"}
        className={className}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const accordion = useAccordionContext();
  const item = useAccordionItemContext();

  return (
    <button
      type="button"
      aria-expanded={item.isOpen}
      onClick={() => accordion.toggleValue(item.value)}
      className={`flex w-full items-center justify-between gap-4 text-left ${className}`.trim()}
      {...props}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-light)] bg-[color:var(--color-surface)] text-lg text-slate-500 transition-transform duration-200 ${item.isOpen ? "rotate-45" : ""}`.trim()}
      >
        +
      </span>
    </button>
  );
}

export function AccordionContent({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const item = useAccordionItemContext();

  return (
    <div
      hidden={!item.isOpen}
      className={`overflow-hidden ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

function useAccordionContext() {
  const context = useContext(AccordionContext);

  if (!context) {
    throw new Error("Accordion components must be used inside Accordion.");
  }

  return context;
}

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);

  if (!context) {
    throw new Error(
      "AccordionTrigger and AccordionContent must be used inside AccordionItem.",
    );
  }

  return context;
}
