/* ============================================================
   Coway Clean — App UI Behaviors (의존성 0)
   <script src="coway-app.js"></script>
   - 모달:   data-cw-modal-open="모달id" / data-cw-modal-close
   - 탭:     .cw-tabs[data-cw-tabs] 내 .cw-tab[data-tab="패널id"] → .cw-tabpanel[id]
   - 드롭다운: .cw-dropdown[data-cw-dropdown] (트리거 클릭 토글)
   - 토스트:  CowayApp.toast("메시지", { type:"success"|"danger", ms:2600 })
   React 등에서는 동일 로직을 컴포넌트로 옮기면 됩니다.
   ============================================================ */
(function (global) {
  // ── Modal ──
  function openModal(id){ const m=document.getElementById(id); if(m) m.classList.add("is-open"); }
  function closeModal(m){ (typeof m==="string"?document.getElementById(m):m)?.classList.remove("is-open"); }

  // ── Toast ──
  function toast(msg, opt={}){
    let wrap=document.querySelector(".cw-toast-wrap");
    if(!wrap){ wrap=document.createElement("div"); wrap.className="cw-toast-wrap"; document.body.appendChild(wrap); }
    const t=document.createElement("div");
    t.className="cw-toast"+(opt.type?` cw-toast--${opt.type}`:"");
    t.textContent=msg; wrap.appendChild(t);
    setTimeout(()=>{ t.style.transition="opacity .3s,transform .3s"; t.style.opacity="0"; t.style.transform="translateY(8px)";
      setTimeout(()=>t.remove(),300); }, opt.ms||2600);
  }

  // ── Tabs ──
  function initTabs(scope=document){
    scope.querySelectorAll("[data-cw-tabs]").forEach(group=>{
      const tabs=group.querySelectorAll(".cw-tab");
      tabs.forEach(tab=>tab.addEventListener("click",()=>{
        tabs.forEach(t=>t.classList.remove("is-active")); tab.classList.add("is-active");
        const target=tab.dataset.tab;
        document.querySelectorAll(".cw-tabpanel").forEach(p=>{ if(p.dataset.group===group.dataset.cwTabs||!group.dataset.cwTabs) p.style.display=(p.id===target?"":"none"); });
      }));
    });
  }

  // ── Dropdown ──
  function initDropdowns(scope=document){
    scope.querySelectorAll("[data-cw-dropdown]").forEach(dd=>{
      const trigger=dd.querySelector("[data-cw-dropdown-trigger]")||dd.firstElementChild;
      trigger?.addEventListener("click",e=>{ e.stopPropagation(); dd.classList.toggle("is-open"); });
    });
    document.addEventListener("click",()=>document.querySelectorAll(".cw-dropdown.is-open").forEach(d=>d.classList.remove("is-open")));
  }

  // ── 전역 바인딩 (선언적) ──
  function bind(){
    document.addEventListener("click",e=>{
      const o=e.target.closest("[data-cw-modal-open]"); if(o) openModal(o.dataset.cwModalOpen);
      const c=e.target.closest("[data-cw-modal-close]"); if(c) closeModal(c.closest(".cw-modal"));
      if(e.target.classList?.contains("cw-modal__backdrop")) e.target.closest(".cw-modal").classList.remove("is-open");
    });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape") document.querySelectorAll(".cw-modal.is-open").forEach(m=>m.classList.remove("is-open")); });
    initTabs(); initDropdowns();
  }

  const API={ openModal, closeModal, toast, initTabs, initDropdowns };
  global.CowayApp=API;
  if(typeof module!=="undefined"&&module.exports) module.exports=API;
  document.addEventListener("DOMContentLoaded",bind);
})(typeof window!=="undefined"?window:this);
