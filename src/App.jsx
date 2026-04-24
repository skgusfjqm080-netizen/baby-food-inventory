import { useState, useEffect, useRef, useCallback } from "react";

const P = {
  bg:"#FAF6F2", surface:"#fff", border:"#F0E6DC",
  rose:"#E8A598", roseDark:"#C08070", rosePale:"#F0E6DC",
  text:"#3A2520", textSub:"#C4A090",
};

const CATEGORIES = [
  { id:"veggie", label:"채소",  color:"#4CAF50", bg:"#E8F5E9" },
  { id:"meat",   label:"고기",  color:"#E53935", bg:"#FFEBEE" },
  { id:"grain",  label:"곡물",  color:"#F59E0B", bg:"#FFFBEB" },
  { id:"fruit",  label:"과일",  color:"#EC4899", bg:"#FDF2F8" },
  { id:"fish",   label:"해산물",color:"#3B82F6", bg:"#EFF6FF" },
  { id:"other",  label:"기타",  color:"#8B5CF6", bg:"#F5F3FF" },
];
const LOW_STOCK=3, VALIDITY_DAYS=14;
const MEAL_LABELS=["첫째 끼","둘째 끼","셋째 끼"];
const MEAL_COLORS=["#E8A598","#4CAF50","#3B82F6"];
const DAYS_KO=["일","월","화","수","목","금","토"];

const pad = n => String(n).padStart(2,"0");
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const addDays = (s,n) => { const d=new Date(s); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const isExpired = m => addDays(m,VALIDITY_DAYS)<todayStr();
const isExpiringSoon = m => { const e=addDays(m,VALIDITY_DAYS); return e>=todayStr()&&e<=addDays(todayStr(),3); };
const weekStart = s => { const d=new Date(s); d.setDate(d.getDate()-d.getDay()); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const weekDates = s => Array.from({length:7},(_,i)=>addDays(s,i));

function useLS(key,init){
  const [val,set]=useState(()=>{ try{ const s=localStorage.getItem(key); return s?JSON.parse(s):init; }catch{return init;} });
  useEffect(()=>{ try{localStorage.setItem(key,JSON.stringify(val));}catch{} },[key,val]);
  return [val,set];
}

const TODAY=todayStr();
const DEFAULT_CUBES=[
  {id:1,name:"당근",   category:"veggie",count:6, made:addDays(TODAY,-5),note:""},
  {id:2,name:"브로콜리",category:"veggie",count:4, made:addDays(TODAY,-5),note:""},
  {id:3,name:"소고기", category:"meat",  count:8, made:addDays(TODAY,-6),note:""},
  {id:4,name:"쌀미음", category:"grain", count:10,made:addDays(TODAY,-7),note:""},
  {id:5,name:"사과",   category:"fruit", count:2, made:addDays(TODAY,-4),note:""},
];

const BabyIllust=({size=56})=>(
  <svg viewBox="0 0 56 56" width={size} height={size}>
    <circle cx="28" cy="28" r="28" fill="#FADDD8"/>
    <circle cx="28" cy="22" r="10" fill="#F4B8B0"/>
    <ellipse cx="28" cy="43" rx="15" ry="12" fill="#F4B8B0"/>
    <circle cx="24" cy="21" r="1.5" fill="#3A2520" opacity=".6"/>
    <circle cx="32" cy="21" r="1.5" fill="#3A2520" opacity=".6"/>
    <path d="M25 25.5 Q28 28 31 25.5" stroke="#3A2520" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".5"/>
  </svg>
);

// ── 전체화면 페이지 래퍼 (모달 대신 사용 — iOS 키보드 문제 해결) ──
function FullPage({title,subtitle,onClose,children}){
  return (
    <div style={{position:"fixed",inset:0,background:P.bg,zIndex:300,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* 헤더 */}
      <div style={{position:"sticky",top:0,background:P.bg,borderBottom:`1px solid ${P.border}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,zIndex:10}}>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${P.border}`,background:P.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke={P.roseDark} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:P.text}}>{title}</div>
          {subtitle&&<div style={{fontSize:11,color:P.rose,fontWeight:600,marginTop:1}}>{subtitle}</div>}
        </div>
      </div>
      {/* 내용 */}
      <div style={{padding:"20px 16px 120px"}}>
        {children}
      </div>
    </div>
  );
}

export default function App(){
  const [babyName,setBabyName]=useLS("baby_name_v1","");
  const [babyPhoto,setBabyPhoto]=useLS("baby_photo_v1","");
  const [cubes,setCubes]=useLS("baby_cubes_v2",DEFAULT_CUBES);
  const [meals,setMeals]=useLS("baby_meals_v2",{});
  const [cubeDays,setCubeDays]=useLS("baby_cube_days_v1",{});

  // ── 페이지 상태 ──
  // page: "main" | "profile" | "meal" | "cubeday" | "cubeform"
  const [page,setPage]=useState("main");
  const [mainTab,setMainTab]=useState("cube");
  const [cubeTab,setCubeTab]=useState("stock");
  const [dietView,setDietView]=useState("week");
  const [filterCat,setFilterCat]=useState("all");

  // 프로필 설정
  const [profileDraft,setProfileDraft]=useState({name:"",photo:""});
  const photoInputRef=useRef(null);
  useEffect(()=>{ if(!babyName){ setProfileDraft({name:"",photo:""}); setPage("profile"); } },[]);

  // 식단 관련
  const [mealDate,setMealDate]=useState(TODAY);
  const [editMealIdx,setEditMealIdx]=useState(null);
  const [mealForm,setMealForm]=useState({items:[{name:"",gram:""}]});
  const [sugg,setSugg]=useState([]);
  const [activeII,setActiveII]=useState(null);
  const dayMeals=d=>meals[d]||[];
  const totalGram=d=>dayMeals(d).reduce((s,m)=>s+m.items.reduce((ss,it)=>ss+(Number(it.gram)||0),0),0);

  // 큐브 만드는 날
  const [cdDate,setCdDate]=useState(TODAY);
  const [cdInput,setCdInput]=useState("");
  const [cdSugg,setCdSugg]=useState([]);
  const cdList=d=>cubeDays[d]||[];

  // 큐브 재고 폼
  const [editCube,setEditCube]=useState(null);
  const [cubeForm,setCubeForm]=useState({name:"",category:"veggie",count:0,made:TODAY,note:""});

  // 주간 스크롤
  const today=todayStr();
  const todayWS=weekStart(today);
  const scrollRef=useRef(null);
  const weekRefs=useRef({});
  const allWeekStarts=useCallback(()=>Array.from({length:13},(_,i)=>addDays(todayWS,(i-8)*7)),[todayWS]);
  useEffect(()=>{
    if(mainTab!=="diet"||dietView!=="week") return;
    setTimeout(()=>{ const el=weekRefs.current[todayWS]; if(el&&scrollRef.current) scrollRef.current.scrollTo({top:el.offsetTop-8,behavior:"instant"}); },60);
  },[mainTab,dietView,todayWS]);

  // 월간
  const nowD=new Date();
  const [calYear,setCalYear]=useState(nowD.getFullYear());
  const [calMonth,setCalMonth]=useState(nowD.getMonth());
  const [selDate,setSelDate]=useState(today);
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const prevMonth=()=>{ if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextMonth=()=>{ if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };
  const mkKey=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;

  const getCat=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[5];
  const filtered=filterCat==="all"?cubes:cubes.filter(c=>c.category===filterCat);
  const lowCubes=cubes.filter(c=>c.count<=LOW_STOCK);

  // ── 페이지 오픈 헬퍼 ──
  const openProfile=()=>{ setProfileDraft({name:babyName,photo:babyPhoto}); setPage("profile"); };
  const openAddMeal=d=>{ setMealDate(d); setEditMealIdx(null); setMealForm({items:[{name:"",gram:""}]}); setSugg([]); setActiveII(null); setPage("meal"); };
  const openEditMeal=(d,i)=>{ setMealDate(d); setEditMealIdx(i); setMealForm({items:[...dayMeals(d)[i].items.map(x=>({...x}))]}); setSugg([]); setActiveII(null); setPage("meal"); };
  const openCubeDay=d=>{ setCdDate(d); setCdInput(""); setCdSugg([]); setPage("cubeday"); };
  const openAddCube=()=>{ setEditCube(null); setCubeForm({name:"",category:"veggie",count:0,made:today,note:""}); setPage("cubeform"); };
  const openEditCube=c=>{ setEditCube(c); setCubeForm({name:c.name,category:c.category,count:c.count,made:c.made,note:c.note}); setPage("cubeform"); };

  // ── 저장 핸들러 ──
  const saveProfile=()=>{ setBabyName(profileDraft.name); setBabyPhoto(profileDraft.photo); setPage("main"); };
  const saveMeal=()=>{
    const f=mealForm.items.filter(i=>i.name.trim());
    if(!f.length) return;
    const prev=dayMeals(mealDate);
    setMeals(m=>({...m,[mealDate]:editMealIdx!==null?prev.map((x,i)=>i===editMealIdx?{items:f}:x):[...prev,{items:f}]}));
    setPage("main");
  };
  const deleteMeal=(d,i)=>setMeals(m=>({...m,[d]:dayMeals(d).filter((_,j)=>j!==i)}));
  const addMealItem=()=>setMealForm(f=>({items:[...f.items,{name:"",gram:""}]}));
  const removeMealItem=i=>setMealForm(f=>({items:f.items.filter((_,j)=>j!==i)}));
  const updateMI=(i,field,val)=>{
    setMealForm(f=>({items:f.items.map((it,j)=>j===i?{...it,[field]:val}:it)}));
    if(field==="name"){ setActiveII(i); const q=val.toLowerCase(); setSugg(q?cubes.map(c=>c.name).filter(n=>n.toLowerCase().includes(q)):cubes.map(c=>c.name)); }
  };
  const pickSugg=name=>{ if(activeII===null)return; setMealForm(f=>({items:f.items.map((it,i)=>i===activeII?{...it,name}:it)})); setSugg([]); setActiveII(null); };
  const addCD=()=>{ const v=cdInput.trim(); if(!v)return; if(!cdList(cdDate).includes(v)) setCubeDays(cd=>({...cd,[cdDate]:[...cdList(cdDate),v]})); setCdInput(""); setCdSugg([]); };
  const removeCD=(d,n)=>setCubeDays(cd=>({...cd,[d]:cdList(d).filter(x=>x!==n)}));
  const saveCube=()=>{
    if(!cubeForm.name.trim())return;
    if(editCube) setCubes(cs=>cs.map(c=>c.id===editCube.id?{...c,...cubeForm,count:Number(cubeForm.count)}:c));
    else setCubes(cs=>[...cs,{...cubeForm,id:Date.now(),count:Number(cubeForm.count)}]);
    setPage("main");
  };
  const deleteCube=id=>setCubes(cs=>cs.filter(c=>c.id!==id));
  const changeCount=(id,delta)=>setCubes(cs=>cs.map(c=>c.id===id?{...c,count:Math.max(0,c.count+delta)}:c));

  // ── 날짜 카드 ──
  const renderDayCard=(dateStr,compact=false)=>{
    const dm=dayMeals(dateStr),cdl=cdList(dateStr),gram=totalGram(dateStr);
    const isToday=dateStr===today,dow=new Date(dateStr).getDay(),dayNum=Number(dateStr.slice(8));
    if(compact){
      const isSel=dateStr===selDate;
      return(
        <div key={dateStr} onClick={()=>setSelDate(dateStr)} style={{borderRadius:10,padding:"5px 3px",textAlign:"center",background:isSel?P.rose:isToday?"#FFF0EB":P.surface,border:isToday&&!isSel?`1.5px solid ${P.rose}`:"1.5px solid transparent",cursor:"pointer",minHeight:54}}>
          <div style={{fontSize:13,fontWeight:isSel||isToday?700:400,color:isSel?"#fff":dow===0?"#E53935":dow===6?"#3B82F6":P.text}}>{dayNum}</div>
          {dm.length>0&&<div style={{fontSize:9,color:isSel?"rgba(255,255,255,0.9)":P.rose,fontWeight:700}}>{dm.length}끼</div>}
          {gram>0&&<div style={{fontSize:9,color:isSel?"rgba(255,255,255,0.75)":P.textSub}}>{gram}g</div>}
          {cdl.length>0&&<div style={{fontSize:9,color:isSel?"rgba(255,255,255,0.85)":"#8B5CF6",fontWeight:700}}>🧊{cdl.length}</div>}
        </div>
      );
    }
    return(
      <div key={dateStr} style={{margin:"0 12px 8px",background:P.surface,borderRadius:16,border:isToday?`2px solid ${P.rose}`:"2px solid transparent",boxShadow:"0 1px 6px rgba(196,112,80,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 6px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:isToday?P.rose:P.rosePale,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:9,fontWeight:700,color:isToday?"rgba(255,255,255,0.8)":dow===0?"#E53935":dow===6?"#3B82F6":P.textSub,lineHeight:1}}>{DAYS_KO[dow]}</span>
              <span style={{fontSize:13,fontWeight:900,color:isToday?"#fff":dow===0?"#E53935":dow===6?"#3B82F6":P.text,lineHeight:1.3}}>{dayNum}</span>
            </div>
            {gram>0&&<span style={{fontSize:11,color:P.rose,fontWeight:700,background:"#FFF0EB",padding:"2px 8px",borderRadius:10}}>총 {gram}g</span>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>openCubeDay(dateStr)} style={{padding:"4px 10px",borderRadius:10,border:"1.5px solid #8B5CF6",background:"#F5F3FF",color:"#8B5CF6",fontSize:11,fontWeight:700,cursor:"pointer"}}>🧊 큐브</button>
            {dm.length<3&&<button onClick={()=>openAddMeal(dateStr)} style={{padding:"4px 10px",borderRadius:10,border:"none",background:P.rose,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ 끼니</button>}
          </div>
        </div>
        {cdl.length>0&&(
          <div style={{padding:"0 14px 6px",display:"flex",gap:6,flexWrap:"wrap"}}>
            {cdl.map(n=>(
              <span key={n} style={{fontSize:11,background:"#F5F3FF",color:"#7C3AED",borderRadius:8,padding:"3px 10px",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                🧊 {n} 큐브 만드는 날
                <span onClick={()=>removeCD(dateStr,n)} style={{cursor:"pointer",color:"#bbb",fontSize:12}}>×</span>
              </span>
            ))}
          </div>
        )}
        {dm.length===0
          ?<div style={{padding:"4px 14px 10px",fontSize:12,color:"#DDD0C8"}}>기록 없음</div>
          :<div style={{padding:"0 10px 10px",display:"flex",flexDirection:"column",gap:6}}>
            {dm.map((meal,idx)=>{
              const mg=meal.items.reduce((s,it)=>s+(Number(it.gram)||0),0);
              return(
                <div key={idx} style={{background:P.bg,borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8,flex:1,minWidth:0}}>
                    <span style={{flexShrink:0,fontSize:10,fontWeight:700,color:MEAL_COLORS[idx],background:"#fff",border:`1.5px solid ${MEAL_COLORS[idx]}`,borderRadius:8,padding:"2px 6px",marginTop:1}}>{MEAL_LABELS[idx]}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:P.text,lineHeight:1.7,wordBreak:"break-all"}}>
                        {meal.items.map((it,i)=>(
                          <span key={i}>{it.name} <b style={{color:MEAL_COLORS[idx]}}>{it.gram}g</b>{i<meal.items.length-1?" · ":""}</span>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:P.textSub,marginTop:1}}>합계 {mg}g</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button onClick={()=>openEditMeal(dateStr,idx)} style={sBtn(P.rosePale,P.roseDark)}>수정</button>
                    <button onClick={()=>deleteMeal(dateStr,idx)} style={sBtn("#FFEBEE","#C62828")}>삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    );
  };

  // ════════════════════════════════════════════════
  // ── 전체화면 페이지들 ──
  // ════════════════════════════════════════════════

  // 프로필 설정 페이지
  if(page==="profile") return(
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <FullPage title="아기 프로필 설정" onClose={()=>setPage("main")}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginBottom:28}}>
          <div onClick={()=>photoInputRef.current?.click()} style={{width:90,height:90,borderRadius:"50%",overflow:"hidden",border:`3px solid ${P.rose}`,cursor:"pointer",background:P.rosePale,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {profileDraft.photo?<img src={profileDraft.photo} alt="미리보기" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<BabyIllust size={90}/>}
          </div>
          <button onClick={()=>photoInputRef.current?.click()} style={{fontSize:13,padding:"6px 18px",borderRadius:10,border:`1px solid ${P.border}`,background:P.surface,color:P.roseDark,cursor:"pointer"}}>📷 사진 선택</button>
          <input ref={photoInputRef} type="file" accept="image/*" onChange={e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setProfileDraft(d=>({...d,photo:ev.target.result})); r.readAsDataURL(f); }} style={{display:"none"}}/>
        </div>
        <label style={labelSt}>아기 이름</label>
        <input value={profileDraft.name} onChange={e=>setProfileDraft(d=>({...d,name:e.target.value}))} placeholder="예: 지우, 민준" style={{...inputSt,width:"100%",marginBottom:24}}/>
        <button onClick={saveProfile} style={{...saveSt,background:P.rose}}>저장하기</button>
      </FullPage>
      <style>{fontImport}</style>
    </div>
  );

  // 끼니 추가/수정 페이지
  if(page==="meal") return(
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <FullPage title={editMealIdx!==null?`${MEAL_LABELS[editMealIdx]} 수정`:`${MEAL_LABELS[dayMeals(mealDate).length]} 추가`} subtitle={mealDate.replace(/-/g,".")} onClose={()=>setPage("main")}>
        {mealForm.items.map((it,i)=>(
          <div key={i} style={{marginBottom:10}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:3,position:"relative",minWidth:0}}>
                <input
                  value={it.name}
                  onChange={e=>updateMI(i,"name",e.target.value)}
                  onFocus={()=>{ setActiveII(i); setSugg(cubes.map(c=>c.name)); }}
                  onBlur={()=>setTimeout(()=>setSugg([]),150)}
                  placeholder="재료명"
                  style={{...inputSt,width:"100%"}}
                />
                {activeII===i&&sugg.length>0&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:P.surface,border:`1.5px solid ${P.rose}`,borderRadius:12,zIndex:10,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",maxHeight:180,overflowY:"auto"}}>
                    {sugg.map(n=>(
                      <div key={n} onMouseDown={()=>pickSugg(n)} onTouchEnd={e=>{ e.preventDefault(); pickSugg(n); }} style={{padding:"12px 16px",fontSize:14,color:P.text,cursor:"pointer",borderBottom:`1px solid ${P.bg}`}}>{n}</div>
                    ))}
                  </div>
                )}
              </div>
              <input value={it.gram} onChange={e=>updateMI(i,"gram",e.target.value)} placeholder="g" inputMode="numeric" pattern="[0-9]*" style={{...inputSt,width:64,flexShrink:0,textAlign:"center"}}/>
              {mealForm.items.length>1&&<button onClick={()=>removeMealItem(i)} style={{width:32,height:32,borderRadius:8,border:"none",background:"#FFEBEE",color:"#C62828",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0}}>×</button>}
            </div>
          </div>
        ))}
        <button onClick={addMealItem} style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px dashed ${P.rose}`,background:"transparent",color:P.rose,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:20,marginTop:4}}>+ 재료 추가</button>
        <button onClick={saveMeal} style={{...saveSt,background:P.rose}}>저장하기</button>
      </FullPage>
      <style>{fontImport}</style>
    </div>
  );

  // 큐브 만드는 날 페이지
  if(page==="cubeday") return(
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <FullPage title="🧊 큐브 만드는 날" subtitle={cdDate.replace(/-/g,".")} onClose={()=>setPage("main")}>
        {cdList(cdDate).length>0&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {cdList(cdDate).map(n=>(
              <span key={n} style={{fontSize:13,background:"#F5F3FF",color:"#7C3AED",borderRadius:10,padding:"6px 14px",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                🧊 {n}
                <span onClick={()=>removeCD(cdDate,n)} style={{cursor:"pointer",color:"#bbb",fontSize:16}}>×</span>
              </span>
            ))}
          </div>
        )}
        <div style={{position:"relative",marginBottom:16}}>
          <div style={{display:"flex",gap:8}}>
            <input
              value={cdInput}
              onChange={e=>{ setCdInput(e.target.value); const q=e.target.value.toLowerCase(); setCdSugg(q?cubes.map(c=>c.name).filter(n=>n.toLowerCase().includes(q)):cubes.map(c=>c.name)); }}
              onFocus={()=>setCdSugg(cubes.map(c=>c.name))}
              onBlur={()=>setTimeout(()=>setCdSugg([]),150)}
              placeholder="재료명 입력 또는 선택"
              style={{...inputSt,flex:1}}
              onKeyDown={e=>e.key==="Enter"&&addCD()}
            />
            <button onClick={addCD} style={{padding:"0 18px",borderRadius:12,border:"none",background:"#8B5CF6",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>추가</button>
          </div>
          {cdSugg.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:P.surface,border:"1.5px solid #8B5CF6",borderRadius:12,zIndex:10,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",maxHeight:200,overflowY:"auto"}}>
              {cdSugg.map(n=>(
                <div key={n} onMouseDown={()=>{ setCdInput(n); setCdSugg([]); }} onTouchEnd={e=>{ e.preventDefault(); setCdInput(n); setCdSugg([]); }} style={{padding:"12px 16px",fontSize:14,color:P.text,cursor:"pointer",borderBottom:`1px solid ${P.bg}`}}>🧊 {n}</div>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>setPage("main")} style={{...saveSt,background:"#8B5CF6"}}>완료</button>
      </FullPage>
      <style>{fontImport}</style>
    </div>
  );

  // 큐브 재고 추가/수정 페이지
  if(page==="cubeform") return(
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <FullPage title={editCube?"큐브 수정":"새 큐브 추가"} onClose={()=>setPage("main")}>
        <label style={labelSt}>재료 이름 *</label>
        <input value={cubeForm.name} onChange={e=>setCubeForm({...cubeForm,name:e.target.value})} placeholder="예: 당근, 소고기" style={{...inputSt,width:"100%",marginBottom:16}}/>
        <label style={labelSt}>카테고리</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setCubeForm({...cubeForm,category:c.id})} style={{padding:"7px 14px",borderRadius:10,border:"none",background:cubeForm.category===c.id?c.color:P.rosePale,color:cubeForm.category===c.id?"#fff":P.roseDark,fontSize:12,fontWeight:600,cursor:"pointer"}}>{c.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:14,marginBottom:16}}>
          <div style={{flex:1}}>
            <label style={labelSt}>큐브 개수</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>setCubeForm({...cubeForm,count:Math.max(0,cubeForm.count-1)})} style={{width:38,height:38,borderRadius:10,border:"none",background:P.rosePale,fontSize:20,fontWeight:700,cursor:"pointer",color:P.roseDark}}>−</button>
              <input type="number" inputMode="numeric" value={cubeForm.count} onChange={e=>setCubeForm({...cubeForm,count:Number(e.target.value)})} style={{width:56,textAlign:"center",padding:"8px 4px",borderRadius:10,border:`1.5px solid ${P.border}`,fontSize:16,fontWeight:700,outline:"none"}}/>
              <button onClick={()=>setCubeForm({...cubeForm,count:cubeForm.count+1})} style={{width:38,height:38,borderRadius:10,border:"none",background:P.rose,fontSize:20,fontWeight:700,cursor:"pointer",color:"#fff"}}>+</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <label style={labelSt}>제조일</label>
            <input type="date" value={cubeForm.made} onChange={e=>setCubeForm({...cubeForm,made:e.target.value})} style={{...inputSt,width:"100%"}}/>
            <div style={{fontSize:11,color:P.textSub,marginTop:5}}>유효기간: <span style={{color:P.rose,fontWeight:700}}>{addDays(cubeForm.made,VALIDITY_DAYS)}</span></div>
          </div>
        </div>
        <label style={labelSt}>메모 (선택)</label>
        <input value={cubeForm.note} onChange={e=>setCubeForm({...cubeForm,note:e.target.value})} placeholder="알레르기, 아기 반응 등" style={{...inputSt,width:"100%",marginBottom:24}}/>
        <button onClick={saveCube} style={{...saveSt,background:P.rose}}>{editCube?"수정 완료":"추가하기"}</button>
      </FullPage>
      <style>{fontImport}</style>
    </div>
  );

  // ════════════════════════════════════════════════
  // ── 메인 화면 ──
  // ════════════════════════════════════════════════
  return(
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:80}}>

      {/* 헤더 */}
      <div style={{background:P.bg,borderBottom:`1px solid ${P.border}`,padding:"16px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div onClick={openProfile} style={{width:54,height:54,borderRadius:"50%",overflow:"hidden",border:`2.5px solid ${P.rose}`,flexShrink:0,cursor:"pointer",background:P.rosePale,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {babyPhoto?<img src={babyPhoto} alt="아기" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<BabyIllust size={54}/>}
          </div>
          <div style={{flex:1}}>
            <div style={{color:P.rose,fontSize:10,fontWeight:700,letterSpacing:".06em"}}>BABY DIARY</div>
            <div style={{color:P.text,fontSize:17,fontWeight:900,marginTop:1,lineHeight:1.2}}>{babyName?`${babyName} 이유식 다이어리`:"이유식 다이어리"}</div>
            <div style={{color:P.textSub,fontSize:10,marginTop:2}}>{today.replace(/-/g,".")} · 우리 아기 식단 기록</div>
          </div>
          <button onClick={openProfile} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${P.border}`,background:P.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2" stroke={P.roseDark} strokeWidth="1.2"/>
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.4 2.4l1.1 1.1M10.5 10.5l1.1 1.1M11.6 2.4l-1.1 1.1M3.5 10.5l-1.1 1.1" stroke={P.roseDark} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[{id:"cube",label:"📦 큐브 재고"},{id:"diet",label:"🗓 식단표"}].map(t=>(
            <button key={t.id} onClick={()=>setMainTab(t.id)} style={{flex:1,padding:"9px 0",fontSize:13,fontWeight:mainTab===t.id?700:500,color:mainTab===t.id?"#fff":P.roseDark,background:mainTab===t.id?P.rose:P.rosePale,border:"none",borderRadius:mainTab===t.id?"10px 10px 0 0":10,cursor:"pointer",transition:"all 0.2s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 식단표 */}
      {mainTab==="diet"&&(
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 155px)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"10px 16px 4px",gap:6}}>
            <span style={{fontSize:12,color:P.textSub,marginRight:4}}>보기</span>
            {[{id:"week",label:"주간"},{id:"month",label:"월간"}].map(v=>(
              <button key={v.id} onClick={()=>setDietView(v.id)} style={{padding:"5px 14px",borderRadius:20,border:"none",background:dietView===v.id?P.rose:P.rosePale,color:dietView===v.id?"#fff":P.roseDark,fontSize:12,fontWeight:700,cursor:"pointer"}}>{v.label}</button>
            ))}
          </div>
          {dietView==="week"&&(
            <div ref={scrollRef} style={{overflowY:"auto",flex:1,paddingTop:4}}>
              {allWeekStarts().map(ws=>{
                const dates=weekDates(ws),isCW=ws===todayWS;
                return(
                  <div key={ws} ref={el=>{if(el)weekRefs.current[ws]=el;}}>
                    <div style={{display:"flex",alignItems:"center",padding:"12px 16px 6px",position:"sticky",top:0,background:P.bg,zIndex:5}}>
                      <div style={{fontSize:12,fontWeight:700,color:isCW?P.rose:P.textSub,background:isCW?"#FFF0EB":"transparent",padding:"3px 12px",borderRadius:20,border:isCW?`1.5px solid ${P.rose}`:`1.5px solid ${P.border}`}}>
                        {isCW?"✨ 이번 주":`${dates[0].slice(5).replace("-","/")} ~ ${dates[6].slice(5).replace("-","/")} `}
                      </div>
                    </div>
                    {dates.map(d=>renderDayCard(d,false))}
                  </div>
                );
              })}
            </div>
          )}
          {dietView==="month"&&(
            <div style={{overflowY:"auto",flex:1,padding:"0 12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 4px 8px"}}>
                <button onClick={prevMonth} style={navBtn}>‹</button>
                <span style={{fontWeight:700,fontSize:15,color:P.text}}>{calYear}년 {calMonth+1}월</span>
                <button onClick={nextMonth} style={navBtn}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",textAlign:"center",marginBottom:4}}>
                {DAYS_KO.map((d,i)=><div key={d} style={{fontSize:11,fontWeight:700,color:i===0?"#E53935":i===6?"#3B82F6":P.textSub,padding:"4px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
                {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                {Array(daysInMonth).fill(null).map((_,i)=>renderDayCard(mkKey(calYear,calMonth,i+1),true))}
              </div>
              <div style={{background:P.surface,borderRadius:16,padding:"14px",boxShadow:"0 2px 10px rgba(196,112,80,0.08)",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14,fontWeight:700,color:P.text}}>{selDate.replace(/-/g,".")} 상세</span>
                    {totalGram(selDate)>0&&<span style={{fontSize:11,color:P.rose,fontWeight:700,background:"#FFF0EB",padding:"2px 8px",borderRadius:10}}>총 {totalGram(selDate)}g</span>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openCubeDay(selDate)} style={{padding:"5px 10px",borderRadius:10,border:"1.5px solid #8B5CF6",background:"#F5F3FF",color:"#8B5CF6",fontSize:11,fontWeight:700,cursor:"pointer"}}>🧊 큐브</button>
                    {dayMeals(selDate).length<3&&<button onClick={()=>openAddMeal(selDate)} style={{padding:"5px 10px",borderRadius:10,border:"none",background:P.rose,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ 끼니</button>}
                  </div>
                </div>
                {cdList(selDate).length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{cdList(selDate).map(n=><span key={n} style={{fontSize:11,background:"#F5F3FF",color:"#7C3AED",borderRadius:8,padding:"3px 10px",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>🧊 {n} 큐브 만드는 날<span onClick={()=>removeCD(selDate,n)} style={{cursor:"pointer",color:"#bbb",fontSize:12}}>×</span></span>)}</div>}
                {dayMeals(selDate).length===0&&cdList(selDate).length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#DDD0C8",fontSize:13}}>기록이 없어요</div>}
                {dayMeals(selDate).map((meal,idx)=>{
                  const mg=meal.items.reduce((s,it)=>s+(Number(it.gram)||0),0);
                  return(
                    <div key={idx} style={{background:P.bg,borderRadius:12,padding:"8px 12px",marginBottom:6,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,flex:1,minWidth:0}}>
                        <span style={{flexShrink:0,fontSize:10,fontWeight:700,color:MEAL_COLORS[idx],background:"#fff",border:`1.5px solid ${MEAL_COLORS[idx]}`,borderRadius:8,padding:"2px 6px",marginTop:1}}>{MEAL_LABELS[idx]}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,color:P.text,lineHeight:1.7,wordBreak:"break-all"}}>{meal.items.map((it,i)=><span key={i}>{it.name} <b style={{color:MEAL_COLORS[idx]}}>{it.gram}g</b>{i<meal.items.length-1?" · ":""}</span>)}</div>
                          <div style={{fontSize:11,color:P.textSub,marginTop:1}}>합계 {mg}g</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        <button onClick={()=>openEditMeal(selDate,idx)} style={sBtn(P.rosePale,P.roseDark)}>수정</button>
                        <button onClick={()=>deleteMeal(selDate,idx)} style={sBtn("#FFEBEE","#C62828")}>삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 큐브 재고 */}
      {mainTab==="cube"&&(
        <div>
          <div style={{display:"flex",background:P.surface,borderBottom:`1px solid ${P.border}`}}>
            {[{id:"stock",label:"📋 재고 현황"},{id:"alert",label:`⚠️ 부족 알림${lowCubes.length>0?` (${lowCubes.length})`:""}`}].map(t=>(
              <button key={t.id} onClick={()=>setCubeTab(t.id)} style={{flex:1,padding:"12px 0",fontSize:13,fontWeight:cubeTab===t.id?700:500,color:cubeTab===t.id?P.rose:P.textSub,border:"none",background:"none",borderBottom:cubeTab===t.id?`3px solid ${P.rose}`:"3px solid transparent",cursor:"pointer"}}>
                {t.label}
              </button>
            ))}
          </div>
          {cubeTab==="stock"&&(
            <div style={{padding:"14px 14px 0"}}>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none"}}>
                <button onClick={()=>setFilterCat("all")} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"none",background:filterCat==="all"?P.rose:P.rosePale,color:filterCat==="all"?"#fff":P.roseDark,fontSize:12,fontWeight:600,cursor:"pointer"}}>전체</button>
                {CATEGORIES.map(c=><button key={c.id} onClick={()=>setFilterCat(c.id)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"none",background:filterCat===c.id?c.color:P.rosePale,color:filterCat===c.id?"#fff":P.roseDark,fontSize:12,fontWeight:600,cursor:"pointer"}}>{c.label}</button>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:6}}>
                {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:P.textSub}}><div style={{fontSize:32}}>📭</div><div style={{fontSize:13,marginTop:6}}>등록된 재고가 없어요</div></div>}
                {filtered.map(item=>{
                  const cat=getCat(item.category),isLow=item.count<=LOW_STOCK;
                  const exp=addDays(item.made,VALIDITY_DAYS),expired=isExpired(item.made),soon=isExpiringSoon(item.made);
                  return(
                    <div key={item.id} style={{background:P.surface,borderRadius:16,padding:"14px 16px",boxShadow:"0 1px 6px rgba(196,112,80,0.07)",border:expired?`2px solid #E53935`:isLow?`2px solid #FFB347`:`1px solid ${P.border}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{background:cat.bg,color:cat.color,borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:700}}>{cat.label}</div>
                          <span style={{fontSize:15,fontWeight:800,color:P.text}}>{item.name}</span>
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                          {expired&&<span style={{fontSize:10,background:"#FFEBEE",color:"#C62828",borderRadius:8,padding:"2px 8px",fontWeight:700}}>만료</span>}
                          {!expired&&soon&&<span style={{fontSize:10,background:"#FFF3CD",color:"#E65100",borderRadius:8,padding:"2px 8px",fontWeight:700}}>곧 만료</span>}
                          {isLow&&!expired&&<span style={{fontSize:10,background:"#FFF9C4",color:"#F57F17",borderRadius:8,padding:"2px 8px",fontWeight:700}}>재고부족</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:10,marginTop:7}}>
                        <div style={{fontSize:10,color:P.textSub}}>📅 제조 <span style={{color:P.text}}>{item.made}</span></div>
                        <div style={{fontSize:10,color:expired?"#E53935":soon?"#E65100":P.textSub}}>⏰ 유효 <span style={{fontWeight:700}}>{exp}</span></div>
                      </div>
                      {item.note&&<div style={{marginTop:7,fontSize:11,color:P.textSub,background:P.bg,borderRadius:8,padding:"5px 10px"}}>📝 {item.note}</div>}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <button onClick={()=>changeCount(item.id,-1)} style={{width:32,height:32,borderRadius:10,border:"none",background:P.rosePale,fontSize:18,fontWeight:700,cursor:"pointer",color:P.roseDark}}>−</button>
                          <div><span style={{fontSize:24,fontWeight:900,color:isLow?P.rose:P.text}}>{item.count}</span><span style={{fontSize:11,color:P.textSub,marginLeft:2}}>개</span></div>
                          <button onClick={()=>changeCount(item.id,1)} style={{width:32,height:32,borderRadius:10,border:"none",background:P.rose,fontSize:18,fontWeight:700,cursor:"pointer",color:"#fff"}}>+</button>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>openEditCube(item)} style={sBtn(P.rosePale,P.roseDark)}>수정</button>
                          <button onClick={()=>deleteCube(item.id)} style={sBtn("#FFEBEE","#C62828")}>삭제</button>
                        </div>
                      </div>
                      <div style={{marginTop:10,background:P.rosePale,borderRadius:4,height:4}}>
                        <div style={{width:`${Math.min(100,(item.count/15)*100)}%`,height:4,borderRadius:4,background:isLow?"#FFB347":P.rose,transition:"width 0.3s"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {cubeTab==="alert"&&(
            <div style={{padding:14}}>
              {lowCubes.length===0
                ?<div style={{textAlign:"center",padding:"60px 0",color:P.textSub}}><div style={{fontSize:44}}>✅</div><div style={{fontSize:14,fontWeight:700,color:P.text,marginTop:10}}>부족한 재료가 없어요!</div></div>
                :<>
                  <div style={{background:"#FFF3CD",borderRadius:14,padding:"12px 16px",marginBottom:12,border:"1px solid #FFE082"}}>
                    <div style={{fontWeight:700,color:"#E65100",fontSize:13}}>⚠️ 재고 {LOW_STOCK}개 이하 재료</div>
                    <div style={{fontSize:11,color:"#A05000",marginTop:3}}>빠른 시일 내에 큐브를 만들어주세요!</div>
                  </div>
                  {lowCubes.map(item=>{
                    const cat=getCat(item.category);
                    return(
                      <div key={item.id} style={{background:P.surface,borderRadius:14,padding:"14px 16px",marginBottom:8,border:"2px solid #FFB347",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{background:cat.bg,color:cat.color,borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:700}}>{cat.label}</div>
                          <span style={{fontSize:14,fontWeight:800,color:P.text}}>{item.name}</span>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <span style={{fontSize:20,fontWeight:900,color:item.count===0?"#E53935":P.rose}}>{item.count}</span>
                          <span style={{fontSize:11,color:P.textSub}}>개</span>
                          {item.count===0&&<div style={{fontSize:10,color:"#E53935",fontWeight:700}}>품절!</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
              }
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {mainTab==="cube"&&cubeTab==="stock"&&(
        <button onClick={openAddCube} style={{position:"fixed",bottom:24,right:24,width:54,height:54,borderRadius:"50%",background:P.rose,border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 4px 16px rgba(232,165,152,0.5)",zIndex:100}}>+</button>
      )}

      <style>{fontImport}</style>
    </div>
  );
}

const sBtn=(bg,color)=>({padding:"6px 10px",borderRadius:10,border:"none",background:bg,fontSize:11,color,cursor:"pointer",fontWeight:600,flexShrink:0});
const navBtn={width:34,height:34,borderRadius:10,border:`1px solid #F0E6DC`,background:"#fff",color:"#C08070",fontSize:18,fontWeight:700,cursor:"pointer"};
const inputSt={padding:"12px 14px",borderRadius:12,border:"1.5px solid #F0E6DC",fontSize:16,outline:"none",display:"block",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
const labelSt={fontSize:12,fontWeight:700,color:"#C08070",display:"block",marginBottom:6};
const saveSt={width:"100%",padding:"16px",borderRadius:14,border:"none",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"};
const fontImport=`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap');
  * { box-sizing: border-box; }
  /* iOS 자동 zoom 방지 */
  input, select, textarea { font-size: 16px !important; }
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
  ::-webkit-scrollbar { display: none; }
`;
