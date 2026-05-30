"use client";

import { useRouter } from "@/i18n/navigation";
import type { ComponentProps } from "react";
import { Button } from "./button";

type NavButtonProps = ComponentProps<typeof Button> & {
  href: string;
};

export function NavButton({ href, onClick, ...props }: NavButtonProps) {
  const router = useRouter();

  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          router.push(href);
        }
      }}
    />
  );
}
