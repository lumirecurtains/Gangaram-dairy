import { useCart } from "@/lib/contexts";
import { CartDrawer } from "./CartDrawer";

export function GlobalCartDrawer() {
  const { cartDrawerOpen, closeCartDrawer } = useCart();
  return <CartDrawer isOpen={cartDrawerOpen} onClose={closeCartDrawer} />;
}
