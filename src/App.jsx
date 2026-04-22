import { useState, useEffect } from "react";

// ── 상수 ──────────────────────────────────────────────
const CATEGORIES = [
  { id: "veggie", label: "🥕 채소", color: "#4CAF50", bg: "#E8F5E9" },
  { id: "meat",   label: "🥩 고기", color: "#E53935", bg: "#FFEBEE" },
  { id: "grain",  label: "🌾 곡물", color: "#F59E0B", bg: "#FFFBEB" },
  { id: "fruit",  label: "🍎 과일", color: "#EC4899", bg: "#FDF2F8" },
  { id: "fish",   label: "🐟 해산물", color: "#3B82F6", bg: "#EFF6FF" },
  { id: "other",  label: "🍳 기타", color: "#8B5CF6", bg: "#F5F3FF" },
];
const LOW_STOCK = 3;
const VALIDITY_DAYS = 14;
const MEAL_LABELS = ["첫째 끼", "둘째 끼", "셋째 끼"];

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const isExpired = (dateStr) => addDays(dateStr, VALIDITY_DAYS) < todayStr();
const isExpiringSoon = (dateStr) => {
  const exp = addDays(dateStr, VALIDITY_DAYS);
  return exp >= todayStr() && exp <= addDays(todayStr(), 3);
};

