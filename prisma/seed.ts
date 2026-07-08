import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Coordenadas de referencia para el "salón" de demostración (ajusta si lo pruebas en otro lugar).
const CAMPUS_LAT = 19.4326;
const CAMPUS_LNG = -99.1332;

async function main() {
  const teacherPassword = await bcrypt.hash("maestro123", 10);
  const teacher = await prisma.user.upsert({
    where: { email: "m.rangel@inst.mx" },
    update: {},
    create: {
      role: "TEACHER",
      name: "Mtra. Rangel",
      email: "m.rangel@inst.mx",
      passwordHash: teacherPassword,
    },
  });

  const studentPassword = await bcrypt.hash("alumno123", 10);
  const studentsData = [
    { name: "Diego Soto", email: "diego.soto@inst.mx", institutionId: "2021030456" },
    { name: "Ana Beltrán", email: "ana.beltran@inst.mx", institutionId: "2021030112" },
    { name: "Carlos Vera", email: "carlos.vera@inst.mx", institutionId: "2021030233" },
    { name: "Fernanda Lugo", email: "fernanda.lugo@inst.mx", institutionId: "2021030877" },
    { name: "Jorge Nava", email: "jorge.nava@inst.mx", institutionId: "2021030901" },
  ];

  const students = [];
  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        role: "STUDENT",
        name: s.name,
        email: s.email,
        passwordHash: studentPassword,
        institutionId: s.institutionId,
      },
    });
    students.push(student);
  }

  const subjectsData = [
    {
      name: "Cálculo Diferencial",
      code: "CALC-201",
      room: "Aula B-204",
      scheduleText: "Lun · Mié · Vie · 08:00–09:30",
      weekdays: [0, 2, 4],
      icon: "📐",
      tint: "#ede9ff",
    },
    {
      name: "Programación Web",
      code: "PROG-305",
      room: "Laboratorio 3",
      scheduleText: "Mar · Jue · 10:00–12:00",
      weekdays: [1, 3],
      icon: "💻",
      tint: "#ffe9df",
    },
    {
      name: "Bases de Datos",
      code: "BD-310",
      room: "Laboratorio 1",
      scheduleText: "Lun · Mié · 12:00–13:30",
      weekdays: [0, 2],
      icon: "🗄️",
      tint: "#dff7f0",
    },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { teacherId_code: { teacherId: teacher.id, code: s.code } },
      update: {},
      create: {
        teacherId: teacher.id,
        name: s.name,
        code: s.code,
        room: s.room,
        scheduleText: s.scheduleText,
        weekdays: s.weekdays,
        icon: s.icon,
        tint: s.tint,
        latitude: CAMPUS_LAT,
        longitude: CAMPUS_LNG,
        radiusM: 120,
      },
    });
    subjects.push(subject);
  }

  for (const subject of subjects) {
    for (const student of students) {
      await prisma.enrollment.upsert({
        where: { subjectId_studentId: { subjectId: subject.id, studentId: student.id } },
        update: {},
        create: { subjectId: subject.id, studentId: student.id },
      });
    }
  }

  console.log("Seed listo:");
  console.log(`  Maestro: m.rangel@inst.mx / maestro123`);
  console.log(`  Alumnos: ${studentsData.map((s) => s.email).join(", ")} / alumno123`);
  console.log(`  ID institución de Diego Soto: 2021030456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
