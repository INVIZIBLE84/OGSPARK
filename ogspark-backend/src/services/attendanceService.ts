import { prisma } from '../config/database';
import { AppError } from '../utils/helpers';
import logger from '../utils/logger';
import { CacheService } from './cacheService';
import { NotificationService } from './notificationService';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export class AttendanceService {
  static async markAttendance(
    userId: string,
    date: Date = new Date(),
    status: 'PRESENT' | 'ABSENT' | 'LATE',
    subject?: string,
    remarks?: string,
    markedBy?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.studentId) {
      throw new AppError(404, 'Student not found');
    }

    // Check if attendance already marked for this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: user.studentId,
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
    });

    if (existingAttendance) {
      throw new AppError(400, 'Attendance already marked for this date');
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: user.studentId,
        date,
        status,
        subject,
        remarks,
        markedBy: markedBy || userId,
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            studentId: true,
            department: true,
          },
        },
      },
    });

    // Clear cache
    await CacheService.deletePattern(`attendance:${user.studentId}:*`);
    
    // Send notification if absent
    if (status === 'ABSENT') {
      await NotificationService.createNotification(
        userId,
        'ATTENDANCE',
        'Attendance Marked',
        `Your attendance was marked as ABSENT for ${format(date, 'MMMM do, yyyy')}`,
        { attendanceId: attendance.id, date: format(date, 'yyyy-MM-dd') }
      );
    }

    logger.info('Attendance marked:', { studentId: user.studentId, date, status });

    return attendance;
  }

  static async getAttendance(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const cacheKey = `attendance:${studentId}:${startDate}:${endDate}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const where: any = { studentId };

    if (startDate) {
      where.date = { ...where.date, gte: startOfDay(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: endOfDay(endDate) };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    await CacheService.set(cacheKey, attendance, 300); // Cache for 5 minutes

    return attendance;
  }

  static async getAttendanceSummary(studentId: string) {
    const cacheKey = `attendance:summary:${studentId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const attendance = await prisma.attendance.findMany({
      where: { studentId },
    });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;

    const percentage = total > 0 ? (present / total) * 100 : 0;

    const summary = {
      totalDays: total,
      present,
      absent,
      late,
      attendancePercentage: percentage.toFixed(2),
      requiredPercentage: 75,
      isEligible: percentage >= 75,
      daysNeeded: percentage < 75 ? Math.ceil((75 * total - 100 * present) / 100) : 0,
    };

    await CacheService.set(cacheKey, summary, 600); // Cache for 10 minutes

    return summary;
  }

  static async getMonthlyAttendance(studentId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await this.getAttendance(studentId, startDate, endDate);

    const daysInMonth = endDate.getDate();
    const attendanceMap = new Map();

    attendance.forEach(record => {
      const day = record.date.getDate();
      attendanceMap.set(day, record);
    });

    const monthlyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const record = attendanceMap.get(day);
      monthlyData.push({
        day,
        date: new Date(year, month - 1, day),
        status: record?.status || 'NOT_MARKED',
        remarks: record?.remarks,
      });
    }

    return monthlyData;
  }

  static async updateAttendance(
    attendanceId: string,
    userId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE',
    remarks?: string
  ) {
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        student: {
          userId,
        },
      },
    });

    if (!attendance) {
      throw new AppError(404, 'Attendance record not found');
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status, remarks },
    });

    // Clear cache
    await CacheService.deletePattern(`attendance:${attendance.studentId}:*`);

    logger.info('Attendance updated:', { attendanceId, status });

    return updated;
  }

  static async getDepartmentAttendance(
    department: string,
    date: Date = new Date()
  ) {
    const cacheKey = `attendance:department:${department}:${format(date, 'yyyy-MM-dd')}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const students = await prisma.user.findMany({
      where: {
        department,
        studentId: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        studentId: true,
        email: true,
      },
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        student: { department },
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.studentId, record);
    });

    const result = students.map(student => ({
      ...student,
      attendance: attendanceMap.get(student.studentId) || {
        status: 'NOT_MARKED',
        remarks: null,
      },
    }));

    await CacheService.set(cacheKey, result, 300);

    return result;
  }

  static async getAttendanceStats(department?: string) {
    const cacheKey = `attendance:stats:${department || 'all'}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (department) {
      where.student = { department };
    }

    const [totalRecords, presentCount, absentCount, lateCount] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
    ]);

    const stats = {
      total: totalRecords,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      presentPercentage: totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
      absentPercentage: totalRecords > 0 ? (absentCount / totalRecords) * 100 : 0,
      latePercentage: totalRecords > 0 ? (lateCount / totalRecords) * 100 : 0,
    };

    await CacheService.set(cacheKey, stats, 600);

    return stats;
  }
}