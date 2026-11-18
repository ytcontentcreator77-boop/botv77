import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { THEME_PRESETS } from "../../shared/brand";
import { LargeTitle, List, Row, Screen, Section, toast, errText } from "../ui";

type Data = { vip:any; promotions:any[]; freeServices:any[]; loyalty:any; tickets:any[]; prefs:any };
export function CustomerV5() {
  const [data,setData]=useState<Data|null>(null);
  const [busy,setBusy]=useState(false);
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const [coupon,setCoupon]=useState("");
  const [couponResult,setCouponResult]=useState("");
  const [theme,setTheme]=useState("cobalt");
  const load=async()=>{
    try {
      const [vip,promotions,freeServices,loyalty,tickets,prefs]=await Promise.all([
        api("/v5/vip"),api("/v5/promotions"),api("/v5/free-services"),api("/v5/loyalty"),api("/v5/tickets"),api("/v5/preferences")
      ]);
      setData({vip,promotions,freeServices,loyalty,tickets,prefs});
      setTheme(prefs.theme_id??"cobalt");
    } catch(e) { toast(errText(e),"error"); }
  };
  useEffect(()=>{void load();},[]);
  const saveTheme=async(v:string)=>{
    setTheme(v);
    try { await api("/v5/preferences",{method:"PUT",body:{themeId:v,colorMode:"system"}}); toast("Theme preference saved"); }
    catch(e){toast(errText(e),"error");}
  };
  const checkCoupon=async()=>{
    setCouponResult("");
    try { const r=await api(`/v5/coupons/${encodeURIComponent(coupon.trim())}`); setCouponResult(`Valid coupon: ${r.type} (${r.value})`); }
    catch(e){setCouponResult(errText(e));}
  };
  const createTicket=async()=>{
    if(!subject.trim()||!body.trim()||busy)return;
    setBusy(true);
    try { await api("/v5/tickets",{method:"POST",body:{subject,body}}); setSubject("");setBody("");toast("Support ticket created");await load(); }
    catch(e){toast(errText(e),"error");}
    finally{setBusy(false);}
  };
  return <Screen>
    <LargeTitle title="Your V5 account" sub="Personal settings, rewards and support" />
    <Section header="Personal theme">
      <List>
        <label class="field-label" for="v5-theme">Choose your app theme</label>
        <select id="v5-theme" value={theme} onChange={e=>void saveTheme((e.currentTarget as HTMLSelectElement).value)}>
          {THEME_PRESETS.map(p=><option value={p.id}>{p.label}</option>)}
        </select>
        <p class="muted">Your preference is saved to your account. Applying the selected palette across every screen is part of the remaining visual integration.</p>
      </List>
    </Section>
    <Section header="VIP membership">
      <List>
        <Row title="Current level" value={data?.vip?.current?.name??"Bronze"} />
        <Row title="Eligible spend" value={data?.vip?.spend!=null?`${(data.vip.spend/1000000).toFixed(2)} USD`:"—"} />
        <Row title="Next level" value={data?.vip?.next?.name??"Highest level"} />
        <Row title="Progress" value={`${Math.round(data?.vip?.progress??0)}%`} />
      </List>
    </Section>
    <Section header="Coupons">
      <List>
        <input value={coupon} onInput={e=>setCoupon((e.currentTarget as HTMLInputElement).value)} placeholder="Enter coupon code" />
        <button type="button" class="primary" onClick={()=>void checkCoupon()}>Check coupon</button>
        {couponResult?<p class="muted">{couponResult}</p>:null}
        <p class="muted">This checks eligibility only; coupon discounts are not yet applied at checkout.</p>
      </List>
    </Section>
    <Section header="Promotions">
      <List>
        {(data?.promotions??[]).length ? data!.promotions.map(p=><Row title={p.title} meta={p.description} value={p.claimed?"Claimed":"Available"} />) : <p class="muted">No active promotions right now.</p>}
      </List>
    </Section>
    <Section header="Free services">
      <List>
        {(data?.freeServices??[]).length ? data!.freeServices.map(f=><Row title={f.title} meta={`Daily limit: ${f.daily_limit} · claimed today: ${f.claimed_today}`} />) : <p class="muted">No free-service campaigns are active.</p>}
        <p class="muted">Campaigns are displayed here; provider-backed free-order claiming and budget enforcement still need to be connected.</p>
      </List>
    </Section>
    <Section header="Loyalty and cashback">
      <List>
        <Row title="Available points" value={String(data?.loyalty?.account?.points??0)} />
        <Row title="Lifetime points" value={String(data?.loyalty?.account?.lifetime_points??0)} />
        <Row title="Cashback earned" value={`${((data?.loyalty?.cashback??0)/1000000).toFixed(2)} USD`} />
      </List>
    </Section>
    <Section header="Support tickets">
      <List>
        <input value={subject} onInput={e=>setSubject((e.currentTarget as HTMLInputElement).value)} placeholder="Ticket subject" maxLength={120}/>
        <textarea value={body} onInput={e=>setBody((e.currentTarget as HTMLTextAreaElement).value)} placeholder="Describe your issue" rows={3} maxLength={4000}/>
        <button type="button" class="primary" disabled={busy||!subject.trim()||!body.trim()} onClick={()=>void createTicket()}>{busy?"Sending…":"Create ticket"}</button>
        {(data?.tickets??[]).map(t=><Row title={`#${t.id} · ${t.subject}`} meta={`${t.category} · ${t.status}`} value={t.priority}/>)}
      </List>
    </Section>
  </Screen>;
}
