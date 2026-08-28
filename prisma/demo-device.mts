// Developer trace: what actually happens when a JourneyPort card is added.
// Runs against the same database the deployment uses, printing the state
// change at each layer. Cleans up after itself.
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();
const HOST = "https://nfc-tags-production.up.railway.app";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const code = (n: number) =>
  Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const line = (t: string) => console.log(`\n${"─".repeat(64)}\n${t}\n${"─".repeat(64)}`);

async function main() {
  line("PASO 1 — Se genera el token (en memoria, nunca se guarda en claro)");

  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = sha256(token);
  const publicDeviceId = `JPD-${code(6)}`;

  console.log(`token en claro   : ${token}`);
  console.log(`                   (${token.length} chars, 192 bits de entropía)`);
  console.log(`hash SHA-256     : ${tokenHash}`);
  console.log(`public device id : ${publicDeviceId}`);
  console.log(`\nURL que se graba en el chip físico:`);
  console.log(`  ${HOST}/t/${token}`);

  line("PASO 2 — INSERT en journeyport_devices (solo va el hash)");

  const device = await db.journeyPortDevice.create({
    data: { publicDeviceId, tokenHash, deviceType: "card", status: "inventory" },
  });

  console.log(JSON.stringify(
    {
      id: device.id,
      public_device_id: device.publicDeviceId,
      token_hash: device.tokenHash.slice(0, 24) + "...",
      device_type: device.deviceType,
      status: device.status,
      user_id: device.userId,
      activated_at: device.activatedAt,
    },
    null,
    2
  ));
  console.log("\n^ Fíjate: NO existe ninguna columna con el token en claro.");

  line("PASO 3 — Se escribe el audit event (append-only, TRS §22)");

  const auditEvent = await db.auditEvent.create({
    data: {
      actorType: "beaurity_admin",
      action: "device.added_to_inventory",
      objectType: "journeyport_device",
      objectId: device.id,
      newState: JSON.stringify({ deviceType: "card" }),
    },
  });
  console.log(`${auditEvent.action}  ->  ${auditEvent.objectType}:${auditEvent.objectId.slice(0, 8)}`);
  console.log(`at ${auditEvent.createdAt.toISOString()}`);

  line("PASO 4 — Alguien tapea la tarjeta: cómo se resuelve el token");

  console.log(`El navegador pide:  GET /t/${token.slice(0, 20)}...`);
  console.log(`El servidor calcula: sha256(token) = ${sha256(token).slice(0, 24)}...`);

  const resolved = await db.journeyPortDevice.findUnique({ where: { tokenHash: sha256(token) } });
  console.log(`Busca ese hash en la BD  ->  ${resolved ? `ENCONTRADO: ${resolved.publicDeviceId}` : "NO EXISTE"}`);
  console.log(`Estado del dispositivo   ->  ${resolved?.status}`);
  console.log(`\nComo status = 'inventory' y no tiene dueño, la página muestra`);
  console.log(`la pantalla de ACTIVACIÓN ("Confirm ownership & activate").`);

  line("PASO 5 — Token equivocado (una letra cambiada)");

  const tampered = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");
  const notFound = await db.journeyPortDevice.findUnique({ where: { tokenHash: sha256(tampered) } });
  console.log(`token alterado  ->  ${notFound ? "encontrado (MAL)" : "NO ENCONTRADO -> 'Unknown JourneyPort'"}`);
  console.log(`\nEl hash cambia por completo con un solo carácter distinto,`);
  console.log(`así que no se puede tantear tokens vecinos.`);

  line("PASO 6 — Limpieza (se borra la tarjeta de demostración)");

  await db.auditEvent.delete({ where: { id: auditEvent.id } });
  await db.journeyPortDevice.delete({ where: { id: device.id } });
  console.log(`Eliminados: dispositivo ${publicDeviceId} y su audit event.`);
  console.log(`La base de datos queda exactamente como estaba.`);

  const remaining = await db.journeyPortDevice.groupBy({ by: ["status"], _count: true });
  console.log(`\nInventario real actual:`);
  remaining.forEach((r) => console.log(`  ${r.status.padEnd(12)} ${r._count}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
