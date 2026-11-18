import { Hono } from "hono";
import { type AppEnv, err, readBody } from "./app";
import { isOwner } from "../env";
import { PRESET_IDS } from "../../shared/brand";

export const v5 = new Hono<AppEnv>();
const now = () => Math.floor(Date.now() / 1000);
const userId = (c: any) => Number(c.get("user").id);
const validHex = (v: unknown) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

v5.get("/preferences", async (c) => {
  const id = userId(c);
  const row = await c.env.DB.prepare("SELECT * FROM user_preferences WHERE user_id=?1").bind(id).first();
  return c.json(row ?? { user_id:id, theme_id:"cobalt", color_mode:"system", accent_color:null, background_color:null, font_family:"system", corner_radius:"rounded", layout_json:"{}" });
});
v5.put("/preferences", async (c) => {
  const b = await readBody<{themeId?:string;colorMode?:string;accentColor?:string|null;backgroundColor?:string|null;fontFamily?:string;cornerRadius?:string;layout?:unknown}>(c);
  if (!b) return err(c,400,"INVALID_BODY");
  const theme = String(b.themeId ?? "cobalt");
  const mode = String(b.colorMode ?? "system");
  if (!PRESET_IDS.has(theme) || !["light","dark","system"].includes(mode)) return err(c,400,"INVALID_PREFERENCE");
  if (b.accentColor != null && !validHex(b.accentColor)) return err(c,400,"INVALID_ACCENT");
  if (b.backgroundColor != null && !validHex(b.backgroundColor)) return err(c,400,"INVALID_BACKGROUND");
  const font = String(b.fontFamily ?? "system");
  const radius = String(b.cornerRadius ?? "rounded");
  if (!["system","inter","roboto","nunito","poppins"].includes(font) || !["sharp","rounded","pill"].includes(radius)) return err(c,400,"INVALID_STYLE");
  const layout = JSON.stringify(b.layout ?? {}).slice(0,4000);
  await c.env.DB.prepare(`INSERT INTO user_preferences(user_id,theme_id,color_mode,accent_color,background_color,font_family,corner_radius,layout_json,updated_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)
    ON CONFLICT(user_id) DO UPDATE SET theme_id=excluded.theme_id,color_mode=excluded.color_mode,accent_color=excluded.accent_color,
    background_color=excluded.background_color,font_family=excluded.font_family,corner_radius=excluded.corner_radius,layout_json=excluded.layout_json,updated_at=excluded.updated_at`)
    .bind(userId(c),theme,mode,b.accentColor ?? null,b.backgroundColor ?? null,font,radius,layout,now()).run();
  return c.json({ok:true});
});

v5.get("/vip", async (c) => {
  const id=userId(c);
  const levels=(await c.env.DB.prepare("SELECT id,name,min_spend,discount_pct,sort_order FROM vip_levels WHERE enabled=1 ORDER BY min_spend,id").all()).results;
  const spend=await c.env.DB.prepare("SELECT COALESCE(SUM(charge-refund),0) AS total FROM orders WHERE user_id=?1 AND status!='failed'").bind(id).first<{total:number}>();
  const membership=await c.env.DB.prepare("SELECT m.manual_level_id,l.name,l.discount_pct FROM user_memberships m LEFT JOIN vip_levels l ON l.id=m.manual_level_id WHERE m.user_id=?1").bind(id).first<{manual_level_id:number|null;name:string|null;discount_pct:number|null}>();
  const total=Number(spend?.total??0);
  const earned=[...(levels as any[])].filter(x=>Number(x.min_spend)<=total).at(-1) ?? null;
  const current=membership?.manual_level_id ? (levels as any[]).find(x=>x.id===membership!.manual_level_id) : earned;
  const next=(levels as any[]).find(x=>Number(x.min_spend)>total) ?? null;
  return c.json({spend:total,current,next,levels,progress:next?Math.max(0,Math.min(100,(total-Number(current?.min_spend??0))/(Number(next.min_spend)-Number(current?.min_spend??0))*100)):100});
});

v5.get("/coupons/:code", async (c) => {
  const code=String(c.req.param("code")??"").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return err(c,400,"INVALID_COUPON");
  const id=userId(c), t=now();
  const coupon=await c.env.DB.prepare("SELECT * FROM coupons WHERE code=?1 COLLATE NOCASE AND enabled=1").bind(code).first<any>();
  if (!coupon || (coupon.starts_at && coupon.starts_at>t) || (coupon.ends_at && coupon.ends_at<t)) return err(c,404,"COUPON_UNAVAILABLE");
  const [all,user,orders]=await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM coupon_redemptions WHERE coupon_id=?1").bind(coupon.id),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM coupon_redemptions WHERE coupon_id=?1 AND user_id=?2").bind(coupon.id,id),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id=?1").bind(id)
  ]);
  if (coupon.max_redemptions!=null && Number((all.results[0] as any).n)>=coupon.max_redemptions) return err(c,409,"COUPON_LIMIT");
  if (Number((user.results[0] as any).n)>=coupon.per_user_limit) return err(c,409,"COUPON_ALREADY_USED");
  if (coupon.first_order_only && Number((orders.results[0] as any).n)>0) return err(c,409,"FIRST_ORDER_ONLY");
  return c.json({valid:true,code:coupon.code,type:coupon.discount_type,value:coupon.discount_value});
});

