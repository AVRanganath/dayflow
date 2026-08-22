import {
  PrismaClient,
  Role,
  Gender,
  EmploymentType,
  MaritalStatus,
  LeaveType,
} from '@prisma/client';
import type { Department, Employee } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seeded RNG for idempotency
let seed = 12345;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function generateLoginId(
  prefix: string,
  first: string,
  last: string,
  year: number,
  serial: number,
) {
  const f = first.substring(0, 2).toUpperCase().padEnd(2, 'X');
  const l = last.substring(0, 2).toUpperCase().padEnd(2, 'X');
  const s = serial.toString().padStart(4, '0');
  return `${prefix}${f}${l}${year}${s}`;
}

async function main() {
  console.log('Starting seed...');

  // 1. Company
  const company = await prisma.company.upsert({
    where: { id: 'seed-company' },
    update: {},
    create: {
      id: 'seed-company',
      name: 'Odoo India',
      loginIdPrefix: 'OI',
      settings: {
        pfEmployeePct: 12,
        pfEmployerPct: 12,
        professionalTax: 200,
        workingDaysPerWeek: 5,
        basicPct: 50,
        hraPct: 50,
        performanceBonusPct: 8.33,
        ltaPct: 8.33,
        standardAllowance: 4167,
      },
    },
  });

  // 2. Departments
  const deptNames = ['Engineering', 'Product', 'Sales', 'HR', 'Finance'];
  const depts: Department[] = [];
  for (const name of deptNames) {
    depts.push(
      await prisma.department.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} department` },
      }),
    );
  }

  // Passwords
  const passwordAdmin = await bcrypt.hash('Admin@123', 10);
  const passwordEmployee = await bcrypt.hash('Employee@123', 10);

  const currentYear = new Date().getFullYear();
  const serialsByYear: Record<number, number> = {};

  // Bootstrap only: the first ADMIN + one demo EMPLOYEE. Real employees are
  // created through the app's "Add Employee" flow (ADR-012).
  const employeesData = Array.from({ length: 2 }).map((_, i) => {
    let email: string, password: string, role: Role, firstName: string, lastName: string;
    const deptName = 'Engineering';
    if (i === 0) {
      email = 'admin@dayflow.com';
      password = passwordAdmin;
      role = Role.ADMIN;
      firstName = 'Super';
      lastName = 'Admin';
    } else {
      email = 'john@dayflow.com';
      password = passwordEmployee;
      role = Role.EMPLOYEE;
      firstName = 'John';
      lastName = 'Doe';
    }

    const joinYear = currentYear - randomInt(0, 3);
    if (!serialsByYear[joinYear]) serialsByYear[joinYear] = 0;
    serialsByYear[joinYear]++;
    const loginId = generateLoginId(
      company.loginIdPrefix,
      firstName,
      lastName,
      joinYear,
      serialsByYear[joinYear],
    );

    return {
      index: i,
      email,
      password,
      role,
      firstName,
      lastName,
      deptName,
      joinYear,
      loginId,
      gender: randomElement([Gender.MALE, Gender.FEMALE]),
      maritalStatus: randomElement([MaritalStatus.SINGLE, MaritalStatus.MARRIED]),
      employmentType: EmploymentType.FULL_TIME,
    };
  });

  const createdEmployees: Employee[] = [];
  const today = new Date();

  for (const ed of employeesData) {
    const dept = depts.find((d) => d.name === ed.deptName);
    const joinDate = new Date(`${ed.joinYear}-01-15T00:00:00Z`);
    const dateOfBirth = new Date(`${ed.joinYear - randomInt(22, 40)}-06-01T00:00:00Z`);

    const user = await prisma.user.upsert({
      where: { email: ed.email },
      update: {},
      create: {
        email: ed.email,
        loginId: ed.loginId,
        passwordHash: ed.password,
        role: ed.role,
        mustChangePassword: false,
        isEmailVerified: true,
      },
    });

    const empIdStr = `EMP${(ed.index + 1).toString().padStart(3, '0')}`;
    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyId: company.id,
        employeeId: empIdStr,
        employeeCode: empIdStr,
        firstName: ed.firstName,
        lastName: ed.lastName,
        email: ed.email,
        personalEmail: `${ed.firstName.toLowerCase()}@example.com`,
        phone: `+9198765${randomInt(10000, 99999)}`,
        dateOfBirth: dateOfBirth,
        gender: ed.gender,
        maritalStatus: ed.maritalStatus,
        nationality: 'Indian',
        panNumber: `ABCDE${randomInt(1000, 9999)}F`,
        uanNumber: `10000${randomInt(1000000, 9999999)}`,
        bankAccountNumber: `12345678${randomInt(10, 99)}`,
        bankName: 'HDFC Bank',
        bankIfsc: 'HDFC0001234',
        departmentId: dept.id,
        designation:
          ed.role === Role.ADMIN
            ? 'Director'
            : ed.role === Role.HR
              ? 'HR Manager'
              : 'Software Engineer',
        dateOfJoining: joinDate,
        employmentType: ed.employmentType,
        workingDaysPerWeek: 5,
      },
    });
    createdEmployees.push(employee);

    // Salary Structure
    const wageNum =
      ed.role === Role.ADMIN ? 150000 : ed.role === Role.HR ? 80000 : randomInt(40000, 100000);
    const basicNum = wageNum * 0.5;
    const hraNum = basicNum * 0.5;
    const perfNum = basicNum * 0.0833;
    const ltaNum = basicNum * 0.0833;
    const stdNum = 4167;
    const fixedNum = wageNum - (basicNum + hraNum + stdNum + perfNum + ltaNum);

    await prisma.salaryStructure.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        monthlyWage: wageNum,
        basic: basicNum,
        hra: hraNum,
        standardAllowance: stdNum,
        performanceBonus: perfNum,
        lta: ltaNum,
        fixedAllowance: fixedNum,
        pfEmployeePct: 12,
        pfEmployerPct: 12,
        professionalTax: 200,
      },
    });

    // Leave Balances
    const currentYear = today.getFullYear();
    for (const [lt, allowed] of [
      [LeaveType.PAID, 24],
      [LeaveType.SICK, 12],
      [LeaveType.CASUAL, 8],
    ] as [LeaveType, number][]) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: { employeeId: employee.id, leaveType: lt, year: currentYear },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveType: lt,
          year: currentYear,
          totalAllowed: allowed,
          used: randomInt(0, Math.floor(allowed / 3)),
        },
      });
    }
  }

  // Audit Logs (idempotent)
  await prisma.auditLog.upsert({
    where: { id: 'seed-audit-company' },
    update: {},
    create: {
      id: 'seed-audit-company',
      userId: (await prisma.user.findUnique({ where: { email: 'admin@dayflow.com' } }))!.id,
      action: 'CREATE',
      entity: 'Company',
      entityId: company.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
