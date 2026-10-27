import { createClient } from "@supabase/supabase-js";
import { commerceEnv } from "./commerce-env.mjs";
const env=await commerceEnv();
const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.rpc("store_catalog");
if(error){console.error("Catálogo indisponível:",error.code);process.exitCode=1;}else console.log(JSON.stringify({catalog:true,variants:data.variants.length,open:data.open,testMode:data.testMode}));