v5.get("/tickets", async (c) => {
  const rows=await c.env.DB.prepare("SELECT id,subject,category,priority,status,created_at,updated_at FROM support_tickets WHERE user_id=?1 ORDER BY updated_at DESC LIMIT 100").bind(userId(c)).all();
  return c.json(rows.results);
});
v5.post("/tickets", async (c) => {
  const b=await readBody<{subject?:string;category?:string;body?:string}>(c);
  if (!b || typeof b.subject!=="string" || typeof b.body!=="string" || b.subject.trim().length<3 || b.subject.length>120 || b.body.trim().length<1 || b.body.length>4000) return err(c,400,"INVALID_TICKET");
  const t=now(), id=userId(c);
  const r=await c.env.DB.prepare("INSERT INTO support_tickets(user_id,subject,category,created_at,updated_at) VALUES(?1,?2,?3,?4,?4)").bind(id,b.subject.trim(),String(b.category??"general").slice(0,40),t).run();
  const ticket=Number(r.meta.last_row_id);
  await c.env.DB.prepare("INSERT INTO ticket_messages(ticket_id,sender_id,sender_role,body,created_at) VALUES(?1,?2,'customer',?3,?4)").bind(ticket,id,b.body.trim(),t).run();
  return c.json({id:ticket},201);
});
v5.get("/tickets/:id", async (c) => {
  const id=Number(c.req.param("id"));
  const ticket=await c.env.DB.prepare("SELECT * FROM support_tickets WHERE id=?1 AND user_id=?2").bind(id,userId(c)).first();
  if (!ticket) return err(c,404,"TICKET_NOT_FOUND");
  const messages=await c.env.DB.prepare("SELECT sender_role,body,created_at FROM ticket_messages WHERE ticket_id=?1 ORDER BY id").bind(id).all();
  return c.json({ticket,messages:messages.results});
});
v5.post("/tickets/:id/reply", async (c) => {
  const id=Number(c.req.param("id")), uid=userId(c);
  const b=await readBody<{body?:string}>(c);
  if (!b || typeof b.body!=="string" || !b.body.trim() || b.body.length>4000) return err(c,400,"INVALID_MESSAGE");
  const ticket=await c.env.DB.prepare("SELECT status FROM support_tickets WHERE id=?1 AND user_id=?2").bind(id,uid).first<{status:string}>();
  if (!ticket) return err(c,404,"TICKET_NOT_FOUND");
  if (ticket.status==="closed") return err(c,409,"TICKET_CLOSED");
  const t=now();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO ticket_messages(ticket_id,sender_id,sender_role,body,created_at) VALUES(?1,?2,'customer',?3,?4)").bind(id,uid,b.body.trim(),t),
    c.env.DB.prepare("UPDATE support_tickets SET status='open',updated_at=?2 WHERE id=?1").bind(id,t)
  ]);
  return c.json({ok:true});
});

v5.get("/promotions", async (c) => {
  const t=now();
  const rows=await c.env.DB.prepare(`SELECT p.*, EXISTS(SELECT 1 FROM promotion_claims pc WHERE pc.promotion_id=p.id AND pc.user_id=?1) AS claimed
    FROM promotions p WHERE p.enabled=1 AND (p.starts_at IS NULL OR p.starts_at<=?2) AND (p.ends_at IS NULL OR p.ends_at>=?2) ORDER BY p.id DESC`).bind(userId(c),t).all();
  return c.json(rows.results);
});
v5.post("/promotions/:id/claim", async (c) => {
  const id=Number(c.req.param("id")), uid=userId(c), t=now();
  const b=await readBody<{proof?:string}>(c);
  const p=await c.env.DB.prepare("SELECT * FROM promotions WHERE id=?1 AND enabled=1 AND (starts_at IS NULL OR starts_at<=?2) AND (ends_at IS NULL OR ends_at>=?2)").bind(id,t).first<any>();
  if (!p) return err(c,404,"PROMOTION_UNAVAILABLE");
  if (p.require_channel) return err(c,409,"CHANNEL_VERIFICATION_REQUIRED");
  try {
    await c.env.DB.prepare("INSERT INTO promotion_claims(promotion_id,user_id,proof,status,created_at) VALUES(?1,?2,?3,'pending',?4)").bind(id,uid,String(b?.proof??"").slice(0,1000)||null,t).run();
  } catch { return err(c,409,"ALREADY_CLAIMED"); }
  return c.json({ok:true,status:"pending"});
});

v5.get("/free-services", async (c) => {
  const t=now();
  const rows=await c.env.DB.prepare(`SELECT f.id,f.title,f.service_id,f.daily_limit,f.total_limit,f.claimed_count,
    (SELECT COUNT(*) FROM free_service_claims x WHERE x.campaign_id=f.id AND x.user_id=?1 AND x.claimed_at>=?2) AS claimed_today
    FROM free_service_campaigns f WHERE f.enabled=1 AND (f.starts_at IS NULL OR f.starts_at<=?3) AND (f.ends_at IS NULL OR f.ends_at>=?3) ORDER BY f.id DESC`)
    .bind(userId(c),Math.floor(t/86400)*86400,t).all();
  return c.json(rows.results);
});

