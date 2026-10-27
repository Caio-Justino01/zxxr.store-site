import fs from "node:fs/promises";
export async function commerceEnv() {
  const env = { ...process.env };
  try { const source = await fs.readFile(new URL("../.dev.vars",import.meta.url),"utf8");
    for(const line of source.split(/\r?\n/)){const match=line.trim().match(/^([A-Z_]+)=(.*)$/);if(match)env[match[1]]=match[2].replace(/^['"]|['"]$/g,"");}
  } catch { /* CI may use only environment variables. */ }
  if(!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no ambiente privado.");
  return env;
}
