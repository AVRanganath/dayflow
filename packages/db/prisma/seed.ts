import {
  PrismaClient,
  Role,
  Gender,
  EmploymentType,
  AttendanceStatus,
  LeaveType,
  LeaveStatus,
  PayrollStatus,
  MaritalStatus,
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
function randomBoolean(chance: number = 0.5) {
  return random() < chance;
}

const firstNames = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Heidi',
  'Ivan',
  'Judy',
  'Mallory',
  'Nina',
  'Oscar',
  'Peggy',
  'Romeo',
  'Sybil',
  'Trent',
  'Victor',
  'Walter',
  'Alice',
  'Bruce',
  'Clark',
  'Diana',
  'Barry',
  'Hal',
  'Arthur',
  'Oliver',
  'Dinah',
];
const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
];

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

  // We will generate 30 employees total.
  // 1: Admin, 2: John, 3-30: others
  const employeesData = Array.from({ length: 30 }).map((_, i) => {
    let email, password, role, firstName, lastName;
    let deptName = randomElement(deptNames);
    if (i === 0) {
      email = 'admin@dayflow.com';
      password = passwordAdmin;
      role = Role.ADMIN;
      firstName = 'Super';
      lastName = 'Admin';
      deptName = 'Engineering';
    } else if (i === 1) {
      email = 'john@dayflow.com';
      password = passwordEmployee;
      role = Role.EMPLOYEE;
      firstName = 'John';
      lastName = 'Doe';
      deptName = 'Engineering';
    } else {
      firstName = firstNames[i % firstNames.length];
      lastName = lastNames[(i * 3) % lastNames.length];
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@dayflow.com`;
      password = passwordEmployee;
      role = i === 2 ? Role.HR : Role.EMPLOYEE;
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

    // Generate Attendance and Payroll for last 3 months
    for (let m = 2; m >= 0; m--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1; // 1-12

      let workingDays = 0;
      let missingAttendanceDays = 0;
      const unpaidLeaveDays = 0;

      const daysInMonth = new Date(year, month, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(Date.UTC(year, month - 1, d));
        const dayOfWeek = currentDate.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
        workingDays++;

        // Randomly assign attendance
        let status = AttendanceStatus.PRESENT;
        let hoursWorked = 8;

        const rand = random();
        if (rand < 0.05) {
          status = AttendanceStatus.ABSENT;
          hoursWorked = 0;
          missingAttendanceDays++;
        } else if (rand < 0.1) {
          status = AttendanceStatus.ON_LEAVE;
          hoursWorked = 0;
        } else if (rand < 0.15) {
          status = AttendanceStatus.HALF_DAY;
          hoursWorked = 4;
        }

        let checkIn = null;
        let checkOut = null;
        if (status !== AttendanceStatus.ABSENT && status !== AttendanceStatus.ON_LEAVE) {
          checkIn = new Date(Date.UTC(year, month - 1, d, 9, 0, 0));
          checkOut = new Date(Date.UTC(year, month - 1, d, 9 + hoursWorked, 0, 0));
        }

        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: employee.id, date: currentDate } },
          update: {},
          create: {
            employeeId: employee.id,
            date: currentDate,
            status,
            checkIn,
            checkOut,
            hoursWorked,
            breakMinutes: hoursWorked > 4 ? 60 : 0,
          },
        });
      }

      // Generate a Payroll Record for this month
      const payableDays = workingDays - missingAttendanceDays - unpaidLeaveDays;
      const netMonthly = wageNum - basicNum * 0.12 - 200;
      const proratedNet = Math.round((netMonthly * payableDays) / workingDays);

      await prisma.payrollRecord.upsert({
        where: { employeeId_month_year: { employeeId: employee.id, month, year } },
        update: {},
        create: {
          employeeId: employee.id,
          month,
          year,
          monthlyWage: wageNum,
          grossSalary: wageNum,
          basic: basicNum,
          hra: hraNum,
          standardAllowance: stdNum,
          performanceBonus: perfNum,
          lta: ltaNum,
          fixedAllowance: fixedNum,
          pfEmployee: basicNum * 0.12,
          pfEmployer: basicNum * 0.12,
          professionalTax: 200,
          totalDeductions: basicNum * 0.12 + 200,
          workingDays,
          payableDays,
          netSalary: proratedNet,
          status: PayrollStatus.PAID,
          paidAt: new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59)),
        },
      });
    }
  }

  // Set managers: Employee 2..29 report to John (index 1) or Admin (index 0)
  for (let i = 2; i < createdEmployees.length; i++) {
    const mgrId = randomBoolean(0.7) ? createdEmployees[1].id : createdEmployees[0].id;
    await prisma.employee.update({
      where: { id: createdEmployees[i].id },
      data: { managerId: mgrId },
    });
  }

  // Leave Requests — a spread of statuses for a realistic demo.
  // Idempotent via deterministic ids. Admin (index 0) is the reviewer.
  const reviewer = createdEmployees[0];
  const countWorkingDays = (start: Date, end: Date) => {
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) days++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return Math.max(1, days);
  };
  const leaveSpecs = [
    {
      status: LeaveStatus.APPROVED,
      type: LeaveType.PAID,
      monthOffset: -1,
      startDay: 10,
      len: 2,
      reason: 'Family function to attend out of town.',
      comment: 'Approved. Enjoy your time off!',
    },
    {
      status: LeaveStatus.PENDING,
      type: LeaveType.SICK,
      monthOffset: 0,
      startDay: 22,
      len: 1,
      reason: 'Feeling unwell, need a day to recover.',
      comment: null,
    },
    {
      status: LeaveStatus.REJECTED,
      type: LeaveType.CASUAL,
      monthOffset: -2,
      startDay: 5,
      len: 3,
      reason: 'Short-notice personal trip request.',
      comment: 'Insufficient coverage for those dates.',
    },
  ];
  for (let i = 1; i < createdEmployees.length; i++) {
    const emp = createdEmployees[i];
    const count = 1 + (i % 3); // 1..3 requests per employee
    for (let n = 0; n < count; n++) {
      const s = leaveSpecs[n];
      const base = new Date(today.getFullYear(), today.getMonth() + s.monthOffset, s.startDay);
      const start = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
      const end = new Date(
        Date.UTC(base.getFullYear(), base.getMonth(), base.getDate() + s.len - 1),
      );
      const reviewed = s.status !== LeaveStatus.PENDING;
      await prisma.leaveRequest.upsert({
        where: { id: `seed-leave-${emp.id}-${n}` },
        update: {},
        create: {
          id: `seed-leave-${emp.id}-${n}`,
          employeeId: emp.id,
          leaveType: s.type,
          startDate: start,
          endDate: end,
          totalDays: countWorkingDays(start, end),
          reason: s.reason,
          status: s.status,
          reviewedById: reviewed ? reviewer.id : null,
          reviewerComment: s.comment,
          reviewedAt: reviewed
            ? new Date(
                Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - 3),
              )
            : null,
          attachmentUrl:
            s.type === LeaveType.SICK ? 'https://files.dayflow.local/certs/sick-note.pdf' : null,
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