v5.get("/loyalty", async (c) => {
  const id=userId(c);
  const account=await c.env.DB.prepare("SELECT points,lifetime_points FROM loyalty_accounts WHERE user_id=?1").bind(id).first() ?? {points:0,lifetime_points:0};
  const history=await c.env.DB.prepare("SELECT points,kind,note,created_at FROM loyalty_transactions WHERE user_id=?1 ORDER BY id DESC LIMIT 30").bind(id).all();
  const cashback=await c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM cashback_transactions WHERE user_id=?1 AND status='credited'").bind(id).first();
  return c.json({account,history:history.results,cashback:cashback?.total??0});
});

// Owner-only administration endpoints. Never expose claim approval or arbitrary balance credit to customers.
v5.use("/admin/*", async (c,next) => {
  if (!isOwner(c.env,c.get("settings"),userId(c))) return err(c,403,"FORBIDDEN");
  await next();
});
v5.get("/admin/tickets", async (c) => c.json((await c.env.DB.prepare("SELECT t.*,u.username,u.first_name FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY CASE t.status WHEN 'open' THEN 0 ELSE 1 END,t.updated_at DESC LIMIT 200").all()).results));
v5.post("/admin/tickets/:id/reply", async (c) => {
  const id=Number(c.req.param("id")), b=await readBody<{body?:string;status?:string;priority?:string;assignedTo?:number|null}>(c);
  if (!b || typeof b.body!=="string" || !b.body.trim() || b.body.length>4000) return err(c,400,"INVALID_MESSAGE");
  const t=now(), status=["open","pending","closed"].includes(String(b.status))?b.status:"pending", priority=["low","normal","high","urgent"].includes(String(b.priority))?b.priority:"normal";
  const ticket=await c.env.DB.prepare("SELECT id FROM support_tickets WHERE id=?1").bind(id).first();
  if (!ticket) return err(c,404,"TICKET_NOT_FOUND");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO ticket_messages(ticket_id,sender_id,sender_role,body,created_at) VALUES(?1,?2,'admin',?3,?4)").bind(id,userId(c),b.body.trim(),t),
    c.env.DB.prepare("UPDATE support_tickets SET status=?2,priority=?3,assigned_to=COALESCE(?4,assigned_to),updated_at=?5 WHERE id=?1").bind(id,status,priority,b.assignedTo??null,t)
  ]);
  return c.json({ok:true});
});
v5.post("/admin/coupons", async (c) => {
  const b=await readBody<{code?:string;type?:string;value?:number;maxRedemptions?:number|null;perUserLimit?:number;firstOrderOnly?:boolean}>(c);
  const code=String(b?.code??"").trim().toUpperCase(), type=String(b?.type??"percent"), value=Number(b?.value);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !["percent","fixed","bonus","free_service"].includes(type) || !Number.isSafeInteger(value) || value<0 || (type==="percent"&&value>100)) return err(c,400,"INVALID_COUPON");
  try {
    await c.env.DB.prepare("INSERT INTO coupons(code,discount_type,discount_value,max_redemptions,per_user_limit,first_order_only,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)")
      .bind(code,type,value,b?.maxRedemptions??null,Math.max(1,Math.min(100,Number(b?.perUserLimit??1))),b?.firstOrderOnly?1:0,now()).run();
  } catch { return err(c,409,"COUPON_EXISTS"); }
  return c.json({ok:true});
});
v5.get("/admin/coupons", async (c) => c.json((await c.env.DB.prepare("SELECT * FROM coupons ORDER BY id DESC").all()).results));
v5.post("/admin/promotions", async (c) => {
  const b=await readBody<{title?:string;description?:string;rewardAmount?:number;rewardType?:string;startsAt?:number|null;endsAt?:number|null;maxClaims?:number|null;requireChannel?:boolean}>(c);
  if (!b || typeof b.title!=="string" || b.title.trim().length<3 || b.title.length>120) return err(c,400,"INVALID_PROMOTION");
  const r=await c.env.DB.prepare("INSERT INTO promotions(title,description,reward_amount,reward_type,starts_at,ends_at,max_claims,require_channel,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)")
    .bind(b.title.trim(),String(b.description??"").slice(0,2000),Math.max(0,Number(b.rewardAmount??0)),String(b.rewardType??"balance"),b.startsAt??null,b.endsAt??null,b.maxClaims??null,b.requireChannel?1:0,now()).run();
  return c.json({id:r.meta.last_row_id},201);
});
v5.get("/admin/promotion-claims", async (c) => c.json((await c.env.DB.prepare("SELECT pc.*,p.title,u.username,u.first_name FROM promotion_claims pc JOIN promotions p ON p.id=pc.promotion_id JOIN users u ON u.id=pc.user_id ORDER BY pc.created_at DESC LIMIT 300").all()).results));
