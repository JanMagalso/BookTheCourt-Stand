"use client";

import {
  createContext,
  useEffect,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DrawerContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function Drawer({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function DrawerTrigger({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDrawerContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DrawerContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDrawerContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-[rgba(15,23,42,0.52)] backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[640px] px-2 sm:px-4">
        <div
          className={`max-h-[84vh] overflow-hidden rounded-t-[2rem] border border-[#dbe8e1] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)] ${className}`.trim()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DrawerHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 pb-3 pt-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function DrawerTitle({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-xl font-semibold tracking-[-0.03em] text-[#10233b] ${className}`.trim()}
      {...props}
    >
      {children}
    </h3>
  );
}

export function DrawerDescription({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm leading-6 text-slate-600 ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

export function DrawerClose({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDrawerContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

function useDrawerContext() {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error("Drawer components must be used inside Drawer.");
  }

  return context;
}
