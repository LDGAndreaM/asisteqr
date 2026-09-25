import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Sin 0/O ni 1/I para que el código se pueda dictar y copiar sin confusiones.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

function randomJoinCode() {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Código de unión que no está en uso por ninguna otra materia. */
export async function uniqueJoinCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomJoinCode();
    const clash = await prisma.subject.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!clash) return code;
  }
  throw new Error("No se pudo generar un código de unión, intenta de nuevo");
}
