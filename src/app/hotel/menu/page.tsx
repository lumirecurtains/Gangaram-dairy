"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import { Skeleton } from "@/lib/components/common/Skeleton";
import { Loader2, MenuSquare, Plus, Edit2, Trash2, Tag, ArrowRight, IndianRupee, Image as ImageIcon } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  ourPrice: number;
  baseCost: number;
  hotelProfit: number;
  isAvailable: boolean;
  aggregatorPrice: number | null;
  category: string;
  imageUrl: string;
  veg: boolean;
  sortOrder: number;
}

export default function MenuEditorPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.category))];
    return cats.sort();
  }, [items]);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0]);
    } else if (categories.length === 0) {
      setActiveCategory(null);
    }
  }, [categories, activeCategory]);

  const loadMenu = async () => {
    if (!user || !merchantId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/hotel/menu?merchantId=${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setItems(data.items || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, merchantId]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.category) return showToast("Name and Category required", "error");

    setSaving(true);
    try {
      const token = await user?.getIdToken();
      
      // Compute hotelProfit if missing
      const baseCost = Number(editingItem.baseCost || 0);
      const ourPrice = Number(editingItem.ourPrice || 0);
      const hotelProfit = ourPrice - baseCost;

      const payload = {
        ...editingItem,
        ourPrice,
        baseCost,
        hotelProfit,
        aggregatorPrice: editingItem.aggregatorPrice ? Number(editingItem.aggregatorPrice) : null,
        sortOrder: Number(editingItem.sortOrder || 0),
        isAvailable: editingItem.isAvailable ?? true,
        veg: editingItem.veg ?? true,
        description: editingItem.description || "",
        imageUrl: editingItem.imageUrl || "",
      };

      const res = await fetch("/api/v1/hotel/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: editingItem.id ? "update_item" : "create_item",
          merchantId,
          itemId: editingItem.id,
          item: payload
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Item ${editingItem.id ? "updated" : "created"} successfully`, "success");
      setItemModalOpen(false);
      loadMenu();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete_item", merchantId, itemId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      showToast("Item deleted", "success");
      loadMenu();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.newName.trim()) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "rename_category",
          merchantId,
          oldName: editingCategory.oldName,
          newName: editingCategory.newName.trim()
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      showToast("Category renamed", "success");
      setActiveCategory(editingCategory.newName.trim());
      setCategoryModalOpen(false);
      loadMenu();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${catName}" and ALL its items?`)) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete_category", merchantId, categoryName: catName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      showToast("Category and items deleted", "success");
      loadMenu();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleAvailability = async (itemId: string, current: boolean) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/v1/hotel/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "update_item", merchantId, itemId, item: { isAvailable: !current } }),
      });
      loadMenu();
    } catch (err: any) {
      showToast("Failed to toggle availability", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  const activeItems = items.filter(i => i.category === activeCategory).sort((a,b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MenuSquare className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Menu Editor
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage categories, items, pricing, and availability.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem({ category: activeCategory || "", isAvailable: true, veg: true });
            setItemModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Add New Item
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          <h3 className="font-bold mb-3 flex items-center justify-between">
            <span>Categories</span>
          </h3>
          
          {categories.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>No categories yet. Add an item to create one.</p>
          ) : (
            <div className="flex overflow-x-auto lg:flex-col gap-2 pb-2 lg:pb-0 scrollbar-none">
              {categories.map(cat => (
                <div key={cat} className="flex group relative">
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap lg:whitespace-normal border ${
                      activeCategory === cat ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text)] hover:bg-[var(--bg)]"
                    }`}
                    style={{ background: activeCategory === cat ? "var(--primary-light)" : "var(--surface)" }}
                  >
                    {cat}
                    {activeCategory === cat && <ArrowRight className="w-4 h-4 hidden lg:block" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1">
          {activeCategory && (
            <div className="mb-4 flex items-center justify-between bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-[var(--accent)]" /> {activeCategory}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCategory({ oldName: activeCategory, newName: activeCategory }); setCategoryModalOpen(true); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteCategory(activeCategory)} className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeItems.length === 0 ? (
            <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <MenuSquare className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
              <p className="font-medium text-lg">No items in this category</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Click "Add New Item" to create one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map(item => (
                <div key={item.id} className="flex gap-4 p-4 rounded-xl border transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)", opacity: item.isAvailable ? 1 : 0.6 }}>
                  <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center overflow-hidden relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 opacity-30" />
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">
                        OUT
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm border flex items-center justify-center" style={{ borderColor: item.veg ? "var(--accent)" : "var(--error)" }}>
                          <span className="w-1.5 h-1.5 rounded-sm" style={{ background: item.veg ? "var(--accent)" : "var(--error)" }} />
                        </span>
                        <h4 className="font-bold truncate">{item.name}</h4>
                      </div>
                      <span className="font-bold flex items-center"><IndianRupee className="w-3 h-3"/>{item.ourPrice}</span>
                    </div>
                    
                    <p className="text-xs line-clamp-1 mb-2" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${item.isAvailable ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700' : 'bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700'}`}
                      >
                        {item.isAvailable ? "In Stock (Click to Disable)" : "Out of Stock (Click to Enable)"}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {isItemModalOpen && editingItem && (
        <Modal isOpen={true} onClose={() => setItemModalOpen(false)} title={editingItem.id ? "Edit Item" : "Create Item"}>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={editingItem.veg} onChange={() => setEditingItem(p => ({...p, veg: true}))} />
                <span className="text-sm font-semibold text-green-700">Veg</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!editingItem.veg} onChange={() => setEditingItem(p => ({...p, veg: false}))} />
                <span className="text-sm font-semibold text-red-700">Non-Veg</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Name *</label>
              <input type="text" required value={editingItem.name || ""} onChange={e => setEditingItem(p => ({...p, name: e.target.value}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Category *</label>
              <input type="text" required value={editingItem.category || ""} onChange={e => setEditingItem(p => ({...p, category: e.target.value}))} list="category-list" className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              <datalist id="category-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Description</label>
              <textarea rows={2} value={editingItem.description || ""} onChange={e => setEditingItem(p => ({...p, description: e.target.value}))} className="w-full p-2.5 rounded-lg border text-sm outline-none resize-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Selling Price *</label>
                <input type="number" min="0" required value={editingItem.ourPrice ?? ""} onChange={e => setEditingItem(p => ({...p, ourPrice: Number(e.target.value)}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Base Cost *</label>
                <input type="number" min="0" required value={editingItem.baseCost ?? ""} onChange={e => setEditingItem(p => ({...p, baseCost: Number(e.target.value)}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Aggregator Price (Optional)</label>
                <input type="number" min="0" value={editingItem.aggregatorPrice ?? ""} onChange={e => setEditingItem(p => ({...p, aggregatorPrice: e.target.value ? Number(e.target.value) : null}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Sort Order</label>
                <input type="number" value={editingItem.sortOrder ?? 0} onChange={e => setEditingItem(p => ({...p, sortOrder: Number(e.target.value)}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Image URL</label>
              <input type="url" value={editingItem.imageUrl || ""} onChange={e => setEditingItem(p => ({...p, imageUrl: e.target.value}))} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} placeholder="https://..." />
            </div>

            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={editingItem.isAvailable ?? true} onChange={e => setEditingItem(p => ({...p, isAvailable: e.target.checked}))} />
              <span className="text-sm font-semibold">Available for Order</span>
            </label>

            <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-white font-bold mt-4 flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-50" style={{ background: "var(--primary)" }}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Menu Item"}
            </button>
          </form>
        </Modal>
      )}

      {/* Category Rename Modal */}
      {isCategoryModalOpen && editingCategory && (
        <Modal isOpen={true} onClose={() => setCategoryModalOpen(false)} title="Rename Category">
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              This will update the category name across all items currently in "{editingCategory.oldName}".
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1">New Category Name *</label>
              <input type="text" required value={editingCategory.newName} onChange={e => setEditingCategory(p => p ? {...p, newName: e.target.value} : null)} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} autoFocus />
            </div>
            <button type="submit" disabled={saving || editingCategory.newName === editingCategory.oldName} className="w-full py-3 rounded-lg text-white font-bold flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-50" style={{ background: "var(--primary)" }}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rename Category"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
