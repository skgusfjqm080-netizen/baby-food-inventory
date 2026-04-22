import { useState, useEffect } from "react";

const CATEGORIES = [
  { id: "veggie", label: "🥕 채소류", color: "#4CAF50", bg: "#E8F5E9" },
  { id: "meat", label: "🥩 고기류", color: "#E53935", bg: "#FFEBEE" },
  { id: "grain", label: "🌾 곡물류", color: "#F59E0B", bg: "#FFFBEB" },
  { id: "fruit", label: "🍎 과일류", color: "#EC4899", bg: "#FDF2F8" },
  { id: "fish", label: "🐟 해산물", color: "#3B82F6", bg: "#EFF6FF" },
  { id: "other", label: "🍳 기타", color: "#8B5CF6", bg: "#F5F3FF" },
];

const DEFAULT_ITEMS = [
  { id: 1, name: "당근", category: "veggie", count: 6, made: "2025-04-14", note: "" },
  { id: 2, name: "브로콜리", category: "veggie", count: 4, made: "2025-04-14", note: "" },
  { id: 3, name: "소고기", category: "meat", count: 8, made: "2025-04-13", note: "" },
  { id: 4, name: "쌀미음", category: "grain", count: 10, made: "2025-04-12", note: "" },
  { id: 5, name: "사과", category: "fruit", count: 2, made: "2025-04-15", note: "" },
];

const LOW_STOCK = 3;

