const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const CandidateProfile = require('../src/models/CandidateProfile');
const EmployerProfile = require('../src/models/EmployerProfile');
const JobPost = require('../src/models/JobPost');
const Application = require('../src/models/Application');
const Message = require('../src/models/Message');
const Notification = require('../src/models/Notification');

async function restoreAndSeedDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. CLEAR DATABASE
    console.log('Clearing existing database collections...');
    await User.deleteMany({});
    await CandidateProfile.deleteMany({});
    await EmployerProfile.deleteMany({});
    await JobPost.deleteMany({});
    await Application.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    console.log('Database cleared.');

    // 2. CREATE ADMIN
    console.log('Creating Admin account...');
    const adminUser = new User({
      name: 'Hệ thống Admin',
      email: 'admin@gmail.com',
      password: 'Password123',
      role: 'admin',
      isVerified: true
    });
    await adminUser.save();
    console.log(`Admin account created: ${adminUser.email}`);

    // 3. CREATE CANDIDATES
    console.log('Creating Candidate accounts...');
    const candidatesData = [
      {
        name: 'Đặng Quốc Huy',
        email: 'dangquochuy@gmail.com',
        password: 'Password123',
        cvUrl: 'http://localhost:3001/uploads/cvs/dangquochuy.html',
        skills: ['React', 'Next.js', 'Node.js', 'MongoDB', 'TypeScript', 'Tailwind CSS'],
        location: 'Đà Nẵng',
        bio: 'Lập trình viên Web năng động với đam mê xây dựng giao diện người dùng đẹp mắt, tối ưu hóa hiệu năng và kết nối vi dịch vụ.',
        resumeHeadline: 'Senior Frontend Developer / React Native Specialist',
        education: [
          {
            degree: 'Kỹ sư Công nghệ thông tin',
            school: 'Trường Đại học Bách Khoa - ĐHĐN',
            field: 'Công nghệ thông tin',
            startDate: new Date('2021-09-01'),
            endDate: new Date('2025-06-01'),
            gpa: 3.6
          }
        ],
        experience: [
          {
            title: 'Frontend Developer',
            company: 'FPT Software',
            location: 'Đà Nẵng',
            startDate: new Date('2024-06-01'),
            description: 'Phát triển các dự án Web ứng dụng React/Next.js cho các đối tác Nhật Bản.',
            isCurrentJob: true
          }
        ]
      },
      {
        name: 'Đoàn Nguyễn Bảo',
        email: 'doannguyenbao@gmail.com',
        password: 'Password123',
        cvUrl: 'http://localhost:3001/uploads/cvs/doannguyenbao.html',
        skills: ['Node.js', 'Python', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis', 'AWS'],
        location: 'TP. Hồ Chí Minh',
        bio: 'Kỹ sư Backend giàu kinh nghiệm về phát triển hệ thống phân tán, xử lý tải cao, tối ưu hóa cơ sở dữ liệu lớn.',
        resumeHeadline: 'Backend Tech Lead / Cloud Solutions Architect',
        education: [
          {
            degree: 'Cử nhân Khoa học Máy tính',
            school: 'Trường Đại học Công nghệ Thông tin - ĐHQG-HCM',
            field: 'Khoa học Máy tính',
            startDate: new Date('2020-09-01'),
            endDate: new Date('2024-06-01'),
            gpa: 3.5
          }
        ],
        experience: [
          {
            title: 'Backend Engineer',
            company: 'VNG Corporation',
            location: 'TP. Hồ Chí Minh',
            startDate: new Date('2023-01-01'),
            description: 'Thiết kế API hệ thống, tối ưu hiệu năng cơ sở dữ liệu lớn và triển khai vi dịch vụ.',
            isCurrentJob: true
          }
        ]
      },
      {
        name: 'Lê Nguyễn Huy Hoàng',
        email: 'lenguyenhuyhoang@gmail.com',
        password: 'Password123',
        cvUrl: 'http://localhost:3001/uploads/cvs/lenguyenhuyhoang.html',
        skills: ['Python', 'TensorFlow', 'PyTorch', 'React', 'Node.js', 'SQL', 'Data Science', 'Machine Learning'],
        location: 'Đà Nẵng',
        bio: 'Sinh viên năm cuối ngành Khoa học dữ liệu VKU, đam mê nghiên cứu ứng dụng Trí tuệ nhân tạo (AI) vào cuộc sống.',
        resumeHeadline: 'AI/ML Engineer / Data Scientist Intern',
        education: [
          {
            degree: 'Kỹ sư Khoa học Dữ liệu',
            school: 'Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)',
            field: 'Khoa học Dữ liệu và Trí tuệ Nhân tạo',
            startDate: new Date('2021-09-01'),
            endDate: new Date('2025-06-01'),
            gpa: 3.8
          }
        ],
        experience: [
          {
            title: 'AI/ML Engineer Intern',
            company: 'MoMo',
            location: 'TP. Hồ Chí Minh',
            startDate: new Date('2024-09-01'),
            description: 'Nghiên cứu và tích hợp các mô hình Recommendation System vào siêu ứng dụng MoMo.',
            isCurrentJob: true
          }
        ]
      }
    ];

    const candidates = [];
    for (const cData of candidatesData) {
      const u = new User({
        name: cData.name,
        email: cData.email,
        password: cData.password,
        role: 'candidate',
        isVerified: true
      });
      await u.save();

      const profile = new CandidateProfile({
        userId: u._id,
        skills: cData.skills,
        location: cData.location,
        bio: cData.bio,
        resumeHeadline: cData.resumeHeadline,
        education: cData.education,
        experience: cData.experience,
        cvUrl: cData.cvUrl,
        expectedSalary: { min: 10000000, max: 30000000, currency: 'VND' }
      });
      await profile.save();
      candidates.push({ user: u, profile });
      console.log(`Candidate profile created for: ${u.email}`);
    }

    // 4. CREATE EMPLOYERS
    console.log('Creating Employer accounts...');
    const employersData = [
      {
        name: 'FPT Software Recruiter',
        email: 'recruitment@fpt.com',
        password: 'Password123',
        companyName: 'FPT Software',
        description: 'Tập đoàn công nghệ hàng đầu Việt Nam, cung cấp dịch vụ xuất khẩu phần mềm sang các thị trường Nhật Bản, Mỹ, Châu Âu.',
        location: 'Hà Nội',
        industry: 'Technology',
        companySize: '1000+',
        foundedYear: 1999,
        benefits: ['Chăm sóc sức khỏe FPT Care', 'Thưởng tháng 13', 'Cơ hội onsite tại Nhật Bản, Mỹ']
      },
      {
        name: 'VNG Recruitment Team',
        email: 'jobs@vng.com.vn',
        password: 'Password123',
        companyName: 'VNG Corporation',
        description: 'Công ty Internet hàng đầu Việt Nam với các sản phẩm Zalo, ZaloPay, VNG Cloud, và mảng phát hành game đình đám.',
        location: 'TP. Hồ Chí Minh',
        industry: 'Technology',
        companySize: '1000+',
        foundedYear: 2004,
        benefits: ['Môi trường làm việc năng động', 'Hỗ trợ ăn trưa', 'Gym, hồ bơi miễn phí']
      },
      {
        name: 'MoMo HR',
        email: 'tuyendung@momo.vn',
        password: 'Password123',
        companyName: 'MoMo',
        description: 'Siêu ứng dụng thanh toán số 1 Việt Nam, mang đến giải pháp tài chính và dịch vụ tiện ích cho hàng chục triệu người dùng.',
        location: 'TP. Hồ Chí Minh',
        industry: 'Finance',
        companySize: '501-1000',
        foundedYear: 2007,
        benefits: ['Lương tháng 13 + performance bonus', 'Gói bảo hiểm sức khỏe cao cấp', 'Trà chiều hàng ngày']
      },
      {
        name: 'Techcombank Careers',
        email: 'recruitment@techcombank.com.vn',
        password: 'Password123',
        companyName: 'Techcombank',
        description: 'Một trong những ngân hàng thương mại cổ phần lớn nhất Việt Nam, dẫn đầu về chuyển đổi số ngành ngân hàng.',
        location: 'Hà Nội',
        industry: 'Finance',
        companySize: '1000+',
        foundedYear: 1993,
        benefits: ['Voucher Techcombank', 'Lương tháng 13 + thưởng tết hấp dẫn', 'Lộ trình phát triển rõ ràng']
      }
    ];

    const employers = {};
    for (const eData of employersData) {
      const u = new User({
        name: eData.name,
        email: eData.email,
        password: eData.password,
        role: 'employer',
        isVerified: true
      });
      await u.save();

      const profile = new EmployerProfile({
        userId: u._id,
        companyName: eData.companyName,
        description: eData.description,
        location: eData.location,
        industry: eData.industry,
        companySize: eData.companySize,
        foundedYear: eData.foundedYear,
        benefits: eData.benefits,
        isApproved: true,
        logo: null
      });
      await profile.save();
      employers[eData.companyName] = profile;
      console.log(`Employer profile created for: ${eData.companyName} (${u.email})`);
    }

    // 5. CREATE JOB POSTS
    console.log('Creating Job postings...');
    const jobsData = [
      {
        company: 'FPT Software',
        title: 'Senior React Developer',
        description: 'FPT Software đang tìm kiếm Kỹ sư Frontend React giàu kinh nghiệm để tham gia phát triển dự án xuất khẩu cho đối tác Singapore. Bạn sẽ chịu trách nhiệm chính trong thiết kế UI/UX, tối ưu hóa tốc độ tải trang và dẫn dắt đội ngũ kỹ sư trẻ.',
        requirements: [
          'Có trên 4 năm kinh nghiệm làm việc với React.js và hệ sinh thái liên quan (Redux, Next.js, Webpack).',
          'Thành thạo TypeScript, Tailwind CSS, RESTful API và GraphQL.',
          'Có khả năng giao tiếp tiếng Anh tốt ở mức độ làm việc (viết, đọc tài liệu, họp với đối tác).',
          'Có kinh nghiệm làm việc theo mô hình Agile/Scrum.'
        ],
        skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
        location: 'Đà Nẵng',
        isRemote: false,
        salary: { min: 25000000, max: 45000000, currency: 'VND', isNegotiable: false },
        type: 'full-time',
        experienceLevel: 'senior',
        status: 'approved',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'FPT Software',
        title: 'Fullstack Engineer (NodeJS/React)',
        description: 'Tham gia phát triển dự án chuyển đổi số lớn của FPT. Thiết kế hệ thống, tối ưu hóa API và trực tiếp tham gia xây dựng giao diện quản trị Admin.',
        requirements: [
          'Trên 2 năm kinh nghiệm làm việc với NodeJS (Express, NestJS) và ReactJS.',
          'Hiểu biết tốt về cơ sở dữ liệu MongoDB hoặc PostgreSQL.',
          'Có tư duy tốt về cấu trúc dữ liệu và giải thuật.'
        ],
        skills: ['Node.js', 'React', 'MongoDB', 'Express', 'REST API'],
        location: 'Đà Nẵng',
        isRemote: true,
        salary: { min: 18000000, max: 30000000, currency: 'VND', isNegotiable: true },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'approved',
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'VNG Corporation',
        title: 'DevOps Engineer (Kubernetes/AWS)',
        description: 'VNG Cloud đang tuyển DevOps Engineer để duy trì, vận hành và mở rộng hạ tầng Cloud lớn nhất Việt Nam. Bạn sẽ làm việc trực tiếp với Kubernetes, Terraform và triển khai CI/CD pipeline tự động.',
        requirements: [
          'Có kinh nghiệm vận hành hệ thống chạy trên Kubernetes (K8s) ở quy mô lớn.',
          'Hiểu biết chuyên sâu về Docker, CI/CD tools (GitLab CI, Jenkins) và Terraform.',
          'Kinh nghiệm làm việc với các nhà cung cấp Cloud (AWS, Azure, VNG Cloud).',
          'Có kiến thức về networking, security và giám sát hệ thống (Prometheus, Grafana).'
        ],
        skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
        location: 'TP. Hồ Chí Minh',
        isRemote: false,
        salary: { min: 30000000, max: 55000000, currency: 'VND', isNegotiable: false },
        type: 'full-time',
        experienceLevel: 'senior',
        status: 'approved',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'VNG Corporation',
        title: 'Game Server Developer (C++/Golang)',
        description: 'VNG Game Studio cần tìm lập trình viên phát triển server cho các dòng game nhập vai tải cao. Bạn sẽ tối ưu độ trễ mạng, giải thuật đồng bộ dữ liệu và bảo mật game.',
        requirements: [
          'Nắm vững lập trình C++ hoặc Golang.',
          'Hiểu biết lập trình Socket mạng, Multi-threading và lập trình hướng sự kiện.',
          'Nhiệt huyết, thích chơi game và có tư duy logic sắc bén.'
        ],
        skills: ['Go', 'C++', 'Socket', 'Multi-threading', 'Redis'],
        location: 'TP. Hồ Chí Minh',
        isRemote: false,
        salary: { min: 20000000, max: 35000000, currency: 'VND', isNegotiable: true },
        type: 'full-time',
        experienceLevel: 'junior',
        status: 'approved',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'MoMo',
        title: 'Data Scientist (AI/ML)',
        description: 'Tại MoMo, dữ liệu là trái tim của hệ thống. Bạn sẽ phát triển các thuật toán Machine Learning để cá nhân hóa trải nghiệm người dùng, đề xuất dịch vụ tài chính, và phát hiện gian lận giao dịch.',
        requirements: [
          'Có nền tảng toán học, thống kê tốt. Tốt nghiệp chuyên ngành Khoa học dữ liệu, Toán tin, CNTT.',
          'Thành thạo lập trình Python (Pandas, NumPy, Scikit-Learn) và SQL.',
          'Kinh nghiệm làm việc với các mô hình Machine Learning lớn (XGBoost, Deep Learning).',
          'Ưu tiên ứng viên có kinh nghiệm phát triển hệ thống gợi ý (Recommendation System).'
        ],
        skills: ['Python', 'SQL', 'TensorFlow', 'Machine Learning', 'Recommendation System'],
        location: 'TP. Hồ Chí Minh',
        isRemote: true,
        salary: { min: 25000000, max: 50000000, currency: 'VND', isNegotiable: false },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'approved',
        deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'MoMo',
        title: 'Mobile Flutter Developer',
        description: 'Phát triển mini-app trên nền tảng siêu ứng dụng MoMo. Đảm bảo giao diện phản hồi nhanh (<100ms) và trải nghiệm hoạt động mượt mà.',
        requirements: [
          'Trên 2 năm kinh nghiệm lập trình Flutter (Dart).',
          'Hiểu biết sâu về State Management (Bloc, Provider, Riverpod).',
          'Có kinh nghiệm tối ưu hóa hiệu năng ứng dụng di động.'
        ],
        skills: ['Flutter', 'Dart', 'Git', 'REST API', 'Mobile Development'],
        location: 'TP. Hồ Chí Minh',
        isRemote: false,
        salary: { min: 15000000, max: 28000000, currency: 'VND', isNegotiable: true },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'approved',
        deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Expired job
      },
      {
        company: 'Techcombank',
        title: 'Java Backend Engineer (Fintech/Banking)',
        description: 'Techcombank đang tuyển dụng Kỹ sư Java Backend để xây dựng lõi dịch vụ ngân hàng số (Core Banking). Bạn sẽ tham gia vào thiết kế vi dịch vụ (Microservices), giải quyết bài toán giao dịch đồng thời lớn và bảo mật cao.',
        requirements: [
          'Thành thạo ngôn ngữ Java, Spring Boot, Spring Cloud, Hibernate.',
          'Kinh nghiệm làm việc với Message Broker (Kafka, RabbitMQ) và Caching (Redis).',
          'Nắm chắc các nguyên lý thiết kế Microservices, OOP, SOLID.',
          'Hiểu biết về bảo mật hệ thống ngân hàng (OAuth2, JWT, SSL).'
        ],
        skills: ['Java', 'Spring Boot', 'Kafka', 'Redis', 'Microservices'],
        location: 'Hà Nội',
        isRemote: false,
        salary: { min: 28000000, max: 50000000, currency: 'VND', isNegotiable: false },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'approved',
        deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)
      },
      {
        company: 'Techcombank',
        title: 'Business Analyst (BA) - Ngân hàng số',
        description: 'Cầu nối giữa khối nghiệp vụ ngân hàng và đội ngũ kỹ thuật. Khảo sát yêu cầu khách hàng, viết tài liệu SRS/UML và kiểm thử nghiệm thu.',
        requirements: [
          'Có kinh nghiệm làm BA tối thiểu 2 năm trong lĩnh vực Tài chính, Ngân hàng, Fintech.',
          'Kỹ năng vẽ quy trình nghiệp vụ tốt (UML, BPMN), sử dụng thành thạo JIRA/Confluence.',
          'Khả năng giao tiếp và truyền đạt xuất sắc.'
        ],
        skills: ['UML', 'JIRA', 'Fintech', 'Business Analysis', 'BPMN'],
        location: 'Hà Nội',
        isRemote: false,
        salary: { min: 15000000, max: 25000000, currency: 'VND', isNegotiable: true },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'pending', // Pending approval
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      }
    ];

    const jobsCreated = {};
    for (const jData of jobsData) {
      const employerProfile = employers[jData.company];
      if (!employerProfile) continue;

      const job = new JobPost({
        employerId: employerProfile._id,
        title: jData.title,
        description: jData.description,
        requirements: jData.requirements,
        skills: jData.skills,
        location: jData.location,
        isRemote: jData.isRemote,
        salary: jData.salary,
        type: jData.type,
        experienceLevel: jData.experienceLevel,
        status: jData.status,
        deadline: jData.deadline
      });
      await job.save();

      // Push to employer profile postings array
      employerProfile.jobPostings.push(job._id);
      await employerProfile.save();

      jobsCreated[`${jData.company} - ${jData.title}`] = job;
      console.log(`Job posting created: ${jData.title} by ${jData.company}`);
    }

    // 6. CREATE APPLICATIONS
    console.log('Creating Job Applications...');
    
    // Find candidate profiles we created
    const huy = candidates.find(c => c.user.email === 'dangquochuy@gmail.com');
    const bao = candidates.find(c => c.user.email === 'doannguyenbao@gmail.com');
    const hoang = candidates.find(c => c.user.email === 'lenguyenhuyhoang@gmail.com');

    // Safe applications data
    const applicationsData = [
      {
        candidate: huy,
        jobKey: 'FPT Software - Senior React Developer',
        status: 'accepted',
        matchScore: 92,
        coverLetter: 'Kính gửi nhà tuyển dụng FPT Software, em là Đặng Quốc Huy. Em có hơn 3 năm kinh nghiệm phát triển Frontend bằng ReactJS/NextJS. Em tin rằng mình rất phù hợp với vị trí này.',
        matchReasons: ['Thành thạo React, Next.js, TypeScript', 'Có 3 năm kinh nghiệm phù hợp vị trí tuyển dụng', 'Kỹ năng giao tiếp tiếng Anh tốt']
      },
      {
        candidate: huy,
        jobKey: 'MoMo - Mobile Flutter Developer',
        status: 'rejected',
        matchScore: 50,
        coverLetter: 'Chào anh chị tuyển dụng MoMo, em là Huy. Em chưa lập trình Flutter chuyên nghiệp nhưng em rất ham học hỏi.',
        matchReasons: ['Thiếu kinh nghiệm thực tế về Flutter/Dart', 'Không có kinh nghiệm tối ưu hóa mobile app', 'Kỹ năng match thấp']
      },
      {
        candidate: bao,
        jobKey: 'VNG Corporation - DevOps Engineer (Kubernetes/AWS)',
        status: 'reviewing',
        matchScore: 85,
        coverLetter: 'Xin chào bộ phận nhân sự VNG, em là Đoàn Nguyễn Bảo. Em là chuyên gia Backend/DevOps với thế mạnh K8s, Docker, AWS và CI/CD. Rất mong có buổi trao đổi trực tiếp.',
        matchReasons: ['Kinh nghiệm vận hành K8s quy mô lớn', 'Chứng chỉ AWS Architect', 'Kỹ năng Docker & CI/CD vững vàng']
      },
      {
        candidate: hoang,
        jobKey: 'MoMo - Data Scientist (AI/ML)',
        status: 'pending',
        matchScore: 89,
        coverLetter: 'Kính gửi HR MoMo, em là Lê Nguyễn Huy Hoàng. Em hiện là sinh viên năm cuối Khoa học dữ liệu VKU. Em đã có kinh nghiệm thực tập về AI/ML tại ví MoMo và có công trình nghiên cứu hệ thống gợi ý.',
        matchReasons: ['Sinh viên xuất sắc ngành AI/Data Science VKU', 'Nắm vững kiến thức mô hình Machine Learning', 'Kinh nghiệm phát triển Recommendation System']
      }
    ];

    for (const appData of applicationsData) {
      const job = jobsCreated[appData.jobKey];
      if (!job || !appData.candidate) continue;

      const app = new Application({
        candidateId: appData.candidate.profile._id,
        jobId: job._id,
        userId: appData.candidate.user._id,
        cvUrl: appData.candidate.profile.cvUrl,
        coverLetter: appData.coverLetter,
        status: appData.status,
        matchScore: appData.matchScore,
        matchReasons: appData.matchReasons
      });
      await app.save();

      // Add to job post applications
      job.applications.push(app._id);
      job.applicationCount += 1;
      await job.save();

      console.log(`Application created: ${appData.candidate.user.email} -> ${appData.jobKey} (${appData.status})`);
    }

    console.log('\n=============================================');
    console.log('--- DATABASE SEEDED AND RESTORED SUCCESSFULLY ---');
    console.log('Admin account: admin@gmail.com / Password123');
    console.log('Candidates:');
    console.log(' - dangquochuy@gmail.com / Password123');
    console.log(' - doannguyenbao@gmail.com / Password123');
    console.log(' - lenguyenhuyhoang@gmail.com / Password123');
    console.log('Employers:');
    console.log(' - recruitment@fpt.com / Password123 (FPT Software)');
    console.log(' - jobs@vng.com.vn / Password123 (VNG Corporation)');
    console.log(' - tuyendung@momo.vn / Password123 (MoMo)');
    console.log(' - recruitment@techcombank.com.vn / Password123 (Techcombank)');
    console.log('=============================================');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

restoreAndSeedDB();
