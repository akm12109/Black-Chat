import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageWrapperProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  titleIcon?: ReactNode;
}

export function PageWrapper({ title, description, children, className, titleIcon }: PageWrapperProps) {
  return (
    <div className={cn("container mx-auto px-0 py-0", className)}>
      {(title || description) && (
        <header className="mb-8">
          {title && (
            <h1 className="text-3xl font-bold text-glow-primary flex items-center gap-2">
              {titleIcon && <span className="text-primary icon-glow-primary">{titleIcon}</span>}
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