// ── localStorage 헬퍼 ─────────────────────────────────
function useLocalStorage(key, init) {
  const [val, setVal] = useState(null);

  // 최초 로딩
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setVal(JSON.parse(saved));
      } else {
        setVal(init);
      }
    } catch {
      setVal(init);
    }
  }, [key]);

  // 변경될 때만 저장
  useEffect(() => {
    if (val !== null) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }, [key, val]);

  return [val, setVal];
}
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch { return init; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ── 기본 데이터 ───────────────────────────────────────
const DEFAULT_CUBES = [
  { id: 1, name: "당근",   category: "veggie", count: 6,  made: "2025-04-14", note: "" },
  { id: 2, name: "브로콜리", category: "veggie", count: 4, made: "2025-04-14", note: "" },
  { id: 3, name: "소고기", category: "meat",   count: 8,  made: "2025-04-13", note: "" },
  { id: 4, name: "쌀미음", category: "grain",  count: 10, made: "2025-04-12", note: "" },
  { id: 5, name: "사과",   category: "fruit",  count: 2,  made: "2025-04-15", note: "" },
];

// ══════════════════════════════════════════════════════
export default function App() {
  const [mainTab, setMainTab]   = useState("diet");      // diet | cube
  const [cubeTab, setCubeTab]   = useState("stock");     // stock | alert
  const [cubes, setCubes]       = useLocalStorage("baby_cubes_v2", DEFAULT_CUBES);
  const [meals, setMeals]       = useLocalStorage("baby_meals_v2", {});
  const [filterCat, setFilterCat] = useState("all");

  // 캘린더 상태
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-based
  const [selDate,  setSelDate]  = useState(todayStr());
  const [showMealModal, setShowMealModal] = useState(false);
  const [editMealIdx,   setEditMealIdx]   = useState(null); // null=새끼니
  const [mealForm, setMealForm] = useState({ items: [{ name: "", gram: "" }] });

  // 큐브 폼 상태
  const [showCubeForm, setShowCubeForm] = useState(false);
  const [editCube,     setEditCube]     = useState(null);
  const [cubeForm, setCubeForm] = useState({ name: "", category: "veggie", count: 0, made: todayStr(), note: "" });

  // ── 캘린더 계산 ──────────────────────────────────────
  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=일
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); };
  const monthKey = (y, m, d) => `${y}-${pad(m+1)}-${pad(d)}`;

  // ── 식단 헬퍼 ────────────────────────────────────────
  const dayMeals = (dateStr) => meals[dateStr] || [];
  const totalGram = (dateStr) => dayMeals(dateStr).reduce((s, meal) =>
    s + meal.items.reduce((ss, it) => ss + (Number(it.gram) || 0), 0), 0);

  const openAddMeal = () => {
    setEditMealIdx(null);
    setMealForm({ items: [{ name: "", gram: "" }] });
    setShowMealModal(true);
  };
  const openEditMeal = (idx) => {
    setEditMealIdx(idx);
    setMealForm({ items: [...dayMeals(selDate)[idx].items.map(i => ({ ...i }))] });
    setShowMealModal(true);
  };
  const saveMeal = () => {
    const filtered = mealForm.items.filter(i => i.name.trim());
    if (!filtered.length) return;
    const prev = dayMeals(selDate);
    let next;
    if (editMealIdx !== null) {
      next = prev.map((m, i) => i === editMealIdx ? { items: filtered } : m);
    } else {
      if (prev.length >= 3) return;
      next = [...prev, { items: filtered }];
    }
    setMeals(m => ({ ...m, [selDate]: next }));
    setShowMealModal(false);
  };
  const deleteMeal = (dateStr, idx) => {
    const next = dayMeals(dateStr).filter((_, i) => i !== idx);
    setMeals(m => ({ ...m, [dateStr]: next }));
  };
  const addMealItem = () => setMealForm(f => ({ items: [...f.items, { name: "", gram: "" }] }));
  const removeMealItem = (i) => setMealForm(f => ({ items: f.items.filter((_, idx) => idx !== i) }));
  const updateMealItem = (i, field, val) => setMealForm(f => ({ items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  // ── 큐브 헬퍼 ────────────────────────────────────────
  const openAddCube = () => { setEditCube(null); setCubeForm({ name: "", category: "veggie", count: 0, made: todayStr(), note: "" }); setShowCubeForm(true); };
  const openEditCube = (c) => { setEditCube(c); setCubeForm({ name: c.name, category: c.category, count: c.count, made: c.made, note: c.note }); setShowCubeForm(true); };
  const saveCube = () => {
    if (!cubeForm.name.trim()) return;
    if (editCube) setCubes(cs => cs.map(c => c.id === editCube.id ? { ...c, ...cubeForm, count: Number(cubeForm.count) } : c));
    else setCubes(cs => [...cs, { ...cubeForm, id: Date.now(), count: Number(cubeForm.count) }]);
    setShowCubeForm(false);
  };
  const deleteCube = (id) => setCubes(cs => cs.filter(c => c.id !== id));
  const changeCount = (id, delta) => setCubes(cs => cs.map(c => c.id === id ? { ...c, count: Math.max(0, c.count + delta) } : c));
  const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

  const filtered  = filterCat === "all" ? cubes : cubes.filter(c => c.category === filterCat);
  const lowCubes  = cubes.filter(c => c.count <= LOW_STOCK);

  // ══════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: "#FFF9F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* ── 헤더 ── */}
      <div style={{ background: "linear-gradient(135deg, #FF8C69 0%, #FFB347 100%)", padding: "20px 20px 0", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>🍼 이유식 다이어리</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, marginBottom: 14 }}>우리 아기 식단과 큐브를 한눈에</div>
        {/* 메인 탭 */}
        <div style={{ display: "flex" }}>
          {[{ id: "diet", label: "🗓 식단표" }, { id: "cube", label: "📦 큐브 재고" }].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)} style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: mainTab === t.id ? 800 : 500, color: mainTab === t.id ? "#FF8C69" : "rgba(255,255,255,0.75)", background: mainTab === t.id ? "#fff" : "transparent", border: "none", borderRadius: mainTab === t.id ? "12px 12px 0 0" : 0, cursor: "pointer", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ 식단표 탭 ══ */}
      {mainTab === "diet" && (
        <div style={{ padding: "16px 16px 0" }}>
          {/* 캘린더 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#333" }}>{calYear}년 {calMonth + 1}월</span>
            <button onClick={nextMonth} style={navBtn}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", marginBottom: 4 }}>
            {["일","월","화","수","목","금","토"].map((d,i) => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, color: i===0?"#E53935":i===6?"#3B82F6":"#aaa", padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const d = i + 1;
              const key = monthKey(calYear, calMonth, d);
              const isToday = key === todayStr();
              const isSel   = key === selDate;
              const gram    = totalGram(key);
              const mealCnt = dayMeals(key).length;
              const dow     = (firstDay + i) % 7;
              return (
                <div key={d} onClick={() => setSelDate(key)} style={{ borderRadius: 10, padding: "6px 2px", textAlign: "center", background: isSel ? "#FF8C69" : isToday ? "#FFF0EB" : "#fff", border: isSel ? "none" : isToday ? "2px solid #FF8C69" : "1.5px solid #F0EBE7", cursor: "pointer", minHeight: 52, transition: "all 0.15s" }}>
                  <div style={{ fontSize: 13, fontWeight: isSel||isToday ? 800 : 500, color: isSel ? "#fff" : dow===0?"#E53935":dow===6?"#3B82F6":"#333" }}>{d}</div>
                  {mealCnt > 0 && <div style={{ fontSize: 9, color: isSel?"rgba(255,255,255,0.9)":"#FF8C69", fontWeight: 700, marginTop: 2 }}>{mealCnt}끼</div>}
                  {gram > 0 && <div style={{ fontSize: 9, color: isSel?"rgba(255,255,255,0.8)":"#aaa", marginTop: 1 }}>{gram}g</div>}
                </div>
              );
            })}
          </div>

          {/* 선택 날짜 식단 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#333" }}>{selDate.replace(/-/g,".")} 식단</span>
                {totalGram(selDate) > 0 && <span style={{ fontSize: 12, color: "#FF8C69", fontWeight: 700, marginLeft: 8 }}>총 {totalGram(selDate)}g</span>}
              </div>
              {dayMeals(selDate).length < 3 && (
                <button onClick={openAddMeal} style={{ padding: "6px 14px", borderRadius: 10, border: "none", background: "#FF8C69", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ 끼니 추가</button>
              )}
            </div>

            {dayMeals(selDate).length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "#ccc" }}>
                <div style={{ fontSize: 32 }}>🍽</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>기록된 식단이 없어요</div>
              </div>
            )}

            {dayMeals(selDate).map((meal, idx) => {
              const mealGram = meal.items.reduce((s, it) => s + (Number(it.gram)||0), 0);
              return (
                <div key={idx} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: "#FFF0EB", color: "#FF8C69", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{MEAL_LABELS[idx]}</span>
                      <span style={{ fontSize: 12, color: "#FF8C69", fontWeight: 700 }}>{mealGram}g</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEditMeal(idx)} style={smallBtn("#F0EBE7","#666")}>수정</button>
                      <button onClick={() => deleteMeal(selDate, idx)} style={smallBtn("#FFF0EE","#E53935")}>삭제</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {meal.items.map((it, i) => (
                      <div key={i} style={{ background: "#FFF9F5", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#555" }}>
                        {it.name} <span style={{ color: "#FF8C69", fontWeight: 700 }}>{it.gram}g</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ 큐브 재고 탭 ══ */}
      {mainTab === "cube" && (
        <div>
          {/* 서브 탭 */}
          <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #F3EDE8" }}>
            {[{ id: "stock", label: "📋 재고 현황" }, { id: "alert", label: `⚠️ 부족 알림${lowCubes.length > 0 ? ` (${lowCubes.length})` : ""}` }].map(t => (
              <button key={t.id} onClick={() => setCubeTab(t.id)} style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: cubeTab===t.id?700:500, color: cubeTab===t.id?"#FF8C69":"#999", border: "none", background: "none", borderBottom: cubeTab===t.id?"3px solid #FF8C69":"3px solid transparent", cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* 재고 현황 */}
          {cubeTab === "stock" && (
            <div style={{ padding: "16px 16px 0" }}>
              {/* 카테고리 필터 */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
                <button onClick={() => setFilterCat("all")} style={{ flexShrink:0, padding:"5px 12px", borderRadius:20, border:"none", background:filterCat==="all"?"#FF8C69":"#F0EBE7", color:filterCat==="all"?"#fff":"#666", fontSize:12, fontWeight:600, cursor:"pointer" }}>전체</button>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ flexShrink:0, padding:"5px 12px", borderRadius:20, border:"none", background:filterCat===c.id?c.color:"#F0EBE7", color:filterCat===c.id?"#fff":"#666", fontSize:12, fontWeight:600, cursor:"pointer" }}>{c.label}</button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#bbb" }}>
                    <div style={{ fontSize:36 }}>📭</div>
                    <div style={{ fontSize:13, marginTop:6 }}>등록된 재고가 없어요</div>
                  </div>
                )}
                {filtered.map(item => {
                  const cat  = getCat(item.category);
                  const isLow = item.count <= LOW_STOCK;
                  const exp  = addDays(item.made, VALIDITY_DAYS);
                  const expired = isExpired(item.made);
                  const soon    = isExpiringSoon(item.made);
                  return (
                    <div key={item.id} style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border: expired?"2px solid #E53935":isLow?"2px solid #FFB347":"2px solid transparent" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ background:cat.bg, color:cat.color, borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:700 }}>{cat.label}</div>
                          <span style={{ fontSize:16, fontWeight:800, color:"#333" }}>{item.name}</span>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          {expired && <span style={{ fontSize:10, background:"#FFEBEE", color:"#E53935", borderRadius:8, padding:"2px 8px", fontWeight:700 }}>유통기한 만료</span>}
                          {!expired && soon && <span style={{ fontSize:10, background:"#FFF3CD", color:"#E65100", borderRadius:8, padding:"2px 8px", fontWeight:700 }}>곧 만료</span>}
                          {isLow && !expired && <span style={{ fontSize:10, background:"#FFF9C4", color:"#F57F17", borderRadius:8, padding:"2px 8px", fontWeight:700 }}>재고부족</span>}
                        </div>
                      </div>

                      {/* 제조일 & 유효기간 */}
                      <div style={{ display:"flex", gap:10, marginTop:8 }}>
                        <div style={{ fontSize:11, color:"#aaa" }}>📅 제조일: <span style={{ color:"#888" }}>{item.made}</span></div>
                        <div style={{ fontSize:11, color: expired?"#E53935":soon?"#E65100":"#aaa" }}>⏰ 유효기간: <span style={{ fontWeight:700 }}>{exp}</span></div>
                      </div>

                      {item.note && <div style={{ marginTop:8, fontSize:12, color:"#888", background:"#FFF9F5", borderRadius:8, padding:"5px 10px" }}>📝 {item.note}</div>}

                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <button onClick={() => changeCount(item.id,-1)} style={{ width:34, height:34, borderRadius:10, border:"none", background:"#F0EBE7", fontSize:18, fontWeight:700, cursor:"pointer", color:"#666" }}>−</button>
                          <div style={{ textAlign:"center" }}>
                            <span style={{ fontSize:26, fontWeight:900, color:isLow?"#FF8C69":"#333" }}>{item.count}</span>
                            <span style={{ fontSize:12, color:"#aaa", marginLeft:3 }}>개</span>
                          </div>
                          <button onClick={() => changeCount(item.id,1)} style={{ width:34, height:34, borderRadius:10, border:"none", background:"#FF8C69", fontSize:18, fontWeight:700, cursor:"pointer", color:"#fff" }}>+</button>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => openEditCube(item)} style={smallBtn("#F0EBE7","#666")}>수정</button>
                          <button onClick={() => deleteCube(item.id)} style={smallBtn("#FFF0EE","#E53935")}>삭제</button>
                        </div>
                      </div>
                      <div style={{ marginTop:10, background:"#F0EBE7", borderRadius:4, height:5 }}>
                        <div style={{ width:`${Math.min(100,(item.count/15)*100)}%`, height:"100%", borderRadius:4, background:isLow?"#FFB347":cat.color, transition:"width 0.3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 부족 알림 */}
          {cubeTab === "alert" && (
            <div style={{ padding:16 }}>
              {lowCubes.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#bbb" }}>
                  <div style={{ fontSize:48 }}>✅</div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#888", marginTop:8 }}>부족한 재료가 없어요!</div>
                  <div style={{ fontSize:13, color:"#bbb", marginTop:4 }}>모든 큐브가 충분히 준비되어 있어요 😊</div>
                </div>
              ) : (
                <>
                  <div style={{ background:"#FFF3CD", borderRadius:14, padding:"12px 16px", marginBottom:12, border:"1px solid #FFE082" }}>
                    <div style={{ fontWeight:700, color:"#E65100", fontSize:14 }}>⚠️ 재고가 {LOW_STOCK}개 이하인 재료</div>
                    <div style={{ fontSize:12, color:"#A05000", marginTop:4 }}>빠른 시일 내에 이유식 큐브를 만들어주세요!</div>
                  </div>
                  {lowCubes.map(item => {
                    const cat = getCat(item.category);
                    return (
                      <div key={item.id} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"2px solid #FFB347", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(255,179,71,0.1)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ background:cat.bg, color:cat.color, borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:700 }}>{cat.label}</div>
                          <span style={{ fontSize:15, fontWeight:800, color:"#333" }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <span style={{ fontSize:22, fontWeight:900, color:item.count===0?"#E53935":"#FF8C69" }}>{item.count}</span>
                          <span style={{ fontSize:12, color:"#aaa" }}>개</span>
                          {item.count===0 && <div style={{ fontSize:10, color:"#E53935", fontWeight:700 }}>품절!</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      {(mainTab === "cube" && cubeTab === "stock") && (
        <button onClick={openAddCube} style={{ position:"fixed", bottom:24, right:24, width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#FF8C69,#FFB347)", border:"none", color:"#fff", fontSize:26, cursor:"pointer", boxShadow:"0 4px 16px rgba(255,140,105,0.5)", zIndex:100 }}>+</button>
      )}

      {/* ── 식단 모달 ── */}
      {showMealModal && (
        <div style={overlay} onClick={() => setShowMealModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={modal}>
            <div style={modalHandle} />
            <div style={{ fontSize:17, fontWeight:800, marginBottom:16, color:"#333" }}>
              {editMealIdx !== null ? `${MEAL_LABELS[editMealIdx]} 수정` : `${MEAL_LABELS[dayMeals(selDate).length]} 추가`}
            </div>
            {mealForm.items.map((it, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
                <input value={it.name} onChange={e=>updateMealItem(i,"name",e.target.value)} placeholder="재료명 (예: 소고기)" style={{ ...inputStyle, flex:2 }} />
                <input value={it.gram} onChange={e=>updateMealItem(i,"gram",e.target.value)} placeholder="g" type="number" style={{ ...inputStyle, flex:1 }} />
                {mealForm.items.length > 1 && (
                  <button onClick={()=>removeMealItem(i)} style={{ width:30, height:30, borderRadius:8, border:"none", background:"#FFF0EE", color:"#E53935", fontSize:16, fontWeight:700, cursor:"pointer", flexShrink:0 }}>×</button>
                )}
              </div>
            ))}
            <button onClick={addMealItem} style={{ width:"100%", padding:"9px", borderRadius:10, border:"1.5px dashed #FFB347", background:"transparent", color:"#FFB347", fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:12 }}>+ 재료 추가</button>
            <button onClick={saveMeal} style={saveBtn}>저장하기</button>
          </div>
        </div>
      )}

      {/* ── 큐브 폼 모달 ── */}
      {showCubeForm && (
        <div style={overlay} onClick={() => setShowCubeForm(false)}>
          <div onClick={e=>e.stopPropagation()} style={modal}>
            <div style={modalHandle} />
            <div style={{ fontSize:17, fontWeight:800, marginBottom:16, color:"#333" }}>{editCube ? "큐브 수정" : "새 큐브 추가"}</div>
            <label style={labelStyle}>재료 이름 *</label>
            <input value={cubeForm.name} onChange={e=>setCubeForm({...cubeForm,name:e.target.value})} placeholder="예: 당근, 소고기" style={{ ...inputStyle, width:"100%", marginBottom:12 }} />
            <label style={labelStyle}>카테고리</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={()=>setCubeForm({...cubeForm,category:c.id})} style={{ padding:"5px 10px", borderRadius:10, border:"none", background:cubeForm.category===c.id?c.color:"#F0EBE7", color:cubeForm.category===c.id?"#fff":"#666", fontSize:11, fontWeight:600, cursor:"pointer" }}>{c.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>큐브 개수</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <button onClick={()=>setCubeForm({...cubeForm,count:Math.max(0,cubeForm.count-1)})} style={{ width:34, height:34, borderRadius:10, border:"none", background:"#F0EBE7", fontSize:18, fontWeight:700, cursor:"pointer", color:"#666" }}>−</button>
                  <input type="number" value={cubeForm.count} onChange={e=>setCubeForm({...cubeForm,count:Number(e.target.value)})} style={{ width:50, textAlign:"center", padding:"8px 4px", borderRadius:10, border:"1.5px solid #E0D8D4", fontSize:16, fontWeight:700, outline:"none" }} />
                  <button onClick={()=>setCubeForm({...cubeForm,count:cubeForm.count+1})} style={{ width:34, height:34, borderRadius:10, border:"none", background:"#FF8C69", fontSize:18, fontWeight:700, cursor:"pointer", color:"#fff" }}>+</button>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>제조일</label>
                <input type="date" value={cubeForm.made} onChange={e=>setCubeForm({...cubeForm,made:e.target.value})} style={{ ...inputStyle, width:"100%" }} />
                <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>유효기간: <span style={{ color:"#FF8C69", fontWeight:700 }}>{addDays(cubeForm.made, VALIDITY_DAYS)}</span></div>
              </div>
            </div>
            <label style={labelStyle}>메모 (선택)</label>
            <input value={cubeForm.note} onChange={e=>setCubeForm({...cubeForm,note:e.target.value})} placeholder="알레르기, 아기 반응 등" style={{ ...inputStyle, width:"100%", marginBottom:16 }} />
            <button onClick={saveCube} style={saveBtn}>{editCube ? "수정 완료" : "추가하기"}</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ── 스타일 상수 ───────────────────────────────────────
const navBtn = { width:36, height:36, borderRadius:10, border:"none", background:"rgba(255,255,255,0.25)", color:"#fff", fontSize:20, fontWeight:700, cursor:"pointer" };
const smallBtn = (bg, color) => ({ padding:"6px 12px", borderRadius:10, border:"none", background:bg, fontSize:12, color, cursor:"pointer", fontWeight:600 });
const overlay = { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" };
const modal   = { background:"#fff", width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"24px 24px 0 0", padding:"20px 20px 36px", boxShadow:"0 -4px 24px rgba(0,0,0,0.1)" };
const modalHandle = { width:40, height:4, background:"#E0D8D4", borderRadius:2, margin:"0 auto 18px" };
const inputStyle  = { padding:"11px 13px", borderRadius:12, border:"1.5px solid #E0D8D4", fontSize:14, outline:"none", display:"block" };
const labelStyle  = { fontSize:12, fontWeight:700, color:"#888", display:"block", marginBottom:4 };
const saveBtn     = { width:"100%", padding:"14px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#FF8C69,#FFB347)", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer" };
