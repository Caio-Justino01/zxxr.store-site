import assert from "node:assert/strict";
import test from "node:test";
import { CONSENT_KEY, createConsent, readConsent, writeConsent } from "../src/privacy/consent.ts";
import { analyticsAllowed, analyticsOrderHeaders, publicAnalyticsPath, safeAnalyticsDetail, SESSION_KEY, startAnalytics, stopAnalytics, VISITOR_KEY } from "../src/analytics/client.ts";
import { analyticsBatchSchema } from "../src/analytics/contracts.ts";

test("consent is fail-closed for absent, invalid, old-version or incomplete choices", () => {
  for (const raw of [null, "", "{", "null", "[]", "true", JSON.stringify({version:0,analytics:true,external:true,updatedAt:new Date().toISOString()}), JSON.stringify({version:1,analytics:"true",external:true,updatedAt:new Date().toISOString()})]) assert.equal(readConsent(raw), null);
  const record = createConsent({ analytics: false, external: true }, new Date("2026-10-29T12:00:00Z"));
  assert.deepEqual(readConsent(JSON.stringify(record)), record);
  assert.equal(record.analytics, false, "external authorization must not imply analytics");
});
test("storage failure never grants optional processing", () => {
  assert.equal(writeConsent({setItem(){throw new Error("blocked");}}, { analytics: true, external: true }), null);
  let stored: string | null = null;
  const record = writeConsent({setItem(key,value){ assert.equal(key,CONSENT_KEY); stored=value;}}, {analytics:false,external:false});
  assert.deepEqual(readConsent(stored),record);
});
test("public measurement excludes account details, unknown routes, queries and private identifiers", () => {
  assert.equal(publicAnalyticsPath("/produto/boca"), "/produto/boca");
  assert.equal(publicAnalyticsPath("/espera.html"), "/espera");
  for (const path of ["/conta/pedidos/123", "/painel/analytics", "/api/auth/callback", "/produto/desconhecido", "/encomenda?token=secret", "/recuperar-acesso", "/entrar"]) assert.equal(publicAnalyticsPath(path), null);
  assert.equal(analyticsAllowed("www.zxxr.store",true),true);
  assert.equal(analyticsAllowed("127.0.0.1",true),false);
  assert.equal(analyticsAllowed("preview.zxxr-store.pages.dev",true),false);
  assert.equal(analyticsAllowed("www.zxxr.store",false),false);
  assert.deepEqual(safeAnalyticsDetail({type:"product_click",productId:"boca",section:"hero",source:"hero",email:"private@example.com",name:"Private",user_id:"123"}), {type:"product_click",productId:"boca",section:"hero",source:"hero"});
  assert.equal(safeAnalyticsDetail({type:"email", value:"private@example.com"}),null);
});
test("the real client batch follows the server contract and revocation drops pending events and IDs", async (t) => {
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const setGlobal = (key: string, value: unknown) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{configurable:true,writable:true,value}); };
  const values = new Map<string,string>();
  const storage = {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
  const requests: unknown[] = [];
  t.mock.timers.enable({apis:["setInterval"]});
  setGlobal("localStorage",storage);
  setGlobal("location",new URL("https://www.zxxr.store/produto/boca?utm_source=instagram&utm_campaign=Desejos"));
  setGlobal("innerWidth",390);
  setGlobal("window",globalThis);
  setGlobal("document",Object.assign(new EventTarget(),{visibilityState:"visible",referrer:"https://instagram.com/?private=hidden"}));
  setGlobal("fetch",async (_url:unknown,options:{body:string})=>{requests.push(JSON.parse(options.body));return new Response("{}",{status:202});});
  try {
    assert.deepEqual(analyticsOrderHeaders(),{});
    const tracker = startAnalytics(); assert.ok(tracker);
    tracker.track({type:"product_view",productId:"boca",source:"product"});
    t.mock.timers.tick(3001);
    assert.equal(requests.length,1);
    const result = analyticsBatchSchema.safeParse(requests[0]); assert.equal(result.success,true,result.success?undefined:result.error.message);
    if (result.success) { assert.equal(result.data.referrerHost,"instagram.com"); assert.equal(result.data.events[0].page,"/produto/boca"); assert.equal(result.data.events[0].device,"mobile"); assert.equal(result.data.campaign?.source,"instagram"); }
    tracker.track({type:"add_to_cart",productId:"boca",quantity:1});
    stopAnalytics(true);
    t.mock.timers.tick(120_000);
    assert.equal(requests.length,1,"revocation must discard unsent events and cancel heartbeats");
    assert.equal(values.has(VISITOR_KEY),false); assert.equal(values.has(SESSION_KEY),false); assert.deepEqual(analyticsOrderHeaders(),{});
    const waiting = startAnalytics("/espera"); assert.ok(waiting);
    waiting.track({type:"page_view"});
    waiting.stop();
    assert.equal(requests.length,2,"route cleanup flushes the last click/page instead of dropping it");
    const waitingBatch = analyticsBatchSchema.parse(requests[1]);
    assert.equal(waitingBatch.events[0].page,"/espera","the wait screen must not be mixed with the storefront home");
    const next = startAnalytics(); assert.ok(next);
    assert.equal(next.sessionId,waiting.sessionId,"navigation retains the session");
    next.track({type:"cart_update",items:[{productId:"boca",size:"M",quantity:1},{productId:"flores",size:"G",quantity:1}]});
    next.stop();
    const cartBatch = analyticsBatchSchema.parse(requests[2]);
    assert.deepEqual(cartBatch.events[0].items,[{productId:"boca",size:"M",quantity:1}],"future products must not enter purchase abandonment measurements");
  } finally { stopAnalytics(true); for (const [key,descriptor] of saved) { if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key); } t.mock.timers.reset(); }
});
