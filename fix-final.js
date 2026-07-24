const fs = require('fs');

let file = fs.readFileSync('src/app/api/v1/orders/[id]/delivery/complete/route.ts', 'utf8');

const imports = `import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";`;

file = file.replace(/import { verifyAuth } from "@\/lib\/api\/verifyAuth";/, `import { verifyAuth } from "@/lib/api/verifyAuth";\n${imports}`);

const logic = `    const { id: orderId } = await params;

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }`;

file = file.replace(/    const \{ id: orderId \} = await params;/, logic);

const returnLogic = `      return { success: true };
    });

    if (!result.success) {
      if ((result.remainingAttempts || 0) <= 0) {
        const errorRes = { error: "Maximum attempts reached. Order locked. Contact support." };
        await storeIdempotencyResult(idempotencyKey, user.uid, errorRes);
        return NextResponse.json(errorRes, { status: 429 });
      }
      const errorRes = { error: \`Incorrect PIN. \${result.remainingAttempts} attempts remaining.\` };
      await storeIdempotencyResult(idempotencyKey, user.uid, errorRes);
      return NextResponse.json(errorRes, { status: 401 });
    }

    const successRes = { success: true, message: "Order successfully delivered." };
    await storeIdempotencyResult(idempotencyKey, user.uid, successRes);

    return NextResponse.json(successRes);`;

file = file.replace(/      return \{ success: true \};\n    \}\);\n\n    if \(!result\.success\) \{[\s\S]*?return NextResponse\.json\(\{ success: true, message: "Order successfully delivered\." \}\);/, returnLogic);

fs.writeFileSync('src/app/api/v1/orders/[id]/delivery/complete/route.ts', file);
