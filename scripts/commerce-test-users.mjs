// Disposable integration fixtures only. Never run against a production project.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { commerceEnv } from "./commerce-env.mjs";
const env=await commerceEnv();
const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:catalog,error}=await client.rpc("store_catalog");
if(error||!catalog?.testMode||env.STORE_MODE!=="test")throw new Error("Fixtures permitidas somente no projeto de validação com ambas as marcações de teste.");
if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error("Chave de administração de teste não configurada.");
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const file=new URL("../.commerce-test-users.json",import.meta.url);
let users=[];try{users=JSON.parse(await fs.readFile(file,"utf8"));}catch{}
for(const role of ["customer","staff","owner"]){
 if(users.some(u=>u.role===role))continue;
 const email=`zxxr-${role}-${crypto.randomUUID().slice(0,8)}@example.com`;const password=crypto.randomBytes(24).toString("base64url")+"aA9!";
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{test_fixture:true}});
 if(error)throw new Error(`Não foi possível criar a fixture ${role}: ${error.code||"auth_error"}`);
 users.push({role,id:data.user.id,email,password});await fs.writeFile(file,JSON.stringify(users,null,2));
}
const sql=["begin;","do $$ begin if not (select test_mode from public.store_settings) then raise exception 'Somente validação'; end if; end $$;",...users.filter(u=>u.role!=="customer").map(u=>`insert into public.staff_access(user_id,role,active) values('${u.id}','${u.role}',true) on conflict(user_id) do update set role=excluded.role,active=true;`),"update public.store_settings set open=true where test_mode;","commit;"].join("\n");
await fs.writeFile(new URL("../.commerce-test-roles.sql",import.meta.url),sql);
console.log(JSON.stringify({fixtures:users.map(u=>({role:u.role,id:u.id})),roleScript:".commerce-test-roles.sql",noEmailSent:true}));
