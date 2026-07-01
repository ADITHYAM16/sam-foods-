import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oorfedydkprtxzkqaphp.supabase.co";
// Get this from: Supabase Dashboard → Settings → API → service_role key
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error("Usage: node scripts/setup-users.mjs YOUR_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser(email, password, name, role) {
  console.log(`\nCreating ${role}: ${email}...`);

  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    await supabase.auth.admin.deleteUser(found.id);
    await supabase.from("profiles").delete().eq("id", found.id);
    console.log(`  Deleted existing user`);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) { console.error(`  ERROR:`, error.message); return; }

  console.log(`  Auth user created: ${data.user.id}`);

  // Wait for trigger to auto-create profile, then update role
  await new Promise(r => setTimeout(r, 1500));

  // Update the auto-created profile with correct role
  const { error: ue } = await supabase.from("profiles")
    .update({ name, phone: "08508372430", role })
    .eq("id", data.user.id);

  if (ue) {
    // If update failed, try insert
    const { error: pe } = await supabase.from("profiles").insert({
      id: data.user.id, name, email, phone: "08508372430", role,
    });
    if (pe) console.error(`  Profile error:`, pe.message);
    else console.log(`  Profile inserted with role: ${role} ✓`);
  } else {
    console.log(`  Profile updated with role: ${role} ✓`);
  }
}

async function main() {
  await createUser("sam@gmail.com",   "admin@123", "SAM Admin",       "admin");
  await createUser("agent@gmail.com", "agent@123", "Delivery Agent",  "delivery");

  const { data } = await supabase
    .from("profiles")
    .select("email, role")
    .in("email", ["sam@gmail.com", "agent@gmail.com"]);

  console.log("\n=== Final Verification ===");
  console.table(data);
}

main();
