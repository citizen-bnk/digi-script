import { prisma } from "../src/db/prisma.js";
import { seedDemoData } from "../src/modules/demo/demo.seed.js";

/**
 * CLI wrapper. The seed itself lives in src/modules/demo/demo.seed.ts so the
 * API can run it too — see POST /demo/seed, which is how a deployment with
 * no local tooling gets its demo data.
 */
seedDemoData()
  .then((summary) => {
    console.log(`\nSeeded ${summary.district}`);
    console.log(`  Schools:    ${summary.schools.join(", ")}`);
    console.log(`  Learners:   ${summary.learners}`);
    console.log(`  Users:      ${summary.users} (2 per role)`);
    console.log(`  Documents:  ${summary.documents} (through the real categorization pipeline)`);
    console.log(`  Escalations:${summary.escalations} total, ${summary.openEscalations} still open`);
    console.log("\n  Demo mode is on by default, so both apps show a demo section under their");
    console.log("  login form. Sign-in is one click — no password is shown, typed, or sent.");
    console.log("  Set DEMO_MODE=false to hide it entirely.\n");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
