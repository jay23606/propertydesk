import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMonthEndReminderHandler } from "../_shared/reminder-handler.mjs";

Deno.serve(
  createMonthEndReminderHandler({
    getEnv: (name) => Deno.env.get(name),
    createClient,
  }),
);
