import { PrismaClient, UserRole, Department, ProjectStatus, TaskStatus, TaskPriority, MemberRole, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('====================================');

  // Clear existing data (optional - be careful in production)
  console.log('🧹 Clearing existing data...');
  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.file.deleteMany(),
    prisma.task.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.session.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Existing data cleared');

  // ==================== CREATE USERS ====================
  console.log('\n👥 Creating users...');

  // Admin user
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ogspark.com',
      password: hashedAdminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
      lastLogin: new Date(),
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Regular user
  const hashedUserPassword = await bcrypt.hash('user123', 12);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@ogspark.com',
      password: hashedUserPassword,
      name: 'John Doe',
      role: UserRole.USER,
      isActive: true,
      lastLogin: new Date(),
    },
  });
  console.log(`✅ Regular user created: ${regularUser.email}`);

  // Student users with different departments
  const departments = [
    Department.CSE,
    Department.IT,
    Department.ECE,
    Department.EEE,
    Department.MECH,
    Department.CIVIL,
    Department.OTHER
  ];

  const studentUsers = [];
  const studentNames = [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
    'Ethan Hunt', 'Fiona Gallagher', 'George Costanza', 'Hannah Montana',
    'Ian Malcolm', 'Julia Roberts', 'Kevin Hart', 'Laura Croft'
  ];

  for (let i = 0; i < 12; i++) {
    const hashedStudentPassword = await bcrypt.hash(`student${i + 123}`, 12);
    const dept = departments[i % departments.length];
    const studentId = `${dept}-2024-${String(i + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
    
    const student = await prisma.user.create({
      data: {
        email: `student${i + 1}@ogspark.com`,
        password: hashedStudentPassword,
        name: studentNames[i % studentNames.length],
        studentId: studentId,
        department: dept,
        role: UserRole.USER,
        isActive: true,
        lastLogin: i % 3 === 0 ? new Date() : null,
      },
    });
    studentUsers.push(student);
    console.log(`✅ Student created: ${student.name} (${student.studentId}) - ${student.department}`);
  }

  // ==================== CREATE PROJECTS ====================
  console.log('\n📁 Creating projects...');

  const projects = [];
  const projectNames = [
    'AI-Powered Learning Platform',
    'Smart Campus Navigation App',
    'Student Attendance System',
    'Library Management System',
    'Online Examination Portal',
    'Research Collaboration Hub',
    'Hostel Management System',
    'Placement Training Platform',
    'Alumni Network Portal',
    'Course Registration System'
  ];

  // Create projects for admin and regular user
  for (let i = 0; i < 5; i++) {
    const project = await prisma.project.create({
      data: {
        name: projectNames[i],
        description: `This is a detailed description for ${projectNames[i]}. It includes various features and functionalities for students and faculty.`,
        status: i % 3 === 0 ? ProjectStatus.ACTIVE : i % 3 === 1 ? ProjectStatus.INACTIVE : ProjectStatus.ARCHIVED,
        userId: i % 2 === 0 ? adminUser.id : regularUser.id,
      },
    });
    projects.push(project);
    console.log(`✅ Project created: ${project.name} (Status: ${project.status})`);
  }

  // Create projects for students
  for (let i = 5; i < 10; i++) {
    const project = await prisma.project.create({
      data: {
        name: projectNames[i],
        description: `Student project: ${projectNames[i]} - A collaborative project for learning and development.`,
        status: ProjectStatus.ACTIVE,
        userId: studentUsers[i % studentUsers.length].id,
      },
    });
    projects.push(project);
    console.log(`✅ Student project created: ${project.name}`);
  }

  // ==================== CREATE PROJECT MEMBERS ====================
  console.log('\n👥 Adding project members...');

  for (const project of projects) {
    // Add owner as member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: project.userId,
        role: MemberRole.OWNER,
      },
    });

    // Add random members to each project
    const memberCount = Math.floor(Math.random() * 5) + 2; // 2-6 members per project
    for (let j = 0; j < memberCount; j++) {
      const randomStudent = studentUsers[Math.floor(Math.random() * studentUsers.length)];
      if (randomStudent.id !== project.userId) {
        await prisma.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId: randomStudent.id,
            },
          },
          update: {},
          create: {
            projectId: project.id,
            userId: randomStudent.id,
            role: [MemberRole.ADMIN, MemberRole.MEMBER, MemberRole.VIEWER][Math.floor(Math.random() * 3)],
          },
        });
      }
    }
  }
  console.log(`✅ Project members added`);

  // ==================== CREATE TASKS ====================
  console.log('\n📋 Creating tasks...');

  const taskTitles = [
    'Design database schema',
    'Create API endpoints',
    'Implement authentication',
    'Build frontend components',
    'Write unit tests',
    'Fix navigation bugs',
    'Optimize database queries',
    'Create documentation',
    'Deploy to production',
    'Conduct user testing',
    'Review pull requests',
    'Update dependencies',
    'Add error handling',
    'Implement caching',
    'Create admin dashboard'
  ];

  for (const project of projects) {
    const taskCount = Math.floor(Math.random() * 8) + 5; // 5-12 tasks per project
    
    for (let i = 0; i < taskCount; i++) {
      const randomStudent = studentUsers[Math.floor(Math.random() * studentUsers.length)];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days from now
      
      const status = i % 4 === 0 ? TaskStatus.PENDING : 
                     i % 4 === 1 ? TaskStatus.IN_PROGRESS : 
                     i % 4 === 2 ? TaskStatus.COMPLETED : 
                     TaskStatus.BLOCKED;
      
      const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
      
      await prisma.task.create({
        data: {
          title: taskTitles[i % taskTitles.length],
          description: `This task involves ${taskTitles[i % taskTitles.length].toLowerCase()} for the project ${project.name}. It requires careful planning and execution.`,
          status: status,
          priority: i % 3 === 0 ? TaskPriority.LOW : i % 3 === 1 ? TaskPriority.MEDIUM : i % 3 === 2 ? TaskPriority.HIGH : TaskPriority.URGENT,
          projectId: project.id,
          assignedTo: randomStudent.id,
          createdBy: project.userId,
          dueDate: dueDate,
          completedAt: completedAt,
        },
      });
    }
  }
  console.log(`✅ Tasks created for all projects`);

  // ==================== CREATE COMMENTS ====================
  console.log('\n💬 Creating comments...');

  const tasks = await prisma.task.findMany();
  const commentTexts = [
    'Great progress on this task!',
    'I think we need to discuss this further.',
    'Can you provide more details?',
    'This is ready for review.',
    'Looking good!',
    'I\'ll take care of this.',
    'Please update the documentation.',
    'We need to prioritize this.',
    'Excellent work!',
    'Let\'s schedule a meeting about this.',
    'I\'ve made some changes.',
    'This is blocked by another task.',
    'Almost done!',
    'Please review my changes.',
    'Great job everyone!'
  ];

  for (const task of tasks.slice(0, 30)) { // Add comments to first 30 tasks
    const commentCount = Math.floor(Math.random() * 5) + 1; // 1-5 comments per task
    
    for (let i = 0; i < commentCount; i++) {
      const randomStudent = studentUsers[Math.floor(Math.random() * studentUsers.length)];
      
      await prisma.comment.create({
        data: {
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          userId: randomStudent.id,
          taskId: task.id,
        },
      });
    }
  }
  console.log(`✅ Comments created`);

  // ==================== CREATE NOTIFICATIONS ====================
  console.log('\n🔔 Creating notifications...');

  for (const user of [adminUser, regularUser, ...studentUsers.slice(0, 5)]) {
    const notificationCount = Math.floor(Math.random() * 5) + 3; // 3-7 notifications per user
    
    for (let i = 0; i < notificationCount; i++) {
      const isRead = i % 3 === 0;
      const notificationTypes = Object.values(NotificationType);
      
      await prisma.notification.create({
        data: {
          type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
          title: `Notification ${i + 1}`,
          message: `This is a sample notification message for ${user.name}. It contains important information about your account or projects.`,
          userId: user.id,
          isRead: isRead,
          readAt: isRead ? new Date() : null,
          data: { source: 'seed', importance: 'medium' },
        },
      });
    }
  }
  console.log(`✅ Notifications created`);

  // ==================== CREATE API KEYS ====================
  console.log('\n🔑 Creating API keys...');

  for (let i = 0; i < 5; i++) {
    const user = [adminUser, regularUser, ...studentUsers][i];
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year
    
    await prisma.apiKey.create({
      data: {
        name: `API Key ${i + 1}`,
        key: `ogsk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        userId: user.id,
        isActive: i % 4 !== 0, // 75% are active
        expiresAt: i % 3 === 0 ? expiresAt : null,
      },
    });
  }
  console.log(`✅ API keys created`);

  // ==================== CREATE USER SETTINGS ====================
  console.log('\n⚙️ Creating user settings...');

  for (const user of [adminUser, regularUser, ...studentUsers]) {
    await prisma.settings.create({
      data: {
        userId: user.id,
        theme: ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)],
        notificationsEnabled: true,
        emailNotifications: Math.random() > 0.3, // 70% have email notifications enabled
        language: 'en',
        timezone: 'UTC',
        preferences: {
          dashboardLayout: 'grid',
          itemsPerPage: 10,
          emailFrequency: 'daily',
        },
      },
    });
  }
  console.log(`✅ User settings created`);

  // ==================== CREATE ACTIVITY LOGS ====================
  console.log('\n📊 Creating activity logs...');

  const activities = [
    'User logged in',
    'Project created',
    'Task updated',
    'Comment added',
    'File uploaded',
    'Project member added',
    'Task completed',
    'Settings updated',
    'Profile updated',
    'Notification read'
  ];

  for (let i = 0; i < 50; i++) {
    const randomUser = [adminUser, regularUser, ...studentUsers][Math.floor(Math.random() * (studentUsers.length + 2))];
    const activityDate = new Date();
    activityDate.setHours(activityDate.getHours() - Math.floor(Math.random() * 72)); // Random time in last 72 hours
    
    await prisma.activityLog.create({
      data: {
        userId: randomUser.id,
        activityType: activities[i % activities.length],
        description: `User ${randomUser.name} performed activity: ${activities[i % activities.length]}`,
        entityType: ['Project', 'Task', 'User', 'Comment'][Math.floor(Math.random() * 4)],
        metadata: { timestamp: activityDate.toISOString() },
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (compatible; OGSAPRK-Bot/1.0)',
        createdAt: activityDate,
      },
    });
  }
  console.log(`✅ Activity logs created`);

  // ==================== CREATE FILES ====================
  console.log('\n📎 Creating file records...');

  const fileTypes = [
    { name: 'document.pdf', mime: 'application/pdf', size: 1024 * 1024 * 2.5 },
    { name: 'image.jpg', mime: 'image/jpeg', size: 1024 * 512 },
    { name: 'data.csv', mime: 'text/csv', size: 1024 * 128 },
    { name: 'presentation.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 1024 * 1024 * 5 },
    { name: 'code.zip', mime: 'application/zip', size: 1024 * 1024 * 10 },
  ];

  for (let i = 0; i < 20; i++) {
    const randomUser = [adminUser, regularUser, ...studentUsers][Math.floor(Math.random() * (studentUsers.length + 2))];
    const randomProject = projects[Math.floor(Math.random() * projects.length)];
    const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    
    await prisma.file.create({
      data: {
        filename: `file_${i + 1}_${fileType.name}`,
        originalName: fileType.name,
        mimeType: fileType.mime,
        size: BigInt(Math.floor(fileType.size * (0.8 + Math.random() * 0.4))), // Random size variation
        path: `/uploads/${randomUser.id}/${fileType.name}`,
        userId: randomUser.id,
        projectId: randomProject.id,
        isPublic: Math.random() > 0.7, // 30% are public
        downloadCount: Math.floor(Math.random() * 50),
      },
    });
  }
  console.log(`✅ File records created`);

  // ==================== CREATE AUDIT LOGS ====================
  console.log('\n📝 Creating audit logs...');

  const auditActions = [
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
    'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED',
    'ROLE_CHANGED', 'PERMISSIONS_UPDATED', 'SETTINGS_CHANGED'
  ];

  for (let i = 0; i < 30; i++) {
    const randomUser = [adminUser, regularUser, ...studentUsers][Math.floor(Math.random() * (studentUsers.length + 2))];
    const auditDate = new Date();
    auditDate.setHours(auditDate.getHours() - Math.floor(Math.random() * 168)); // Random time in last week
    
    await prisma.auditLog.create({
      data: {
        action: auditActions[Math.floor(Math.random() * auditActions.length)],
        userId: randomUser.id,
        userEmail: randomUser.email,
        resource: ['User', 'Project', 'Task', 'Setting'][Math.floor(Math.random() * 4)],
        resourceId: Math.random().toString(36).substring(7),
        details: { change: 'Updated field', oldValue: 'old', newValue: 'new' },
        ipAddress: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'OGSPARK-Audit/1.0',
        createdAt: auditDate,
      },
    });
  }
  console.log(`✅ Audit logs created`);

  // ==================== SUMMARY ====================
  console.log('\n====================================');
  console.log('📊 SEED SUMMARY');
  console.log('====================================');
  console.log(`👤 Admin users: 1`);
  console.log(`👤 Regular users: 1`);
  console.log(`👨‍🎓 Student users: ${studentUsers.length}`);
  console.log(`📁 Projects: ${projects.length}`);
  
  const taskCount = await prisma.task.count();
  const commentCount = await prisma.comment.count();
  const notificationCount = await prisma.notification.count();
  const fileCount = await prisma.file.count();
  
  console.log(`📋 Tasks: ${taskCount}`);
  console.log(`💬 Comments: ${commentCount}`);
  console.log(`🔔 Notifications: ${notificationCount}`);
  console.log(`📎 Files: ${fileCount}`);
  console.log(`🔑 API Keys: 5`);
  console.log(`⚙️ Settings: ${studentUsers.length + 2}`);
  console.log(`📊 Activity Logs: 50`);
  console.log(`📝 Audit Logs: 30`);
  
  console.log('\n====================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('====================================');
  console.log('\n🔐 TEST CREDENTIALS:');
  console.log('------------------------------------');
  console.log('👑 Admin: admin@ogspark.com / admin123');
  console.log('👤 Regular: user@ogspark.com / user123');
  console.log('👨‍🎓 Student 1: student1@ogspark.com / student123');
  console.log('👨‍🎓 Student 2: student2@ogspark.com / student124');
  console.log('... and more student accounts');
  console.log('====================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });