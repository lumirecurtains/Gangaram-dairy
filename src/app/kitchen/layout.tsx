import { MerchantProvider } from "@/lib/contexts/MerchantContext";

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Wrap the kitchen module in the MerchantProvider to securely scope
    // API calls to the logged-in staff member's assigned restaurant.
    <MerchantProvider>
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {/* We do NOT include the consumer BottomNav or Cart here */}
        {/* We can include a simple, specialized Kitchen header */}
        <header className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <h1 className="text-xl font-bold" style={{ color: "var(--primary)" }}>Gangaram Kitchen</h1>
          {/* Module 8: Add user profile / logout button here */}
        </header>
        
        <main className="flex-1 p-4 md:p-6 overflow-hidden">
          {children}
        </main>
      </div>
    </MerchantProvider>
  );
}
