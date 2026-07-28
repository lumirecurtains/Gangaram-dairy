"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { Loader2, Sparkles, Plus, Trash2, Edit2, Power, ArrowLeft, Tag } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import Link from "next/link";

interface FeaturedSectionData {
  id: string;
  name: string;
  sectionType: string;
  itemIds: string[];
  isActive: boolean;
  priority: number;
}

interface MenuItemShort {
  id: string;
  name: string;
}

export default function FeaturedSectionsPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [sections, setSections] = useState<FeaturedSectionData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemShort[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sectionType, setSectionType] = useState("best_seller");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);

  const loadData = useCallback(async () => {
    if (!user || !merchantId) return;
    try {
      const token = await user.getIdToken();
      
      const [secRes, menuRes] = await Promise.all([
        fetch(`/api/v1/hotel/marketing/featured?merchantId=${merchantId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/v1/hotel/menu?merchantId=${merchantId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const secData = await secRes.json();
      const menuData = await menuRes.json();
      
      if (!secRes.ok) throw new Error(secData.error);
      if (!menuRes.ok) throw new Error(menuData.error);

      setSections(secData.featuredSections || []);
      setMenuItems(menuData.items.map((i: any) => ({ id: i.id, name: i.name })) || []);

    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSectionType("best_seller");
    setSelectedItems([]);
    setIsActive(true);
    setPriority(0);
  };

  const handleEdit = (section: FeaturedSectionData) => {
    setEditingId(section.id);
    setName(section.name);
    setSectionType(section.sectionType);
    setSelectedItems([...section.itemIds]);
    setIsActive(section.isActive);
    setPriority(section.priority || 0);
    setIsModalOpen(true);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return showToast("Section name is required", "error");
    if (selectedItems.length === 0) return showToast("Select at least one product", "error");

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = {
        name,
        sectionType,
        itemIds: selectedItems,
        isActive,
        priority: Number(priority),
      };

      const res = await fetch("/api/v1/hotel/marketing/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          merchantId,
          sectionId: editingId,
          section: payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Featured Section ${editingId ? "updated" : "created"} successfully`, "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this featured section?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/marketing/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", merchantId, sectionId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      showToast("Featured section deleted", "success");
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/v1/hotel/marketing/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggle_status", merchantId, sectionId: id, section: { isActive: !currentStatus } }),
      });
      loadData();
    } catch (err: any) {
      showToast("Failed to toggle status", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <Link href="/hotel/marketing" className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-4 h-4" /> Back to Marketing Center
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Featured Sections
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Highlight top-selling items, chef's specials, or new arrivals above your main menu.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
            <Sparkles className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-2">No featured sections configured</p>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            Group your best menu items together and display them prominently to drive more orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.id} className={`rounded-2xl border flex flex-col p-5 ${section.isActive ? "" : "opacity-75 grayscale-[30%]"}`} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{section.name}</h3>
                  <p className="text-xs font-semibold uppercase mt-1" style={{ color: "var(--primary)" }}>{section.sectionType.replace("_", " ")}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${section.isActive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                  {section.isActive ? "ACTIVE" : "DISABLED"}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
                <Tag className="w-4 h-4" /> {section.itemIds.length} Linked Products
              </div>

              <div className="flex justify-between items-center mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-bold bg-black/5 px-2 py-1 rounded-md text-gray-500">
                  Priority: {section.priority}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleStatus(section.id, section.isActive)} className="p-2 rounded-lg transition-colors hover:bg-gray-100" title={section.isActive ? "Disable" : "Enable"}>
                    <Power className={`w-4 h-4 ${section.isActive ? "text-green-500" : "text-gray-400"}`} />
                  </button>
                  <button onClick={() => handleEdit(section)} className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(section.id)} className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Featured Section" : "Create Featured Section"}>
          <form onSubmit={handleSave} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Section Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Today's Special" className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Section Type *</label>
                <select value={sectionType} onChange={e => setSectionType(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)] bg-transparent" style={{ borderColor: "var(--border)" }}>
                  <option value="best_seller">Best Seller</option>
                  <option value="trending">Trending</option>
                  <option value="todays_special">Today's Special</option>
                  <option value="chefs_recommendation">Chef's Recommendation</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">Select Products * ({selectedItems.length} selected)</label>
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                {menuItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={selectedItems.includes(item.id)} 
                      onChange={() => toggleItemSelection(item.id)} 
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </label>
                ))}
                {menuItems.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>No products found in menu. Add products to the menu first.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Display Priority</label>
                <input type="number" min="0" value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>Higher numbers show first.</p>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-semibold">Section is Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="flex-1 py-3 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-all" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || selectedItems.length === 0} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center" style={{ background: "var(--primary)" }}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Section"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
