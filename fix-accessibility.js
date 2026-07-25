const fs = require('fs');

let modal = fs.readFileSync('src/lib/components/common/Modal.tsx', 'utf8');

const modalImport = `import { useEffect, type ReactNode, useRef } from "react";\nimport { X } from "lucide-react";`;
modal = modal.replace(/import { useEffect, type ReactNode } from "react";\nimport { X } from "lucide-react";/, modalImport);

const modalLogic = `  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => { 
        document.body.style.overflow = ""; 
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);`;

modal = modal.replace(/  useEffect\(\(\) => \{[\s\S]*?  \}, \[isOpen\]\);/, modalLogic);
modal = modal.replace(/<div\n        className="relative w-full max-w-md rounded-2xl p-6 animate-bounce-in"/, 
  `<div\n        ref={modalRef}\n        role="dialog"\n        aria-modal="true"\n        className="relative w-full max-w-md rounded-2xl p-6 animate-bounce-in"`);

fs.writeFileSync('src/lib/components/common/Modal.tsx', modal);


let drawer = fs.readFileSync('src/lib/components/cart/CartDrawer.tsx', 'utf8');

const drawerImport = `import { useEffect, useRef } from "react";
import { useCart } from "@/lib/contexts";`;
drawer = drawer.replace(/import { useCart } from "@\/lib\/contexts";/, drawerImport);

const drawerLogic = `export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, merchantName, subTotal, clearCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => { 
        document.body.style.overflow = ""; 
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;`;

drawer = drawer.replace(/export function CartDrawer\(\{ isOpen, onClose \}: CartDrawerProps\) \{[\s\S]*?if \(!isOpen\) return null;/, drawerLogic);

drawer = drawer.replace(/<div\n        className="relative w-full max-w-sm h-full overflow-y-auto animate-slide-in"/,
  `<div\n        ref={drawerRef}\n        role="dialog"\n        aria-modal="true"\n        aria-label="Shopping Cart"\n        className="relative w-full max-w-sm h-full overflow-y-auto animate-slide-in"`);

fs.writeFileSync('src/lib/components/cart/CartDrawer.tsx', drawer);