const today = () => new Date().toISOString().split("T")[0];

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("baby_cubes");
      return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
    } catch { return DEFAULT_ITEMS; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ name: "", category: "veggie", count: 0, made: today(), note: "" });
  const [activeTab, setActiveTab] = useState("inventory");

  useEffect(() => {
    try { localStorage.setItem("baby_cubes", JSON.stringify(items)); } catch {}
  }, [items]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", category: "veggie", count: 0, made: today(), note: "" });
    setShowForm(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, count: item.count, made: item.made, note: item.note });
    setShowForm(true);
  };
  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editItem) {
      setItems(items.map(i => i.id === editItem.id ? { ...i, ...form, count: Number(form.count) } : i));
    } else {
      setItems([...items, { ...form, id: Date.now(), count: Number(form.count) }]);
    }
    setShowForm(false);
  };
  const deleteItem = (id) => setItems(items.filter(i => i.id !== id));
  const changeCount = (id, delta) => {
    setItems(items.map(i => i.id === id ? { ...i, count: Math.max(0, i.count + delta) } : i));
  };

  const filtered = filterCat === "all" ? items : items.filter(i => i.category === filterCat);
  const lowItems = items.filter(i => i.count <= LOW_STOCK);
  const totalCubes = items.reduce((s, i) => s + i.count, 0);

  const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

  return (
    <div style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", background: "#FFF9F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #FF8C69 0%, #FFB347 100%)", padding: "24px 20px 16px", color: "#fff" }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>🍼 이유식 큐브 재고표</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>우리 아기 이유식 재고를 한눈에 관리해요</div>
        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[
            { label: "전체 큐브", value: totalCubes + "개", emoji: "📦" },
            { label: "재료 종류", value: items.length + "가지", emoji: "🥗" },
            { label: "부족 재료", value: lowItems.length + "개", emoji: "⚠️" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px 8px", textAlign: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: 18 }}>{s.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #F3EDE8" }}>
        {[{ id: "inventory", label: "📋 재고 현황" }, { id: "alert", label: `⚠️ 부족 알림 ${lowItems.length > 0 ? `(${lowItems.length})` : ""}` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "13px 0", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? "#FF8C69" : "#999", border: "none", background: "none", borderBottom: activeTab === t.id ? "3px solid #FF8C69" : "3px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <div style={{ padding: "16px 16px 0" }}>
          {/* Category Filter */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            <button onClick={() => setFilterCat("all")} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", background: filterCat === "all" ? "#FF8C69" : "#F0EBE7", color: filterCat === "all" ? "#fff" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>전체</button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", background: filterCat === c.id ? c.color : "#F0EBE7", color: filterCat === c.id ? "#fff" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Items */}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                등록된 재고가 없어요
              </div>
            )}
            {filtered.map(item => {
              const cat = getCat(item.category);
              const isLow = item.count <= LOW_STOCK;
              return (
                <div key={item.id} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: isLow ? "2px solid #FFB347" : "2px solid transparent", position: "relative", animation: "fadeIn 0.3s ease" }}>
                  {isLow && <div style={{ position: "absolute", top: 10, right: 12, background: "#FFB347", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>부족</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: cat.bg, color: cat.color, borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{cat.label}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#333" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>제조일: {item.made}</div>
                    </div>
                  </div>
                  {item.note && <div style={{ marginTop: 8, fontSize: 12, color: "#888", background: "#FFF9F5", borderRadius: 8, padding: "6px 10px" }}>📝 {item.note}</div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => changeCount(item.id, -1)} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#F0EBE7", fontSize: 18, cursor: "pointer", fontWeight: 700, color: "#666" }}>−</button>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 26, fontWeight: 900, color: isLow ? "#FF8C69" : "#333" }}>{item.count}</span>
                        <span style={{ fontSize: 12, color: "#aaa", marginLeft: 3 }}>개</span>
                      </div>
                      <button onClick={() => changeCount(item.id, 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#FF8C69", fontSize: 18, cursor: "pointer", fontWeight: 700, color: "#fff" }}>+</button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(item)} style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid #E0D8D4", background: "#fff", fontSize: 12, color: "#666", cursor: "pointer" }}>수정</button>
                      <button onClick={() => deleteItem(item.id)} style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "#FFF0EE", fontSize: 12, color: "#E53935", cursor: "pointer" }}>삭제</button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 10, background: "#F0EBE7", borderRadius: 4, height: 5 }}>
                    <div style={{ width: `${Math.min(100, (item.count / 15) * 100)}%`, height: "100%", borderRadius: 4, background: isLow ? "#FFB347" : cat.color, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "alert" && (
        <div style={{ padding: 16 }}>
          {lowItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#888" }}>부족한 재료가 없어요!</div>
              <div style={{ fontSize: 13, color: "#bbb", marginTop: 4 }}>모든 큐브가 충분히 준비되어 있어요 😊</div>
            </div>
          ) : (
            <>
              <div style={{ background: "#FFF3CD", borderRadius: 14, padding: "14px 16px", marginBottom: 14, border: "1px solid #FFE082" }}>
                <div style={{ fontWeight: 700, color: "#E65100", fontSize: 14 }}>⚠️ 재고가 {LOW_STOCK}개 이하인 재료</div>
                <div style={{ fontSize: 12, color: "#A05000", marginTop: 4 }}>빠른 시일 내에 이유식 큐브를 만들어주세요!</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lowItems.map(item => {
                  const cat = getCat(item.category);
                  return (
                    <div key={item.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "2px solid #FFB347", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(255,179,71,0.1)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: cat.bg, color: cat.color, borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>{cat.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#333" }}>{item.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: item.count === 0 ? "#E53935" : "#FF8C69" }}>{item.count}</span>
                        <span style={{ fontSize: 12, color: "#aaa" }}>개</span>
                        {item.count === 0 && <div style={{ fontSize: 10, color: "#E53935", fontWeight: 700 }}>품절!</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button onClick={openAdd} style={{ position: "fixed", bottom: 24, right: 24, width: 58, height: 58, borderRadius: "50%", background: "linear-gradient(135deg, #FF8C69, #FFB347)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,140,105,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>+</button>

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0D8D4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18, color: "#333" }}>{editItem ? "큐브 수정" : "새 큐브 추가"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>재료 이름 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 당근, 소고기, 단호박" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E0D8D4", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>카테고리</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setForm({ ...form, category: c.id })} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: form.category === c.id ? c.color : "#F0EBE7", color: form.category === c.id ? "#fff" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>큐브 개수</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setForm({ ...form, count: Math.max(0, form.count - 1) })} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#F0EBE7", fontSize: 18, fontWeight: 700, cursor: "pointer", color: "#666" }}>−</button>
                    <input type="number" value={form.count} onChange={e => setForm({ ...form, count: Number(e.target.value) })} style={{ width: 60, textAlign: "center", padding: "8px 4px", borderRadius: 10, border: "1.5px solid #E0D8D4", fontSize: 16, fontWeight: 700, outline: "none" }} />
                    <button onClick={() => setForm({ ...form, count: form.count + 1 })} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#FF8C69", fontSize: 18, fontWeight: 700, cursor: "pointer", color: "#fff" }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>제조일</label>
                  <input type="date" value={form.made} onChange={e => setForm({ ...form, made: e.target.value })} style={{ width: "100%", padding: "10px 10px", borderRadius: 12, border: "1.5px solid #E0D8D4", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>메모 (선택)</label>
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="알레르기 반응, 아기 선호도 등" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E0D8D4", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <button onClick={saveForm} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #FF8C69, #FFB347)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>
                {editItem ? "수정 완료" : "추가하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        * { box-sizing: border-box; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
