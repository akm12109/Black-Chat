import Link from 'next/link';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 group", className)}>
      <Terminal size={iconSize} className="text-primary group-hover:text-glow-primary transition-all duration-300" />
      <h1 className={cn(
        "font-bold text-glow-primary group-hover:text-primary transition-all duration-300",
        textSize
        )}>
        Black<span className="text-foreground group-hover:text-glow-accent">HAT</span>Commit
      </h1>
    </Link>
  );
}
