import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  const imageSize = Math.max(24, iconSize); // Ensure a minimum size for very small iconSize props

  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 group", className)}>
      <div style={{ width: imageSize, height: imageSize }} className="relative">
        <Image 
          src="/logo.png" 
          alt="Black HAT Commit Logo" 
          fill
          sizes={`${imageSize}px`}
          style={{ objectFit: 'contain' }}
          className="transition-all duration-300"
        />
      </div>
      <h1 className={cn(
        "font-bold text-glow-primary group-hover:text-primary transition-all duration-300",
        textSize
        )}>
        Black<span className="text-foreground group-hover:text-glow-accent">HAT</span>Commit
      </h1>
    </Link>
  );
}
